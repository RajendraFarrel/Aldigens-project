<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\JournalLine;
use App\Models\JournalVoucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingReportController extends Controller
{
    /** Query dasar: hanya baris jurnal dari voucher POSTED. */
    private function postedLines(Request $request)
    {
        return JournalLine::query()
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_lines.journal_voucher_id')
            ->where('journal_vouchers.status', 'POSTED')
            ->when($request->query('from'), fn($q, $d) => $q->whereDate('journal_vouchers.tanggal', '>=', $d))
            ->when($request->query('to'), fn($q, $d) => $q->whereDate('journal_vouchers.tanggal', '<=', $d))
            ->when($request->query('jenis'), fn($q, $j) => $q->where('journal_vouchers.jenis', $j))
            ->when($request->query('account_id'), fn($q, $a) => $q->where('journal_lines.account_id', $a));
    }

    // ---------------------------------------------------------------
    // TAHAP 6 — Rekap Jurnal Umum
    // Susunan mengikuti format Excel rekap jurnal perusahaan.
    // ---------------------------------------------------------------
    public function journalUmum(Request $request)
    {
        $rows = $this->postedLines($request)
            ->orderBy('journal_vouchers.tanggal')
            ->orderBy('journal_vouchers.no_voucher')
            ->orderBy('journal_lines.line_order')
            ->get([
                'journal_lines.id',
                'journal_lines.journal_voucher_id',
                'journal_lines.nomor_akun',
                'journal_lines.nama_akun',
                'journal_lines.debit',
                'journal_lines.kredit',
                'journal_lines.memo',
                'journal_vouchers.no_voucher',
                'journal_vouchers.tanggal',
                'journal_vouchers.keterangan',
                'journal_vouchers.jenis',
            ]);

        $totalDebit  = round($rows->sum('debit'), 2);
        $totalKredit = round($rows->sum('kredit'), 2);

        return response()->json([
            'rows'         => $rows,
            'total_debit'  => $totalDebit,
            'total_kredit' => $totalKredit,
            'selisih'      => round($totalDebit - $totalKredit, 2),
            'balanced'     => abs($totalDebit - $totalKredit) < 0.009,
            'jumlah_voucher' => $rows->pluck('journal_voucher_id')->unique()->count(),
        ]);
    }

    // ---------------------------------------------------------------
    // TAHAP 7 — Buku Besar (per akun)
    // ---------------------------------------------------------------
    public function bukuBesar(Request $request)
    {
        $accountId = $request->query('account_id');

        if (! $accountId) {
            return response()->json(['message' => 'Parameter account_id wajib diisi.'], 422);
        }

        $account = Account::find($accountId);
        if (! $account) {
            return response()->json(['message' => 'Akun tidak ditemukan.'], 404);
        }

        // Saldo awal ikut saldo normal akun.
        $saldoAwal = (float) $account->saldo_awal;
        $saldoAwal = $account->saldo_normal === 'Kredit' ? -1 * $saldoAwal : $saldoAwal;

        $lines = $this->postedLines($request)
            ->where('journal_lines.account_id', $accountId)
            ->orderBy('journal_vouchers.tanggal')
            ->orderBy('journal_vouchers.no_voucher')
            ->orderBy('journal_lines.line_order')
            ->get([
                'journal_lines.id',
                'journal_lines.nomor_akun',
                'journal_lines.debit',
                'journal_lines.kredit',
                'journal_lines.memo',
                'journal_vouchers.id as journal_voucher_id',
                'journal_vouchers.no_voucher',
                'journal_vouchers.tanggal',
                'journal_vouchers.keterangan',
            ]);

        $saldo = $saldoAwal;
        $mutasi = collect([[
            'tanggal'            => optional($account->saldo_awal_tanggal)->toDateString(),
            'no_voucher'         => '-',
            'keterangan'         => 'Saldo Awal',
            'debit'              => 0,
            'kredit'             => 0,
            'saldo'              => $saldoAwal,
            'journal_voucher_id' => null,
        ]]);

        foreach ($lines as $line) {
            $saldo += $line->debit - $line->kredit;
            $mutasi->push([
                'tanggal'            => $line->tanggal,
                'no_voucher'         => $line->no_voucher,
                'keterangan'         => $line->memo ?: $line->keterangan,
                'debit'              => (float) $line->debit,
                'kredit'             => (float) $line->kredit,
                'saldo'              => round($saldo, 2),
                'journal_voucher_id' => $line->journal_voucher_id,
            ]);
        }

        return response()->json([
            'account' => [
                'id'             => $account->id,
                'nomor_akun'     => $account->nomor_akun,
                'nama_akun'      => $account->nama_akun,
                'tipe_akun'      => $account->tipe_akun,
                'saldo_normal'   => $account->saldo_normal,
                'keterangan'     => $account->keterangan,
            ],
            'saldo_awal'   => round($saldoAwal, 2),
            'mutasi'       => $mutasi,
            'total_debit'  => round($lines->sum('debit'), 2),
            'total_kredit' => round($lines->sum('kredit'), 2),
            'saldo_akhir'  => round($saldo, 2),
        ]);
    }

    // ---------------------------------------------------------------
    // TAHAP 8 — Neraca Saldo
    // ---------------------------------------------------------------
    public function neracaSaldo(Request $request)
    {
        $rows = DB::table('accounts')
            ->leftJoin('journal_lines', 'journal_lines.account_id', '=', 'accounts.id')
            ->leftJoin('journal_vouchers', 'journal_vouchers.id', '=', 'journal_lines.journal_voucher_id')
            ->selectRaw('accounts.id, accounts.nomor_akun, accounts.nama_akun, accounts.tipe_akun, accounts.saldo_normal, accounts.saldo_awal')
            ->selectRaw('COALESCE(SUM(CASE WHEN journal_vouchers.id IS NOT NULL AND journal_vouchers.status = "POSTED" THEN journal_lines.debit ELSE 0 END), 0) as total_debit')
            ->selectRaw('COALESCE(SUM(CASE WHEN journal_vouchers.id IS NOT NULL AND journal_vouchers.status = "POSTED" THEN journal_lines.kredit ELSE 0 END), 0) as total_kredit')
            ->when($request->query('from'), fn($q, $d) => $q->whereRaw('journal_vouchers.tanggal >= ?', [$d]))
            ->when($request->query('to'), fn($q, $d) => $q->whereRaw('journal_vouchers.tanggal <= ?', [$d]))
            ->when($request->query('tipe') && $request->query('tipe') !== 'Semua', fn($q, $t) => $q->where('accounts.tipe_akun', $t))
            ->where('accounts.is_header', false)
            ->groupBy('accounts.id', 'accounts.nomor_akun', 'accounts.nama_akun', 'accounts.tipe_akun', 'accounts.saldo_normal', 'accounts.saldo_awal')
            ->orderBy('accounts.nomor_akun')
            ->get();

        // Neraca Saldo: setiap akun tampil pada satu sisi sesuai saldo normalnya.
        $data = $rows->map(function ($a) {
            $mutasiDebit  = (float) $a->total_debit;
            $mutasiKredit = (float) $a->total_kredit;

            $net = $a->saldo_normal === 'Kredit'
                ? -1 * ($mutasiKredit - $mutasiDebit + (float) $a->saldo_awal)
                : ($mutasiDebit - $mutasiKredit + (float) $a->saldo_awal);

            $sisa = round(max($net, 0), 2);

            return [
                'account_id'   => $a->id,
                'nomor_akun'   => $a->nomor_akun,
                'nama_akun'    => $a->nama_akun,
                'tipe_akun'    => $a->tipe_akun,
                'saldo_normal' => $a->saldo_normal,
                'debit'        => $a->saldo_normal === 'Debit' ? $sisa : 0.0,
                'kredit'       => $a->saldo_normal === 'Kredit' ? $sisa : 0.0,
                'mutasi_debit'  => round($mutasiDebit, 2),
                'mutasi_kredit' => round($mutasiKredit, 2),
            ];
        })->values();

        $totalDebit  = round($data->sum('debit'), 2);
        $totalKredit = round($data->sum('kredit'), 2);

        // Keseimbangan diuji dari total mutasi debit vs kredit (pasti sama bila
        // semua jurnal berpasangan). Kolom "sisa" debit/kredit di atas hanya
        // menampilkan posisi akun terhadap saldo normalnya, sehingga
        // jumlahnya memang boleh berbeda.
        $mutasiDebit  = round($data->sum('mutasi_debit'), 2);
        $mutasiKredit = round($data->sum('mutasi_kredit'), 2);

        return response()->json([
            'rows'          => $data,
            'total_debit'   => $totalDebit,
            'total_kredit'  => $totalKredit,
            'mutasi_debit'  => $mutasiDebit,
            'mutasi_kredit' => $mutasiKredit,
            'selisih'       => round($mutasiDebit - $mutasiKredit, 2),
            'balanced'      => abs($mutasiDebit - $mutasiKredit) < 0.009,
        ]);
    }

    // ---------------------------------------------------------------
    // TAHAP 10 — Laporan Laba Rugi & Neraca
    // ---------------------------------------------------------------

    public function labaRugi(Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $saldo = $this->saldoPerTipe(['Pendapatan', 'Beban'], $from, $to);

        $pendapatan = $saldo['Pendapatan'];

        // HPP dipisahkan dari beban operasional (akun bernama "Harga Pokok Penjualan").
        $hpp   = $saldo['Beban']->filter(fn ($a) => str_contains(strtolower($a['nama_akun']), 'harga pokok'))->values();
        $beban = $saldo['Beban']->reject(fn ($a) => str_contains(strtolower($a['nama_akun']), 'harga pokok'))->values();

        $totalPendapatan = round($pendapatan->sum('saldo'), 2);
        $totalHpp        = round($hpp->sum('saldo'), 2);
        $totalBeban      = round($beban->sum('saldo'), 2);

        $labaKotor   = round($totalPendapatan - $totalHpp, 2);
        $labaBersih  = round($labaKotor - $totalBeban, 2);

        return response()->json([
            'pendapatan'       => $pendapatan,
            'harga_pokok'      => $hpp,
            'beban'            => $beban,
            'total_pendapatan' => $totalPendapatan,
            'total_hpp'        => $totalHpp,
            'total_beban'      => $totalBeban,
            'laba_kotor'       => $labaKotor,
            'laba_bersih'      => $labaBersih,
            'peringatan'        => $this->peringatanKonfigurasi(['Pendapatan', 'Beban']),
        ]);
    }

    public function neraca(Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $aset      = $this->saldoPerTipe(['Aset'], $from, $to)['Aset']->filter(fn($a) => $a['saldo'] > 0)->values();
        $kewajiban = $this->saldoPerTipe(['Liabilitas'], $from, $to)['Liabilitas']->map(fn($a) => ['saldo' => -1 * $a['saldo'], 'nama_akun' => $a['nama_akun'], 'nomor_akun' => $a['nomor_akun'], 'account_id' => $a['account_id']])->filter(fn($a) => $a['saldo'] > 0)->values();
        $ekuitas   = $this->saldoPerTipe(['Ekuitas'], $from, $to)['Ekuitas']->map(fn($a) => ['saldo' => -1 * $a['saldo'], 'nama_akun' => $a['nama_akun'], 'nomor_akun' => $a['nomor_akun'], 'account_id' => $a['account_id']])->filter(fn($a) => $a['saldo'] > 0)->values();

        // Laba periode berjalan masuk ke ekuitas sebagai "Laba Berjalan".
        $laba = $this->labaRugi($request)->getData(true);
        $labaBerjalan = (float) $laba['laba_bersih'];
        if ($labaBerjalan != 0.0) {
            $ekuitas = $ekuitas->concat(collect([[
                'account_id' => null,
                'nomor_akun' => '-',
                'nama_akun'  => 'Laba / Rugi Periode Berjalan',
                'saldo'      => $labaBerjalan,
            ]]));
        }

        $totalAset      = round($aset->sum('saldo'), 2);
        $totalKewajiban = round($kewajiban->sum('saldo'), 2);
        $totalEkuitas   = round($ekuitas->sum('saldo'), 2);

        return response()->json([
            'aset'                => $aset,
            'kewajiban'           => $kewajiban,
            'ekuitas'             => $ekuitas,
            'total_aset'          => $totalAset,
            'total_kewajiban'     => $totalKewajiban,
            'total_ekuitas'       => $totalEkuitas,
            'selisih'             => round($totalAset - ($totalKewajiban + $totalEkuitas), 2),
            'balanced'            => abs($totalAset - ($totalKewajiban + $totalEkuitas)) < 0.009,
            'peringatan'          => $this->peringatanKonfigurasi(['Aset', 'Liabilitas', 'Ekuitas']),
        ]);
    }

    /**
     * Saldo akhir tiap akun (signed, mengikuti saldo normal) dari jurnal POSTED.
     */
    private function saldoPerTipe(array $tipe, ?string $from, ?string $to)
    {
        $rows = DB::table('accounts')
            ->leftJoin('journal_lines', 'journal_lines.account_id', '=', 'accounts.id')
            ->leftJoin('journal_vouchers', 'journal_vouchers.id', '=', 'journal_lines.journal_voucher_id')
            ->select('accounts.id as account_id', 'accounts.nomor_akun', 'accounts.nama_akun', 'accounts.tipe_akun', 'accounts.saldo_normal', 'accounts.saldo_awal')
            ->selectRaw('COALESCE(SUM(CASE WHEN journal_vouchers.status = "POSTED" THEN journal_lines.debit ELSE 0 END), 0) as d')
            ->selectRaw('COALESCE(SUM(CASE WHEN journal_vouchers.status = "POSTED" THEN journal_lines.kredit ELSE 0 END), 0) as k')
            ->when($from, fn($q) => $q->whereRaw('journal_vouchers.tanggal >= ?', [$from]))
            ->when($to, fn($q) => $q->whereRaw('journal_vouchers.tanggal <= ?', [$to]))
            ->whereIn('accounts.tipe_akun', $tipe)
            ->where('accounts.is_header', false)
            ->groupBy('accounts.id', 'accounts.nomor_akun', 'accounts.nama_akun', 'accounts.tipe_akun', 'accounts.saldo_normal', 'accounts.saldo_awal')
            ->get();

        $out = [];
        foreach ($tipe as $t) {
            $out[$t] = $rows->where('tipe_akun', $t)->map(function ($a) {
                $signed = (float) $a->d - (float) $a->k + (float) $a->saldo_awal;
                return [
                    'account_id'   => $a->account_id,
                    'nomor_akun'   => $a->nomor_akun,
                    'nama_akun'    => $a->nama_akun,
                    'tipe_akun'    => $a->tipe_akun,
                    'saldo_normal' => $a->saldo_normal,
                    'saldo'        => round($a->saldo_normal === 'Kredit' ? -1 * $signed : $signed, 2),
                ];
            })->values();
        }

        return $out;
    }

    /**
     * Laporan keuangan hanya sah bila COA & saldo awal sudah disiapkan.
     * Bila belum, kembalikan peringatan jelas — jangan tampilkan angka seolah valid.
     */
    private function peringatanKonfigurasi(array $tipe): array
    {
        $peringatan = [];

        $jumlahAkun = Account::whereIn('tipe_akun', $tipe)->where('is_header', false)->count();
        if ($jumlahAkun === 0) {
            $peringatan[] = 'Belum ada akun pada tipe ini di Chart of Account. Laporan belum dapat dihitung sampai COA diisi.';
        }

        $tanpaSaldoAwal = Account::whereIn('tipe_akun', $tipe)
            ->where('is_header', false)
            ->where(function ($q) {
                $q->whereNull('saldo_awal_tanggal')->orWhere('saldo_awal', 0);
            })
            ->count();

        if ($tanpaSaldoAwal > 0) {
            $peringatan[] = "{$tanpaSaldoAwal} akun belum memiliki saldo awal yang sah. Nilai saldo awal harus diisi perusahaan, bukan diasumsikan sistem.";
        }

        return $peringatan;
    }

    /** Jumlah voucher POSTED — dipakai halaman ringkasan. */
    public function summary(Request $request)
    {
        $posted = JournalVoucher::where('status', 'POSTED')->count();
        $draft  = JournalVoucher::where('status', 'DRAFT')->count();

        return response()->json([
            'posted' => $posted,
            'draft'  => $draft,
            'akun'   => Account::where('is_header', false)->count(),
            'akun_nonaktif' => Account::where('is_active', false)->count(),
        ]);
    }
}
