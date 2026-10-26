<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\DeliveryOrder;
use App\Models\Account;
use App\Models\Customer;
use App\Models\JournalVoucher;
use App\Services\ReceivablePayableService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    /**
     * 1. Daftar semua Invoice beserta relasi SO, DO, dan item.
     */
    public function __construct(private ReceivablePayableService $rp)
    {
    }

    public function index()
    {
        $invoices = Invoice::with(['salesOrder', 'deliveryOrder', 'items'])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $invoices,
        ], 200);
    }

    /**
     * 2. Terbitkan Invoice baru dari Sales Order (harga) + Delivery Order (bukti kirim).
     *    Rincian item ditarik dari SO, dan qty divalidasi terhadap DO (barang benar-benar dikirim).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sales_order_id'    => 'required|exists:sales_orders,id',
            'delivery_order_id' => 'nullable|exists:delivery_orders,id',
            'invoice_number'    => 'nullable|string|unique:invoices,invoice_number',
            'invoice_date'      => 'nullable|date',
            'due_date'          => 'nullable|date',
            'tax_percentage'    => 'nullable|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        $salesOrder = SalesOrder::with('items')->findOrFail($validated['sales_order_id']);

        $deliveryOrder = null;
        if (!empty($validated['delivery_order_id'])) {
            $deliveryOrder = DeliveryOrder::with('items')->find($validated['delivery_order_id']);
        }

        DB::beginTransaction();

        try {
            $taxPercentage = $validated['tax_percentage'] ?? 0;

            $invoice = Invoice::create([
                'sales_order_id'    => $salesOrder->id,
                'delivery_order_id' => $deliveryOrder?->id,
                'invoice_number'    => $validated['invoice_number']
                    ?? ('INV-' . date('Ymd') . '-' . str_pad((string) (Invoice::count() + 1), 4, '0', STR_PAD_LEFT)),
                'invoice_date'      => $validated['invoice_date'] ?? now()->format('Y-m-d'),
                'due_date'          => $validated['due_date'] ?? now()->addDays(14)->format('Y-m-d'),
                // Relasi master customer (bila nama SO cocok) agar piutang bisa
                // diagregasi tanpa menebak dari teks nama.
                'customer_id'       => Customer::where('customer_name', $salesOrder->customer_name)->value('id'),
                'customer_name'     => $salesOrder->customer_name,
                'customer_address'  => $salesOrder->customer_address,
                'so_number'         => $salesOrder->so_number,
                'do_number'         => $deliveryOrder?->do_number,
                'sub_total'         => 0,
                'tax_percentage'    => $taxPercentage,
                'tax_amount'        => 0,
                'grand_total'       => 0,
                'status'            => 'Unpaid',
                'notes'             => $validated['notes'] ?? null,
            ]);

            // Tarik rincian harga dari item Sales Order
            $subTotal = 0;
            foreach ($salesOrder->items as $soItem) {
                $qty   = (int) ($soItem->qty ?? 1);
                $price = (float) ($soItem->unit_price ?? 0);

                // Validasi terhadap bukti pengiriman (DO) bila ada
                if ($deliveryOrder) {
                    $doItem = $deliveryOrder->items->firstWhere('part_number', $soItem->part_number);
                    if ($doItem) {
                        // Tagih sebesar qty yang benar-benar dikirim
                        $qty = (int) $doItem->qty_sent;
                    }
                }

                $amount    = $qty * $price;
                $subTotal += $amount;

                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'part_number' => $soItem->part_number,
                    'description' => $soItem->description ?? '-',
                    'qty'         => $qty,
                    'unit'        => $soItem->unit ?? 'SET',
                    'unit_price'  => $price,
                    'amount'      => $amount,
                ]);
            }

            $taxAmount  = $subTotal * ($taxPercentage / 100);
            $grandTotal = $subTotal + $taxAmount;

            $invoice->update([
                'sub_total'   => $subTotal,
                'tax_amount'  => $taxAmount,
                'grand_total' => $grandTotal,
            ]);

            // Tandai SO sudah ditagihkan
            $salesOrder->update(['status' => 'Invoiced']);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice berhasil diterbitkan!',
                'data'    => $invoice->load('items'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menerbitkan Invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 3. Detail satu Invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['salesOrder', 'deliveryOrder.items', 'items'])->find($id);

        if (!$invoice) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invoice tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $invoice,
        ], 200);
    }

    /**
     * 4. Posting invoice ke jurnal (pengakuan pendapatan & piutang).
     *
     *   Debit : Piutang Usaha (grand total)
     *   Kredit: Pendapatan (sub total) + Pajak Keluaran (bila dikonfigurasi)
     *
     * Idempoten: invoice yang sudah punya journal_voucher_id tidak diposting ulang.
     * Akun kontrol diambil dari COA/konfigurasi (tidak di-hardcode).
     */
    public function postJurnal(Request $request, $id)
    {
        $invoice = Invoice::find($id);
        if (! $invoice) {
            return response()->json(['status' => 'error', 'message' => 'Invoice tidak ditemukan.'], 404);
        }
        if ($invoice->journal_voucher_id) {
            return response()->json([
                'status' => 'error',
                'message' => "Invoice {$invoice->invoice_number} sudah pernah diposting ke jurnal.",
            ], 422);
        }
        if ($invoice->status === 'Cancelled') {
            return response()->json(['status' => 'error', 'message' => 'Invoice dibatalkan tidak dapat diposting.'], 422);
        }

        $grand = round((float) $invoice->grand_total, 2);
        if ($grand <= 0) {
            return response()->json(['status' => 'error', 'message' => 'Nilai invoice harus lebih dari nol.'], 422);
        }

        // Akun pendapatan: konfigurasi eksplisit, atau satu-satunya akun Pendapatan
        // yang namanya mengandung "penjualan". Tidak menebak bila ambigu.
        $pendapatan = $this->akunPendapatan();
        if (! $pendapatan) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun Pendapatan Penjualan belum dapat ditentukan. Buat akun tipe Pendapatan di COA '
                    . 'atau set ACCOUNTING_PENDAPATAN_KODE. Posting dibatalkan.',
            ], 422);
        }

        try {
            $piutang = $this->rp->akunKontrolOrFail('piutang');
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->validator->errors()->first('account'),
            ], 422);
        }

        $subTotal  = round((float) $invoice->sub_total, 2);
        $taxAmount = round((float) $invoice->tax_amount, 2);

        $pajakKode = config('accounting.pajak_keluaran_kode');
        $pajak = ($taxAmount > 0 && $pajakKode)
            ? Account::selectable()->where('nomor_akun', $pajakKode)->first()
            : null;

        $kreditPendapatan = $pajak ? $subTotal : round($subTotal + $taxAmount, 2);

        $lines = [
            ['account_id' => $piutang->id, 'debit' => $grand, 'kredit' => 0, 'memo' => "Piutang {$invoice->invoice_number}"],
            ['account_id' => $pendapatan->id, 'debit' => 0, 'kredit' => $kreditPendapatan, 'memo' => "Penjualan {$invoice->invoice_number}"],
        ];
        if ($pajak && $taxAmount > 0) {
            $lines[] = ['account_id' => $pajak->id, 'debit' => 0, 'kredit' => $taxAmount, 'memo' => 'Pajak Keluaran'];
        }

        $totalKredit = round(array_sum(array_column($lines, 'kredit')), 2);
        if (abs($totalKredit - $grand) > 0.009) {
            $lines = [
                ['account_id' => $piutang->id, 'debit' => $grand, 'kredit' => 0, 'memo' => "Piutang {$invoice->invoice_number}"],
                ['account_id' => $pendapatan->id, 'debit' => 0, 'kredit' => $grand, 'memo' => "Penjualan {$invoice->invoice_number}"],
            ];
        }

        DB::beginTransaction();
        try {
            // Kunci & periksa ulang agar request ganda tidak membuat dua voucher.
            $fresh = Invoice::whereKey($invoice->id)->lockForUpdate()->first();
            if ($fresh->journal_voucher_id) {
                DB::rollBack();
                return response()->json([
                    'status' => 'error',
                    'message' => "Invoice {$fresh->invoice_number} sudah pernah diposting ke jurnal.",
                ], 422);
            }

            $voucher = $this->rp->buatDanPostingJurnal($request, [
                'tanggal'       => optional($fresh->invoice_date)->toDateString() ?: now()->toDateString(),
                'jenis'         => 'Voucher Penjualan',
                'keterangan'    => "Pengakuan piutang invoice {$fresh->invoice_number}",
                'no_referensi'  => $fresh->invoice_number,
                'pihak_terkait' => $fresh->customer_name,
                'kas_bank'      => null,
                'lines'         => $lines,
            ]);

            $fresh->update(['journal_voucher_id' => $voucher->id]);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Posting invoice gagal: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Invoice {$invoice->invoice_number} berhasil diposting ke jurnal.",
            'data'    => $invoice->fresh()->load('items'),
        ], 200);
    }

    /** Akun pendapatan penjualan dari konfigurasi atau COA (null bila ambigu). */
    private function akunPendapatan(): ?Account
    {
        $kode = config('accounting.pendapatan_kode');
        if ($kode) {
            $akun = Account::selectable()->where('nomor_akun', $kode)->first();
            if ($akun) {
                return $akun;
            }
        }

        $kandidat = Account::selectable()
            ->where('tipe_akun', 'Pendapatan')
            ->where(fn ($q) => $q->where('nama_akun', 'like', '%penjualan%'))
            ->orderBy('nomor_akun')
            ->get();

        return $kandidat->count() === 1 ? $kandidat->first() : null;
    }

    /**
     * 4b. Ubah status pembayaran Invoice (Unpaid / Paid / Cancelled).
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Unpaid,Paid,Cancelled',
        ]);

        $invoice = Invoice::find($id);

        if (!$invoice) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invoice tidak ditemukan.',
            ], 404);
        }

        $invoice->update(['status' => $validated['status']]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Status Invoice berhasil diperbarui.',
            'data'    => $invoice->load('items'),
        ], 200);
    }
}
