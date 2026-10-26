<?php

namespace App\Services;

use App\Models\Account;
use App\Models\CashBank;
use App\Models\JournalLine;
use App\Models\JournalVoucher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Logika modul Kas & Bank.
 *
 * Prinsip:
 * - TIDAK ada ledger kedua. Semua transaksi dicatat sebagai Journal Voucher
 *   (DRAFT lalu POSTED) memakai controller jurnal existing.
 * - Saldo selalu = accounts.saldo_awal + mutasi journal_lines POSTED,
 *   dengan arah sesuai saldo normal akun (sama seperti Buku Besar).
 * - Tidak ada penulisan saldo ke tabel cash_banks.
 */
class CashBankService
{
    /** Prefix nomor voucher untuk transfer antar kas/bank (lihat JournalVoucherController::PREFIX). */
    public const JENIS_TRANSFER = 'Transfer Kas/Bank';

    /** Jenis voucher yang termasuk arus masuk / keluar kas. */
    private const JENIS_MASUK = ['Voucher Bank Masuk', 'Voucher Penjualan'];
    private const JENIS_KELUAR = ['Voucher Bank Keluar', 'Voucher Kas', 'Voucher Beban', 'Voucher Pembelian'];

    // -----------------------------------------------------------------
    // Master
    // -----------------------------------------------------------------

    /**
     * Master + data akun COA + saldo (saldo awal & mutasi POSTED s.d. tanggal).
     *
     * @param  array{to?: string|null, from?: string|null}  $filter
     */
    public function masterList(array $filter = []): Collection
    {
        $to = $filter['to'] ?? null;
        $from = $filter['from'] ?? null;

        return CashBank::query()
            ->with('account')
            ->orderBy('jenis')
            ->orderBy('nama_tampilan')
            ->get()
            ->map(fn(CashBank $cb) => $this->decorate($cb, $from, $to));
    }

    /** Satu master dengan angka saldo (untuk response simpan). */
    public function masterDetail(CashBank $cashBank, ?string $from = null, ?string $to = null): array
    {
        return $this->decorate($cashBank->load('account'), $from, $to);
    }

    /**
     * Lengkapi master dengan data akun & saldo.
     * Nomor rekening dipotong pada respons daftar umum; versi lengkap
     * hanya dikirim pada endpoint detail sesuai permission pemakai.
     */
    private function decorate(CashBank $cb, ?string $from, ?string $to): array
    {
        $account = $cb->account;
        $saldos = $account ? $this->saldoAkun($account, $from, $to) : null;

        return [
            'id'             => $cb->id,
            'account_id'     => $cb->account_id,
            'jenis'          => $cb->jenis,
            'nama_tampilan'  => $cb->nama_tampilan,
            'nama_bank'      => $cb->nama_bank,
            'cabang'         => $cb->cabang,
            'nomor_rekening' => $cb->nomor_rekening,
            'rekening_masked' => $this->maskRekening($cb->nomor_rekening),
            'nama_pemilik'   => $cb->nama_pemilik,
            'is_active'      => (bool) $cb->is_active,
            'keterangan'     => $cb->keterangan,
            'kode_akun'      => $account?->nomor_akun,
            'nama_akun'      => $account?->nama_akun,
            'tipe_akun'      => $account?->tipe_akun,
            'saldo_normal'   => $account?->saldo_normal,
            'saldo_awal'          => $account ? (float) $account->saldo_awal : 0.0,
            'saldo_awal_tanggal'  => optional($account?->saldo_awal_tanggal)->toDateString(),
            'saldo_akhir'         => $saldos['saldo_akhir'] ?? 0.0,
            'mutasi_debit'        => $saldos['mutasi_debit'] ?? 0.0,
            'mutasi_kredit'       => $saldos['mutasi_kredit'] ?? 0.0,
            'jumlah_voucher_posted' => $cb->postedVoucherCount(),
        ];
    }

    /** Nomor rekening disamarkan: hanya 4 digit terakhir yang tampil. */
    public function maskRekening(?string $nomor): ?string
    {
        if (! $nomor) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $nomor);
        if (strlen($digits) <= 4) {
            return str_repeat('*', max(0, strlen($digits) - 1)) . substr($digits, -1);
        }

        return str_repeat('*', strlen($digits) - 4) . substr($digits, -4);
    }

    // -----------------------------------------------------------------
    // Saldo (sumber tunggal: COA + jurnal POSTED)
    // -----------------------------------------------------------------

    private function postedQuery(?string $from = null, ?string $to = null)
    {
        return JournalLine::query()
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_lines.journal_voucher_id')
            ->where('journal_vouchers.status', 'POSTED')
            ->when($from, fn($q, $d) => $q->whereDate('journal_vouchers.tanggal', '>=', $d))
            ->when($to, fn($q, $d) => $q->whereDate('journal_vouchers.tanggal', '<=', $d));
    }

    /**
     * Saldo efektif akun: saldo awal COA + mutasi POSTED, dengan arah normal akun.
     * Tanda: positif = searah saldo normal (sama dengan Buku Besar existing).
     */
    public function saldoAkun(Account $account, ?string $from = null, ?string $to = null): array
    {
        $mutasi = $this->postedQuery($from, $to)
            ->where('journal_lines.account_id', $account->id)
            ->selectRaw('COALESCE(SUM(journal_lines.debit),0) as d, COALESCE(SUM(journal_lines.kredit),0) as k')
            ->first();

        $awal = (float) $account->saldo_awal;
        $awalSigned = $account->saldo_normal === 'Kredit' ? -1 * $awal : $awal;
        $d = (float) ($mutasi->d ?? 0);
        $k = (float) ($mutasi->k ?? 0);
        $signed = $awalSigned + $d - $k;

        return [
            'saldo_awal'     => round($awalSigned, 2),
            'mutasi_debit'   => round($d, 2),
            'mutasi_kredit'  => round($k, 2),
            'saldo_akhir'    => round($account->saldo_normal === 'Kredit' ? -1 * $signed : $signed, 2),
            'saldo_akhir_raw' => round($signed, 2),
        ];
    }

    // -----------------------------------------------------------------
    // Mutasi & ringkasan
    // -----------------------------------------------------------------

    /**
     * Mutasi kas/bank dari journal_lines POSTED + saldo berjalan.
     * Urutan deterministik: tanggal, nomor voucher, line_order, id.
     */
    public function mutasi(int $cashBankId, array $filter = []): array
    {
        $cashBank = CashBank::with('account')->find($cashBankId);
        if (! $cashBank || ! $cashBank->account) {
            throw ValidationException::withMessages(['cash_bank_id' => 'Kas/Bank tidak ditemukan.']);
        }

        $account = $cashBank->account;
        $from = $filter['from'] ?? null;
        $to = $filter['to'] ?? null;
        $jenis = $filter['jenis'] ?? null;
        $search = trim((string) ($filter['search'] ?? ''));

        // Mutasi sebelum periode: dipakai untuk saldo awal berjalan bila $from diisi.
        $saldoAwalPeriode = $account->saldo_normal === 'Kredit' ? -1 * (float) $account->saldo_awal : (float) $account->saldo_awal;

        if ($from) {
            $sebelum = $this->postedQuery(null, date('Y-m-d', strtotime($from . ' -1 day')))
                ->where('journal_lines.account_id', $account->id)
                ->selectRaw('COALESCE(SUM(journal_lines.debit),0) as d, COALESCE(SUM(journal_lines.kredit),0) as k')
                ->first();
            $saldoAwalPeriode += (float) ($sebelum->d ?? 0) - (float) ($sebelum->k ?? 0);
        }

        $rows = $this->postedQuery($from, $to)
            ->where('journal_lines.account_id', $account->id)
            ->when($jenis && $jenis !== 'Semua', fn($q, $j) => $q->where('journal_vouchers.jenis', $j))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('journal_vouchers.no_voucher', 'like', "%{$search}%")
                        ->orWhere('journal_vouchers.keterangan', 'like', "%{$search}%")
                        ->orWhere('journal_vouchers.no_referensi', 'like', "%{$search}%")
                        ->orWhere('journal_lines.memo', 'like', "%{$search}%");
                });
            })
            ->orderBy('journal_vouchers.tanggal')
            ->orderBy('journal_vouchers.no_voucher')
            ->orderBy('journal_lines.line_order')
            ->orderBy('journal_lines.id')
            ->get([
                'journal_lines.id',
                'journal_lines.debit',
                'journal_lines.kredit',
                'journal_lines.memo',
                'journal_vouchers.id as journal_voucher_id',
                'journal_vouchers.no_voucher',
                'journal_vouchers.tanggal',
                'journal_vouchers.jenis',
                'journal_vouchers.keterangan',
                'journal_vouchers.no_referensi',
                'journal_vouchers.status',
                'journal_vouchers.pihak_terkait',
                'journal_vouchers.kas_bank',
            ]);

        $saldo = $saldoAwalPeriode;
        $totalDebit = 0.0;
        $totalKredit = 0.0;
        $mutasi = $rows->values()->map(function ($r) use (&$saldo, &$totalDebit, &$totalKredit, $account) {
            $debit = (float) $r->debit;
            $kredit = (float) $r->kredit;
            $totalDebit += $debit;
            $totalKredit += $kredit;
            $saldo += $debit - $kredit;

            return [
                'line_id'            => $r->id,
                'journal_voucher_id' => $r->journal_voucher_id,
                'tanggal'            => substr((string) $r->tanggal, 0, 10),
                'no_voucher'         => $r->no_voucher,
                'account_id'         => $account->id,
                'nomor_akun'         => $account->nomor_akun,
                'nama_akun'          => $account->nama_akun,
                'jenis'              => $r->jenis,
                'keterangan'         => $r->memo ?: $r->keterangan,
                'pihak_terkait'      => $r->pihak_terkait,
                'no_referensi'       => $r->no_referensi,
                'debit'              => round($debit, 2),
                'kredit'             => round($kredit, 2),
                'saldo_running'      => round($account->saldo_normal === 'Kredit' ? -1 * $saldo : $saldo, 2),
                'status'             => $r->status,
            ];
        })->all();

        return [
            'cash_bank' => [
                'id'            => $cashBank->id,
                'jenis'         => $cashBank->jenis,
                'nama_tampilan' => $cashBank->nama_tampilan,
                'nama_bank'     => $cashBank->nama_bank,
                'rekening_masked' => $this->maskRekening($cashBank->nomor_rekening),
                'kode_akun'     => $account->nomor_akun,
                'nama_akun'     => $account->nama_akun,
                'saldo_normal'  => $account->saldo_normal,
            ],
            // Saldo awal berjalan pada awal periode (sudah termasuk mutasi sebelum $from).
            'saldo_awal_periode' => round($account->saldo_normal === 'Kredit' ? -1 * $saldoAwalPeriode : $saldoAwalPeriode, 2),
            'saldo_akhir'        => round($account->saldo_normal === 'Kredit' ? -1 * $saldo : $saldo, 2),
            'total_debit'        => round($totalDebit, 2),
            'total_kredit'       => round($totalKredit, 2),
            'rows'               => $mutasi,
        ];
    }

    /**
     * Ringkasan seluruh kas/bank.
     * Saldo akhir SELALU saldo awal + seluruh jurnal POSTED (bukan hanya
     * penerimaan dikurangi pengeluaran pada periode filter).
     */
    public function ringkasan(array $filter = []): array
    {
        $from = $filter['from'] ?? null;
        $to = $filter['to'] ?? null;

        $list = $this->masterList(['from' => $from, 'to' => $to]);

        $totalSaldoAwal = round($list->where('is_active', true)->sum('saldo_awal'), 2);
        $totalSaldoAkhir = round($list->where('is_active', true)->sum('saldo_akhir'), 2);

        // Penerimaan/pengeluaran periode: baris debit/kredit pada akun kas/bank,
        // dikelompokkan menurut jenis transaksi (voucher).
        $accountIds = $list->pluck('account_id')->filter()->all();

        $penerimaan = $this->postedQuery($from, $to)
            ->whereIn('journal_lines.account_id', $accountIds)
            ->whereIn('journal_vouchers.jenis', self::JENIS_MASUK)
            ->sum('journal_lines.debit');

        $pengeluaran = $this->postedQuery($from, $to)
            ->whereIn('journal_lines.account_id', $accountIds)
            ->whereIn('journal_vouchers.jenis', self::JENIS_KELUAR)
            ->sum('journal_lines.kredit');

        $peringatan = [];
        foreach ($list as $cb) {
            if ($cb['is_active'] && (! $cb['saldo_awal_tanggal'] || (float) $cb['saldo_awal'] <= 0)) {
                $peringatan[] = "{$cb['nama_tampilan']} ({$cb['kode_akun']}) belum memiliki saldo awal dan/atau tanggal saldo awal.";
            }
        }
        if ($list->isEmpty()) {
            $peringatan[] = 'Belum ada master Kas/Bank. Tambahkan master dan pasangkan ke akun COA tipe Aset.';
        }

        return [
            'total_saldo_awal'  => $totalSaldoAwal,
            'total_saldo_akhir' => $totalSaldoAkhir,
            'total_penerimaan'  => round((float) $penerimaan, 2),
            'total_pengeluaran' => round((float) $pengeluaran, 2),
            'jumlah_kas'        => $list->where('jenis', 'KAS')->where('is_active', true)->count(),
            'jumlah_bank'       => $list->where('jenis', 'BANK')->where('is_active', true)->count(),
            'rekening'          => $list->values()->all(),
            'peringatan'        => $peringatan,
        ];
    }

    // -----------------------------------------------------------------
    // Transaksi (selalu lewat Journal Voucher existing)
    // -----------------------------------------------------------------

    /** Jenis voucher penerimaan: BANK -> Voucher Bank Masuk, KAS -> Voucher Kas. */
    public function jenisPenerimaan(CashBank $cb): string
    {
        return $cb->jenis === 'BANK' ? 'Voucher Bank Masuk' : 'Voucher Kas';
    }

    /** Jenis voucher pengeluaran: BANK -> Voucher Bank Keluar, KAS -> Voucher Kas. */
    public function jenisPengeluaran(CashBank $cb): string
    {
        return $cb->jenis === 'BANK' ? 'Voucher Bank Keluar' : 'Voucher Kas';
    }

    /**
     * Susun baris jurnal penerimaan: Debit Kas/Bank tujuan, Kredit akun lawan.
     */
    public function linesPenerimaan(CashBank $tujuan, Account $akunLawan, float $nominal, ?string $memo = null): array
    {
        return [
            ['account_id' => $tujuan->account_id, 'debit' => $nominal, 'kredit' => 0, 'memo' => $memo],
            ['account_id' => $akunLawan->id,     'debit' => 0,       'kredit' => $nominal, 'memo' => $memo],
        ];
    }

    /**
     * Susun baris jurnal pengeluaran: Debit akun lawan, Kredit Kas/Bank sumber.
     */
    public function linesPengeluaran(CashBank $sumber, Account $akunLawan, float $nominal, ?string $memo = null): array
    {
        return [
            ['account_id' => $akunLawan->id,  'debit' => $nominal, 'kredit' => 0, 'memo' => $memo],
            ['account_id' => $sumber->account_id, 'debit' => 0,   'kredit' => $nominal, 'memo' => $memo],
        ];
    }

    /**
     * Susun baris jurnal transfer: Debit tujuan, Kredit sumber, nominal sama.
     */
    public function linesTransfer(CashBank $sumber, CashBank $tujuan, float $nominal, ?string $memo = null): array
    {
        return [
            ['account_id' => $tujuan->account_id, 'debit' => $nominal, 'kredit' => 0, 'memo' => $memo],
            ['account_id' => $sumber->account_id, 'debit' => 0, 'kredit' => $nominal, 'memo' => $memo],
        ];
    }

    /**
     * Ambil master aktif + akunnya, pastikan statusnya boleh dipakai transaksi.
     */
    public function aktifOrFail(int $id, string $field = 'cash_bank_id'): CashBank
    {
        $cb = CashBank::with('account')->find($id);

        if (! $cb) {
            throw ValidationException::withMessages([$field => 'Kas/Bank tidak ditemukan.']);
        }
        if (! $cb->is_active) {
            throw ValidationException::withMessages([$field => "Kas/Bank {$cb->nama_tampilan} berstatus Nonaktif."]);
        }
        if (! $cb->account) {
            throw ValidationException::withMessages([$field => "Akun COA untuk {$cb->nama_tampilan} tidak ditemukan."]);
        }
        if (! $cb->account->is_active) {
            throw ValidationException::withMessages([
                $field => "Akun COA {$cb->account->nomor_akun} berstatus Nonaktif. Transaksi tidak dapat dipakai.",
            ]);
        }
        if ($cb->account->is_header) {
            throw ValidationException::withMessages([
                $field => "Akun COA {$cb->account->nomor_akun} adalah akun induk dan tidak dapat dipakai transaksi.",
            ]);
        }

        return $cb;
    }

    /**
     * Akun lawan (counter account) wajib akun detail yang aktif.
     */
    public function akunLawanOrFail(int $accountId, string $field = 'lawan_account_id'): Account
    {
        $account = Account::find($accountId);

        if (! $account) {
            throw ValidationException::withMessages([$field => 'Akun lawan tidak ditemukan.']);
        }
        if (! $account->is_active) {
            throw ValidationException::withMessages([$field => "Akun {$account->nomor_akun} berstatus Nonaktif."]);
        }
        if ($account->is_header) {
            throw ValidationException::withMessages([$field => "Akun {$account->nomor_akun} adalah akun induk dan tidak dapat dipilih."]);
        }

        return $account;
    }

    // -----------------------------------------------------------------
    // Saldo awal (membaca/menulis accounts.saldo_awal — bukan tabel baru)
    // -----------------------------------------------------------------

    /**
     * Simpan saldo awal kas/bank ke kolom COA existing.
     *
     * Perlindungan: bila akun sudah punya jurnal POSTED, saldo awal tidak boleh
     * diubah diam-diam (harus lewat prosedur koreksi/reversal).
     */
    public function simpanSaldoAwal(CashBank $cashBank, float $saldoAwal, ?string $tanggal, ?int $userId = null): Account
    {
        $account = $cashBank->account ?: $cashBank->load('account')->account;

        if (! $account) {
            throw ValidationException::withMessages(['account_id' => 'Akun COA untuk Kas/Bank ini tidak ditemukan.']);
        }

        if ($saldoAwal < 0) {
            throw ValidationException::withMessages(['saldo_awal' => 'Saldo awal tidak boleh negatif.']);
        }

        $postedCount = $cashBank->postedVoucherCount();
        $berubah = abs((float) $account->saldo_awal - $saldoAwal) > 0.009
            || optional($account->saldo_awal_tanggal)->toDateString() !== ($tanggal ?: null);

        if ($berubah && $postedCount > 0) {
            throw ValidationException::withMessages([
                'saldo_awal' => "Akun {$account->nomor_akun} sudah memiliki {$postedCount} voucher POSTED. "
                    . 'Saldo awal tidak dapat diubah langsung karena akan mengubah saldo efektif secara diam-diam. '
                    . 'Gunakan prosedur koreksi (reversal voucher) atau no. akun lain untuk pembukaan baru.',
            ]);
        }

        $account->update([
            'saldo_awal'         => $saldoAwal,
            'saldo_awal_tanggal' => $tanggal,
            'updated_by'         => $userId,
        ]);

        return $account->fresh();
    }
}
