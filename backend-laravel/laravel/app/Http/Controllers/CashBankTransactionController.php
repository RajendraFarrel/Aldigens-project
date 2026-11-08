<?php

namespace App\Http\Controllers;

use App\Models\JournalVoucher;
use App\Services\CashBankService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Transaksi Kas & Bank: Penerimaan, Pengeluaran, Transfer.
 *
 * Semua transaksi dicatat memakai JournalVoucherController existing
 * (store + post). Controller ini tidak menulis tabel transaksi baru,
 * sehingga tidak ada jurnal/saldo ganda.
 */
class CashBankTransactionController extends Controller
{
    public function __construct(
        private CashBankService $service,
        private JournalVoucherController $voucherController,
    ) {}

    // ---------------------------------------------------------------
    // PENERIMAAN — Debit Kas/Bank, Kredit akun lawan
    // ---------------------------------------------------------------

    public function penerimaan(Request $request)
    {
        $data = $request->validate([
            'tanggal'          => ['required', 'date'],
            'cash_bank_id'     => ['required', 'integer', 'exists:cash_banks,id'],
            'lawan_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'nominal'          => ['required', 'numeric', 'gt:0'],
            'no_referensi'     => ['nullable', 'string', 'max:191'],
            'pihak_terkait'    => ['nullable', 'string', 'max:191'],
            'keterangan'       => ['nullable', 'string', 'max:1000'],
            'auto_post'        => ['nullable', 'boolean'],
        ], [], [
            'tanggal'          => 'Tanggal',
            'cash_bank_id'     => 'Kas/Bank Tujuan',
            'lawan_account_id' => 'Akun Lawan',
            'nominal'          => 'Nominal',
        ]);

        $tujuan = $this->service->aktifOrFail((int) $data['cash_bank_id'], 'cash_bank_id');
        $lawan = $this->service->akunLawanOrFail((int) $data['lawan_account_id']);

        if ($lawan->id === $tujuan->account_id) {
            throw ValidationException::withMessages([
                'lawan_account_id' => 'Akun lawan tidak boleh sama dengan akun Kas/Bank tujuan.',
            ]);
        }

        $memo = $data['pihak_terkait'] ?? null;

        return $this->simpanDanPosting($request, [
            'tanggal'       => $data['tanggal'],
            'jenis'         => $this->service->jenisPenerimaan($tujuan),
            'keterangan'    => $data['keterangan'] ?? null,
            'no_referensi'  => $data['no_referensi'] ?? null,
            'pihak_terkait' => $data['pihak_terkait'] ?? null,
            'kas_bank'      => $tujuan->nama_tampilan,
            'lines'         => $this->service->linesPenerimaan($tujuan, $lawan, (float) $data['nominal'], $memo),
        ], (bool) ($data['auto_post'] ?? true));
    }

    // ---------------------------------------------------------------
    // PENGELUARAN — Debit akun lawan, Kredit Kas/Bank
    // ---------------------------------------------------------------

    public function pengeluaran(Request $request)
    {
        $data = $request->validate([
            'tanggal'          => ['required', 'date'],
            'cash_bank_id'     => ['required', 'integer', 'exists:cash_banks,id'],
            'lawan_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'nominal'          => ['required', 'numeric', 'gt:0'],
            'no_referensi'     => ['nullable', 'string', 'max:191'],
            'pihak_terkait'    => ['nullable', 'string', 'max:191'],
            'keterangan'       => ['nullable', 'string', 'max:1000'],
            'auto_post'        => ['nullable', 'boolean'],
        ], [], [
            'tanggal'          => 'Tanggal',
            'cash_bank_id'     => 'Kas/Bank Sumber',
            'lawan_account_id' => 'Akun Lawan',
            'nominal'          => 'Nominal',
        ]);

        $sumber = $this->service->aktifOrFail((int) $data['cash_bank_id'], 'cash_bank_id');
        $lawan = $this->service->akunLawanOrFail((int) $data['lawan_account_id']);

        if ($lawan->id === $sumber->account_id) {
            throw ValidationException::withMessages([
                'lawan_account_id' => 'Akun lawan tidak boleh sama dengan akun Kas/Bank sumber.',
            ]);
        }

        $memo = $data['pihak_terkait'] ?? null;

        return $this->simpanDanPosting($request, [
            'tanggal'       => $data['tanggal'],
            'jenis'         => $this->service->jenisPengeluaran($sumber),
            'keterangan'    => $data['keterangan'] ?? null,
            'no_referensi'  => $data['no_referensi'] ?? null,
            'pihak_terkait' => $data['pihak_terkait'] ?? null,
            'kas_bank'      => $sumber->nama_tampilan,
            'lines'         => $this->service->linesPengeluaran($sumber, $lawan, (float) $data['nominal'], $memo),
        ], (bool) ($data['auto_post'] ?? true));
    }

    // ---------------------------------------------------------------
    // TRANSFER — Debit tujuan, Kredit sumber, nominal sama
    // ---------------------------------------------------------------

    public function transfer(Request $request)
    {
        $data = $request->validate([
            'tanggal'         => ['required', 'date'],
            'sumber_id'       => ['required', 'integer', 'exists:cash_banks,id'],
            'tujuan_id'       => ['required', 'integer', 'exists:cash_banks,id', 'different:sumber_id'],
            'nominal'         => ['required', 'numeric', 'gt:0'],
            'no_referensi'    => ['nullable', 'string', 'max:191'],
            'keterangan'      => ['nullable', 'string', 'max:1000'],
            'auto_post'       => ['nullable', 'boolean'],
        ], [], [
            'tanggal'   => 'Tanggal',
            'sumber_id' => 'Kas/Bank Sumber',
            'tujuan_id' => 'Kas/Bank Tujuan',
            'nominal'   => 'Nominal',
        ]);

        $sumber = $this->service->aktifOrFail((int) $data['sumber_id'], 'sumber_id');
        $tujuan = $this->service->aktifOrFail((int) $data['tujuan_id'], 'tujuan_id');

        if ($sumber->id === $tujuan->id) {
            throw ValidationException::withMessages([
                'tujuan_id' => 'Kas/Bank sumber dan tujuan harus berbeda.',
            ]);
        }
        if ($sumber->account_id === $tujuan->account_id) {
            throw ValidationException::withMessages([
                'tujuan_id' => 'Akun COA sumber dan tujuan tidak boleh sama.',
            ]);
        }

        $keterangan = $data['keterangan']
            ?? "Transfer dari {$sumber->nama_tampilan} ke {$tujuan->nama_tampilan}";
        $memo = "Transfer {$sumber->nama_tampilan} → {$tujuan->nama_tampilan}";

        return $this->simpanDanPosting($request, [
            'tanggal'       => $data['tanggal'],
            'jenis'         => CashBankService::JENIS_TRANSFER,
            'keterangan'    => $keterangan,
            'no_referensi'  => $data['no_referensi'] ?? null,
            'pihak_terkait' => $tujuan->nama_tampilan,
            'kas_bank'      => "{$sumber->nama_tampilan} → {$tujuan->nama_tampilan}",
            'lines'         => $this->service->linesTransfer($sumber, $tujuan, (float) $data['nominal'], $memo),
        ], (bool) ($data['auto_post'] ?? true));
    }

    // ---------------------------------------------------------------

    /**
     * Simpan draft lalu posting memakai endpoint existing.
     *
     * - Draft GAGAL dibuat -> lempar error (tidak ada voucher tersisa).
     * - Draft berhasil, posting gagal -> kembalikan 422 dengan status "DRAFT"
     *   + nomor voucher. TIDAK membuat voucher kedua.
     * - Posting dipanggil sekali saja; posting ulang akan ditolak backend.
     *
     * @param  array<string,mixed>  $payload
     */
    private function simpanDanPosting(Request $request, array $payload, bool $autoPost)
    {
        $draft = $this->voucherController->store($request, $payload);
        $voucherData = $draft->getData(true);

        $voucher = JournalVoucher::findOrFail($voucherData['id']);

        if (! $autoPost) {
            return response()->json([
                'status'  => 'DRAFT',
                'message' => "Transaksi disimpan sebagai draft {$voucher->no_voucher} dan belum memengaruhi laporan POSTED.",
                'voucher' => $voucher->load('lines'),
            ], 201);
        }

        try {
            $posted = $this->voucherController->post($request, $voucher);
        } catch (Throwable $e) {
            // Draft tetap ada; jangan membuat voucher baru.
            return response()->json([
                'status'  => 'DRAFT',
                'message' => "Voucher {$voucher->no_voucher} tersimpan sebagai DRAFT tetapi gagal diposting: {$e->getMessage()}. "
                    . 'Transaksi belum memengaruhi Buku Besar/Neraca. Lanjutkan posting dari menu Jurnal Umum.',
                'no_voucher' => $voucher->no_voucher,
                'voucher' => $voucher->fresh()->load('lines'),
            ], 422);
        }

        $body = $posted->getData(true);

        if ($posted->getStatusCode() !== 200) {
            return response()->json([
                'status'  => 'DRAFT',
                'message' => ($body['message'] ?? 'Posting gagal.')
                    . " Voucher tersimpan sebagai DRAFT ({$voucher->no_voucher}) dan belum memengaruhi laporan POSTED. "
                    . 'Lanjutkan posting dari menu Jurnal Umum.',
                'no_voucher' => $voucher->no_voucher,
                'voucher' => $voucher->fresh()->load('lines'),
            ], 422);
        }

        return response()->json([
            'status'  => 'POSTED',
            'message' => $body['message'] ?? "Transaksi {$voucher->no_voucher} berhasil diposting.",
            'voucher' => $voucher->fresh()->load('lines'),
        ], 201);
    }
}
