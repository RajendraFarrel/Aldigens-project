<?php

namespace App\Services;

use App\Models\CashBank;
use App\Models\Invoice;
use App\Models\PaymentReceipt;
use App\Models\PurchaseInvoice;
use App\Models\SupplierPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Penerimaan piutang customer & pembayaran utang supplier.
 *
 * Satu operasi atomik:
 *  1. validasi + kunci invoice (lockForUpdate)
 *  2. simpan header pembayaran + alokasi
 *  3. buat & posting Journal Voucher (memakai controller existing)
 *
 * Jurnal:
 *  Penerimaan : Debit Kas/Bank tujuan, Kredit Piutang Usaha
 *  Pembayaran : Debit Utang Usaha, Kredit Kas/Bank sumber
 */
class PaymentService
{
    public function __construct(private ReceivablePayableService $rp) {}

    /* ------------------------------------------------------------------
     * PENERIMAAN DARI CUSTOMER
     * ------------------------------------------------------------------ */

    /**
     * @param  array{customer_id:int, cash_bank_id:int, payment_date:string, amount:float|string,
     *               reference_number?:?string, notes?:?string, request_key?:?string,
     *               allocations: array<int, array{invoice_id:int, amount:float|string}>}  $data
     */
    public function terimaDariCustomer(Request $request, array $data): PaymentReceipt
    {
        $sudahAda = $this->cariRequestKey(PaymentReceipt::class, $data['request_key'] ?? null);
        if ($sudahAda) {
            throw ValidationException::withMessages([
                'request_key' => "Permintaan ini sudah tercatat sebagai {$sudahAda->receipt_number}. Tidak dibuat transaksi baru.",
            ]);
        }

        $cashBank = $this->cashBankAktif((int) $data['cash_bank_id']);
        $jumlah = round((float) $data['amount'], 2);
        $this->pastikanJumlahValid($jumlah);

        $alokasi = $this->validasiAlokasiPenerimaan($data, (int) $data['customer_id'], $jumlah);

        $piutang = $this->rp->akunKontrolOrFail('piutang');

        return DB::transaction(function () use ($request, $data, $cashBank, $jumlah, $alokasi, $piutang) {
            $no = $this->rp->nomorBerikut('RCV', PaymentReceipt::class, 'receipt_number');

            $receipt = PaymentReceipt::create([
                'receipt_number'   => $no,
                'customer_id'      => $data['customer_id'],
                'cash_bank_id'     => $cashBank->id,
                'payment_date'     => $data['payment_date'],
                'amount'           => $jumlah,
                'reference_number' => $data['reference_number'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'request_key'      => $data['request_key'] ?? null,
                'journal_status'   => 'POSTED',
                'created_by'       => $request->user()?->id,
            ]);

            foreach ($alokasi as $row) {
                $receipt->allocations()->create([
                    'invoice_id' => $row['invoice_id'],
                    'amount'     => $row['amount'],
                ]);
            }

            $voucher = $this->rp->buatDanPostingJurnal($request, [
                'tanggal'       => $data['payment_date'],
                'jenis'         => $cashBank->jenis === 'BANK' ? 'Voucher Bank Masuk' : 'Voucher Kas',
                'keterangan'    => $data['notes'] ?? "Penerimaan piutang {$no}",
                'no_referensi'  => $data['reference_number'] ?? $no,
                'pihak_terkait' => $data['customer_name'] ?? null,
                'kas_bank'      => $cashBank->nama_tampilan,
                'lines'         => [
                    ['account_id' => $cashBank->account_id, 'debit' => $jumlah, 'kredit' => 0, 'memo' => "Penerimaan {$no}"],
                    ['account_id' => $piutang->id, 'debit' => 0, 'kredit' => $jumlah, 'memo' => "Pelunasan piutang {$no}"],
                ],
            ]);

            $receipt->update(['journal_voucher_id' => $voucher->id]);

            $this->perbaruiStatusInvoice($alokasi);

            return $receipt->fresh()->load(['allocations.invoice', 'customer', 'cashBank']);
        });
    }

    /** @param  array<int, array{invoice_id:int, amount:float}>  $alokasi */
    private function perbaruiStatusInvoice(array $alokasi): void
    {
        $ids = array_column($alokasi, 'invoice_id');
        $map = $this->rp->alokasiPerInvoice();

        foreach (Invoice::whereIn('id', $ids)->get() as $inv) {
            $dibayar = $map[$inv->id] ?? 0;
            $status = $this->rp->statusPembayaran(optional($inv->due_date)->toDateString(), (float) $inv->grand_total, $dibayar);

            // Status kolom `status` invoice existing hanya Unpaid/Paid/Cancelled.
            // Jangan menimpa Cancelled. Status rinci (OVERDUE/PARTIALLY) dihitung saat dibaca.
            if ($inv->status === 'Cancelled') {
                continue;
            }
            $inv->update(['status' => $status === 'PAID' ? 'Paid' : 'Unpaid']);
        }
    }

    /**
     * @return array<int, array{invoice_id:int, amount:float}>
     * @throws ValidationException
     */
    private function validasiAlokasiPenerimaan(array $data, int $customerId, float $jumlah): array
    {
        $items = $data['allocations'] ?? [];

        if (! is_array($items) || count($items) === 0) {
            throw ValidationException::withMessages(['allocations' => 'Pilih minimal satu invoice yang dibayar.']);
        }

        $ids = array_map(fn($a) => (int) $a['invoice_id'], $items);
        if (count($ids) !== count(array_unique($ids))) {
            throw ValidationException::withMessages(['allocations' => 'Invoice yang sama dipilih lebih dari sekali.']);
        }

        // Kunci baris invoice supaya dua penerimaan bersamaan tidak melebihi sisa piutang.
        $invoices = Invoice::whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');
        $alokasiMap = $this->rp->alokasiPerInvoice();

        $rows = [];
        $totalAlokasi = 0.0;

        foreach ($items as $i => $item) {
            $id = (int) $item['invoice_id'];
            $nominal = round((float) ($item['amount'] ?? 0), 2);
            $inv = $invoices[$id] ?? null;

            if (! $inv) {
                throw ValidationException::withMessages(["allocations.$i.invoice_id" => 'Invoice tidak ditemukan.']);
            }
            if ($inv->status === 'Cancelled') {
                throw ValidationException::withMessages(["allocations.$i.invoice_id" => "Invoice {$inv->invoice_number} dibatalkan dan tidak dapat dibayar."]);
            }
            if ($inv->customer_id !== null && (int) $inv->customer_id !== $customerId) {
                throw ValidationException::withMessages(["allocations.$i.invoice_id" => "Invoice {$inv->invoice_number} bukan milik customer yang dipilih."]);
            }
            if ($nominal <= 0) {
                throw ValidationException::withMessages(["allocations.$i.amount" => "Alokasi invoice {$inv->invoice_number} harus lebih dari nol."]);
            }

            $sisa = round((float) $inv->grand_total - ($alokasiMap[$id] ?? 0), 2);
            if ($sisa <= 0.009) {
                throw ValidationException::withMessages(["allocations.$i.amount" => "Invoice {$inv->invoice_number} sudah lunas."]);
            }
            if ($nominal > $sisa + 0.009) {
                throw ValidationException::withMessages([
                    "allocations.$i.amount" => "Alokasi invoice {$inv->invoice_number} melebihi sisa piutang (" . number_format($sisa, 2, ',', '.') . ').',
                ]);
            }

            $totalAlokasi += $nominal;
            $rows[] = ['invoice_id' => $id, 'amount' => $nominal];
        }

        if (abs($totalAlokasi - $jumlah) > 0.009) {
            throw ValidationException::withMessages([
                'amount' => 'Total alokasi (' . number_format($totalAlokasi, 2, ',', '.') . ') harus sama dengan jumlah diterima ('
                    . number_format($jumlah, 2, ',', '.') . '). Kelebihan/kelebihan bayar belum didukung sistem.',
            ]);
        }

        return $rows;
    }

    /* ------------------------------------------------------------------
     * PEMBAYARAN KE SUPPLIER
     * ------------------------------------------------------------------ */

    /**
     * @param  array{supplier_id:int, cash_bank_id:int, payment_date:string, amount:float|string,
     *               reference_number?:?string, notes?:?string, request_key?:?string,
     *               allocations: array<int, array{purchase_invoice_id:int, amount:float|string}>}  $data
     */
    public function bayarKeSupplier(Request $request, array $data): SupplierPayment
    {
        $sudahAda = $this->cariRequestKey(SupplierPayment::class, $data['request_key'] ?? null);
        if ($sudahAda) {
            throw ValidationException::withMessages([
                'request_key' => "Permintaan ini sudah tercatat sebagai {$sudahAda->payment_number}. Tidak dibuat transaksi baru.",
            ]);
        }

        $cashBank = $this->cashBankAktif((int) $data['cash_bank_id']);
        $jumlah = round((float) $data['amount'], 2);
        $this->pastikanJumlahValid($jumlah);

        $alokasi = $this->validasiAlokasiPembayaran($data, (int) $data['supplier_id'], $jumlah);

        $utang = $this->rp->akunKontrolOrFail('utang');

        return DB::transaction(function () use ($request, $data, $cashBank, $jumlah, $alokasi, $utang) {
            $no = $this->rp->nomorBerikut('PAY', SupplierPayment::class, 'payment_number');

            $payment = SupplierPayment::create([
                'payment_number'   => $no,
                'supplier_id'      => $data['supplier_id'],
                'cash_bank_id'     => $cashBank->id,
                'payment_date'     => $data['payment_date'],
                'amount'           => $jumlah,
                'reference_number' => $data['reference_number'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'request_key'      => $data['request_key'] ?? null,
                'journal_status'   => 'POSTED',
                'created_by'       => $request->user()?->id,
            ]);

            foreach ($alokasi as $row) {
                $payment->allocations()->create([
                    'purchase_invoice_id' => $row['purchase_invoice_id'],
                    'amount'              => $row['amount'],
                ]);
            }

            $voucher = $this->rp->buatDanPostingJurnal($request, [
                'tanggal'       => $data['payment_date'],
                'jenis'         => $cashBank->jenis === 'BANK' ? 'Voucher Bank Keluar' : 'Voucher Kas',
                'keterangan'    => $data['notes'] ?? "Pembayaran utang {$no}",
                'no_referensi'  => $data['reference_number'] ?? $no,
                'pihak_terkait' => $data['supplier_name'] ?? null,
                'kas_bank'      => $cashBank->nama_tampilan,
                'lines'         => [
                    ['account_id' => $utang->id, 'debit' => $jumlah, 'kredit' => 0, 'memo' => "Pelunasan utang {$no}"],
                    ['account_id' => $cashBank->account_id, 'debit' => 0, 'kredit' => $jumlah, 'memo' => "Pembayaran {$no}"],
                ],
            ]);

            $payment->update(['journal_voucher_id' => $voucher->id]);

            $this->perbaruiStatusPurchaseInvoice($alokasi);

            return $payment->fresh()->load(['allocations.purchaseInvoice', 'supplier', 'cashBank']);
        });
    }

    /** @param  array<int, array{purchase_invoice_id:int, amount:float}>  $alokasi */
    private function perbaruiStatusPurchaseInvoice(array $alokasi): void
    {
        $ids = array_column($alokasi, 'purchase_invoice_id');
        $map = $this->rp->alokasiPerPurchaseInvoice();

        foreach (PurchaseInvoice::whereIn('id', $ids)->get() as $pi) {
            if ($pi->status === 'CANCELLED') {
                continue;
            }
            $dibayar = $map[$pi->id] ?? 0;
            $pi->update([
                'status' => $this->rp->statusPembayaran(optional($pi->due_date)->toDateString(), (float) $pi->grand_total, $dibayar),
            ]);
        }
    }

    /**
     * @return array<int, array{purchase_invoice_id:int, amount:float}>
     * @throws ValidationException
     */
    private function validasiAlokasiPembayaran(array $data, int $supplierId, float $jumlah): array
    {
        $items = $data['allocations'] ?? [];

        if (! is_array($items) || count($items) === 0) {
            throw ValidationException::withMessages(['allocations' => 'Pilih minimal satu tagihan supplier yang dibayar.']);
        }

        $ids = array_map(fn($a) => (int) $a['purchase_invoice_id'], $items);
        if (count($ids) !== count(array_unique($ids))) {
            throw ValidationException::withMessages(['allocations' => 'Tagihan yang sama dipilih lebih dari sekali.']);
        }

        $invoices = PurchaseInvoice::whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');
        $alokasiMap = $this->rp->alokasiPerPurchaseInvoice();

        $rows = [];
        $totalAlokasi = 0.0;

        foreach ($items as $i => $item) {
            $id = (int) $item['purchase_invoice_id'];
            $nominal = round((float) ($item['amount'] ?? 0), 2);
            $pi = $invoices[$id] ?? null;

            if (! $pi) {
                throw ValidationException::withMessages(["allocations.$i.purchase_invoice_id" => 'Purchase invoice tidak ditemukan.']);
            }
            if ((int) $pi->supplier_id !== $supplierId) {
                throw ValidationException::withMessages(["allocations.$i.purchase_invoice_id" => "Tagihan {$pi->invoice_number} bukan milik supplier yang dipilih."]);
            }
            if ($pi->status === 'CANCELLED') {
                throw ValidationException::withMessages(["allocations.$i.purchase_invoice_id" => "Tagihan {$pi->invoice_number} dibatalkan."]);
            }
            if ($pi->journal_status !== 'POSTED') {
                throw ValidationException::withMessages([
                    "allocations.$i.purchase_invoice_id" => "Tagihan {$pi->invoice_number} belum diposting ke jurnal. Posting tagihan terlebih dahulu.",
                ]);
            }
            if ($nominal <= 0) {
                throw ValidationException::withMessages(["allocations.$i.amount" => "Alokasi tagihan {$pi->invoice_number} harus lebih dari nol."]);
            }

            $sisa = round((float) $pi->grand_total - ($alokasiMap[$id] ?? 0), 2);
            if ($sisa <= 0.009) {
                throw ValidationException::withMessages(["allocations.$i.amount" => "Tagihan {$pi->invoice_number} sudah lunas."]);
            }
            if ($nominal > $sisa + 0.009) {
                throw ValidationException::withMessages([
                    "allocations.$i.amount" => "Alokasi tagihan {$pi->invoice_number} melebihi sisa utang (" . number_format($sisa, 2, ',', '.') . ').',
                ]);
            }

            $totalAlokasi += $nominal;
            $rows[] = ['purchase_invoice_id' => $id, 'amount' => $nominal];
        }

        if (abs($totalAlokasi - $jumlah) > 0.009) {
            throw ValidationException::withMessages([
                'amount' => 'Total alokasi (' . number_format($totalAlokasi, 2, ',', '.') . ') harus sama dengan jumlah dibayar ('
                    . number_format($jumlah, 2, ',', '.') . ').',
            ]);
        }

        return $rows;
    }

    /* ------------------------------------------------------------------ */

    private function cashBankAktif(int $id): CashBank
    {
        $cb = CashBank::with('account')->find($id);

        if (! $cb) {
            throw ValidationException::withMessages(['cash_bank_id' => 'Kas/Bank tidak ditemukan.']);
        }
        if (! $cb->is_active) {
            throw ValidationException::withMessages(['cash_bank_id' => "Kas/Bank {$cb->nama_tampilan} berstatus Nonaktif."]);
        }
        if (! $cb->account || ! $cb->account->is_active || $cb->account->is_header) {
            throw ValidationException::withMessages(['cash_bank_id' => 'Akun COA Kas/Bank tidak aktif atau berupa akun induk.']);
        }

        return $cb;
    }

    private function pastikanJumlahValid(float $jumlah): void
    {
        if ($jumlah <= 0) {
            throw ValidationException::withMessages(['amount' => 'Jumlah pembayaran harus lebih dari nol.']);
        }
    }

    /** Idempotensi: request_key yang sama tidak boleh dibuat dua kali. */
    private function cariRequestKey(string $model, ?string $key)
    {
        if (! $key) {
            return null;
        }

        return $model::where('request_key', $key)->first();
    }
}
