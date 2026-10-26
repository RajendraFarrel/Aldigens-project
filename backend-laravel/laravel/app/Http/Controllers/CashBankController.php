<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\CashBank;
use App\Services\CashBankService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Master Kas & Bank (CRUD) + tab Saldo Awal.
 *
 * Semua endpoint berada di grup auth:sanctum (routes/api.php).
 */
class CashBankController extends Controller
{
    public function __construct(private CashBankService $service) {}

    // ---------------------------------------------------------------
    // Master
    // ---------------------------------------------------------------

    public function index(Request $request)
    {
        $list = $this->service->masterList([
            'from' => $request->query('from'),
            'to'   => $request->query('to'),
        ]);

        if ($request->query('jenis') && $request->query('jenis') !== 'Semua') {
            $list = $list->where('jenis', $request->query('jenis'))->values();
        }
        if ($request->query('status') === 'Aktif') {
            $list = $list->where('is_active', true)->values();
        } elseif ($request->query('status') === 'Nonaktif') {
            $list = $list->where('is_active', false)->values();
        }

        $q = strtolower(trim((string) $request->query('search')));
        if ($q !== '') {
            $list = $list->filter(function ($cb) use ($q) {
                return str_contains(strtolower($cb['nama_tampilan'] ?? ''), $q)
                    || str_contains(strtolower($cb['nama_bank'] ?? ''), $q)
                    || str_contains(strtolower($cb['kode_akun'] ?? ''), $q)
                    || str_contains(strtolower($cb['nama_akun'] ?? ''), $q);
            })->values();
        }

        return response()->json($list);
    }

    public function show(CashBank $cashBank)
    {
        return response()->json($this->service->masterDetail($cashBank));
    }

    /**
     * Akun COA yang BELUM terpasang ke master Kas/Bank.
     * Hanya akun detail Aset & aktif — inilah pilihan yang boleh dipakai.
     */
    public function akunTersedia(Request $request)
    {
        $dipakai = CashBank::pluck('account_id')->all();

        $accounts = Account::query()
            ->where('tipe_akun', 'Aset')
            ->where('is_header', false)
            ->where('is_active', true)
            ->whereNotIn('id', $dipakai)
            ->orderBy('nomor_akun')
            ->get(['id', 'nomor_akun', 'nama_akun', 'tipe_akun', 'saldo_normal', 'saldo_awal', 'saldo_awal_tanggal']);

        return response()->json($accounts);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $account = CashBank::assertAccountEligible(Account::find($data['account_id']));

        $exists = CashBank::where('account_id', $account->id)->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'account_id' => "Akun {$account->nomor_akun} sudah dipasangkan ke master Kas/Bank lain.",
            ]);
        }

        $cashBank = CashBank::create($data + [
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json($this->service->masterDetail($cashBank), 201);
    }

    public function update(Request $request, CashBank $cashBank)
    {
        $data = $this->validated($request);

        $account = CashBank::assertAccountEligible(Account::find($data['account_id']));

        $exists = CashBank::where('account_id', $account->id)
            ->where('id', '!=', $cashBank->id)
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'account_id' => "Akun {$account->nomor_akun} sudah dipasangkan ke master Kas/Bank lain.",
            ]);
        }

        // Ganti akun setelah ada transaksi akan memutus histori saldo. Tolak.
        if ((int) $data['account_id'] !== (int) $cashBank->account_id && $cashBank->postedVoucherCount() > 0) {
            throw ValidationException::withMessages([
                'account_id' => 'Kas/Bank ini sudah memiliki voucher POSTED. Akun COA tidak dapat diganti; '
                    . 'nonaktifkan master lalu buat master baru bila memang perlu.',
            ]);
        }

        $cashBank->update($data + ['updated_by' => $request->user()?->id]);

        return response()->json($this->service->masterDetail($cashBank->fresh()));
    }

    /**
     * Nonaktifkan/aktifkan master. COA TIDAK ikut dinonaktifkan dan
     * riwayat transaksi tetap utuh.
     */
    public function toggleStatus(Request $request, CashBank $cashBank)
    {
        $cashBank->update([
            'is_active'  => ! (bool) $cashBank->is_active,
            'updated_by' => $request->user()?->id,
        ]);

        return response()->json($this->service->masterDetail($cashBank->fresh()));
    }

    /**
     * Hapus master hanya bila belum pernah dipakai transaksi.
     * Kalau sudah ada voucher POSTED, gunakan Nonaktifkan agar histori utuh.
     * Penghapusan master TIDAK menghapus akun COA.
     */
    public function destroy(CashBank $cashBank)
    {
        if ($cashBank->postedVoucherCount() > 0) {
            return response()->json([
                'message' => "Kas/Bank {$cashBank->nama_tampilan} sudah memiliki transaksi POSTED. Nonaktifkan saja agar riwayat tetap utuh.",
            ], 422);
        }

        $cashBank->delete();

        return response()->json(['message' => 'Master Kas/Bank dihapus. Akun COA tetap tersedia.']);
    }

    // ---------------------------------------------------------------
    // Saldo Awal (baca/tulis accounts.saldo_awal)
    // ---------------------------------------------------------------

    public function saldoAwal(Request $request)
    {
        $list = $this->service->masterList(['from' => null, 'to' => null]);

        $rows = $list->map(fn($cb) => [
            'id'                  => $cb['id'],
            'nama_tampilan'       => $cb['nama_tampilan'],
            'jenis'               => $cb['jenis'],
            'account_id'          => $cb['account_id'],
            'kode_akun'           => $cb['kode_akun'],
            'nama_akun'           => $cb['nama_akun'],
            'saldo_normal'        => $cb['saldo_normal'],
            'saldo_awal'          => $cb['saldo_awal'],
            'saldo_awal_tanggal'  => $cb['saldo_awal_tanggal'],
            'is_active'           => $cb['is_active'],
            'jumlah_voucher_posted' => $cb['jumlah_voucher_posted'],
            'terkunci'            => $cb['jumlah_voucher_posted'] > 0,
        ])->values();

        /*
         * CATATAN AKUNTANSI:
         * Total di bawah hanya total saldo awal kas & bank, BUKAN total pembukaan
         * seluruh akun. Sistem tidak boleh menyimpulkan Neraca sudah balance
         * hanya dari angka ini. Saldo awal akun lain tetap dikelola di COA.
         */
        $akunAsetTanpaSaldo = Account::where('tipe_akun', 'Aset')
            ->where('is_header', false)
            ->whereNotIn('id', $rows->pluck('account_id')->all())
            ->where(fn($q) => $q->whereNull('saldo_awal_tanggal')->orWhere('saldo_awal', 0))
            ->count();

        return response()->json([
            'rows'                => $rows,
            'total_saldo_awal'    => round($rows->where('is_active', true)->sum('saldo_awal'), 2),
            'akun_aset_tanpa_saldo' => $akunAsetTanpaSaldo,
            'catatan'             => 'Saldo awal ini hanya untuk akun Kas/Bank yang terdaftar. '
                . 'Pembukaan akun lain tetap diisi di Chart of Account. '
                . 'Selama akun lain belum dilengkapi, Neraca Saldo/Neraca keseluruhan mungkin belum seimbang.',
        ]);
    }

    public function simpanSaldoAwal(Request $request, CashBank $cashBank)
    {
        $data = $request->validate([
            'saldo_awal'         => ['required', 'numeric', 'min:0'],
            'saldo_awal_tanggal' => ['nullable', 'date'],
        ], [], [
            'saldo_awal'         => 'Saldo Awal',
            'saldo_awal_tanggal' => 'Tanggal Saldo Awal',
        ]);

        $saldo = (float) $data['saldo_awal'];
        $tanggal = $data['saldo_awal_tanggal'] ?? null;

        if ($saldo > 0 && ! $tanggal) {
            throw ValidationException::withMessages([
                'saldo_awal_tanggal' => 'Tanggal saldo awal wajib diisi ketika saldo awal lebih dari nol.',
            ]);
        }

        DB::transaction(function () use ($cashBank, $saldo, $tanggal, $request) {
            $this->service->simpanSaldoAwal($cashBank, $saldo, $tanggal, $request->user()?->id);
        });

        return response()->json([
            'message' => 'Saldo awal Kas/Bank berhasil disimpan.',
            'cash_bank' => $this->service->masterDetail($cashBank->fresh()),
        ]);
    }

    // ---------------------------------------------------------------

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'account_id'     => ['required', 'integer', 'exists:accounts,id'],
            'jenis'          => ['required', 'in:' . implode(',', CashBank::JENIS)],
            'nama_tampilan'  => ['required', 'string', 'max:191'],
            'nama_bank'      => ['nullable', 'string', 'max:191'],
            'cabang'         => ['nullable', 'string', 'max:191'],
            'nomor_rekening' => ['nullable', 'string', 'max:64'],
            'nama_pemilik'   => ['nullable', 'string', 'max:191'],
            'is_active'      => ['nullable', 'boolean'],
            'keterangan'     => ['nullable', 'string', 'max:1000'],
        ], [], [
            'account_id'    => 'Akun COA',
            'jenis'         => 'Jenis',
            'nama_tampilan' => 'Nama Tampilan',
        ]);

        if ($data['jenis'] === 'BANK' && empty($data['nama_bank'])) {
            throw ValidationException::withMessages([
                'nama_bank' => 'Nama bank wajib diisi untuk jenis BANK.',
            ]);
        }

        if ($data['jenis'] === 'KAS') {
            // Data rekening tidak relevan untuk kas tunai.
            $data['nama_bank'] = null;
            $data['cabang'] = null;
            $data['nomor_rekening'] = null;
            $data['nama_pemilik'] = null;
        }

        $data['is_active'] = $data['is_active'] ?? true;

        return $data;
    }
}
