<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\CashBank;
use App\Models\JournalVoucher;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $q = $request->query('search');
        $tipe = $request->query('tipe');
        $status = $request->query('status'); // Aktif | Nonaktif | Semua

        $accounts = Account::query()
            ->when($q, function ($query) use ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('nomor_akun', 'like', "%{$q}%")
                        ->orWhere('nama_akun', 'like', "%{$q}%")
                        ->orWhere('keterangan', 'like', "%{$q}%");
                });
            })
            ->when($tipe && $tipe !== 'Semua', fn($query) => $query->where('tipe_akun', $tipe))
            ->when($status === 'Aktif', fn($query) => $query->where('is_active', true))
            ->when($status === 'Nonaktif', fn($query) => $query->where('is_active', false))
            ->orderBy('nomor_akun')
            ->get();

        return response()->json($accounts);
    }

    public function store(Request $request, array $data = [])
    {
        $data = $this->validated($request, $data ?: $request->all());

        $exists = Account::where('nomor_akun', $data['nomor_akun'])->exists();
        if ($exists) {
            return response()->json(['message' => "Nomor Akun {$data['nomor_akun']} sudah digunakan."], 422);
        }

        $account = Account::create($data + ['created_by' => $request->user()?->id]);

        return response()->json($account, 201);
    }

    public function update(Request $request, Account $account, array $data = [])
    {
        $data = $this->validated($request, $data ?: $request->all());

        $exists = Account::where('nomor_akun', $data['nomor_akun'])
            ->where('id', '!=', $account->id)->exists();
        if ($exists) {
            return response()->json(['message' => "Nomor Akun {$data['nomor_akun']} sudah digunakan."], 422);
        }

        // Perlindungan saldo awal: akun yang sudah dipakai jurnal POSTED tidak
        // boleh diubah saldo awalnya lewat jalur COA (akan mengubah saldo efektif
        // & laporan secara diam-diam). Berlaku juga untuk akun Kas/Bank.
        $perubahanSaldoAwal = $this->perubahanSaldoAwal($account, $data);
        if ($perubahanSaldoAwal) {
            $postedCount = JournalVoucher::where('status', 'POSTED')
                ->whereHas('lines', fn ($q) => $q->where('account_id', $account->id))
                ->count();

            if ($postedCount > 0) {
                return response()->json([
                    'message' => "Akun {$account->nomor_akun} sudah memiliki {$postedCount} voucher POSTED. "
                        . 'Saldo awal tidak dapat diubah langsung. Gunakan prosedur koreksi (reversal voucher).',
                ], 422);
            }

            // Akun Kas/Bank terdaftar: perubahan saldo awal hanya lewat menu Kas & Bank.
            if (CashBank::where('account_id', $account->id)->exists()) {
                return response()->json([
                    'message' => "Akun {$account->nomor_akun} terdaftar sebagai Kas/Bank. "
                        . 'Perubahan saldo awal dilakukan melalui menu Kas & Bank > tab Saldo Awal.',
                ], 422);
            }
        }

        $account->update($data + ['updated_by' => $request->user()?->id]);

        return response()->json($account->fresh());
    }

    /**
     * Menonaktifkan akun tanpa menghapus histori.
     * Akun yang sudah dipakai jurnal tidak boleh dihapus, hanya dinonaktifkan.
     */
    public function toggleStatus(Request $request, Account $account)
    {
        $account->update([
            'is_active'   => ! (bool) $account->is_active,
            'updated_by'  => $request->user()?->id,
        ]);

        return response()->json($account->fresh());
    }

    /** Apakah payload mengubah saldo awal atau tanggal saldo awal? */
    private function perubahanSaldoAwal(Account $account, array $data): bool
    {
        if (array_key_exists('saldo_awal', $data)
            && abs((float) $account->saldo_awal - (float) $data['saldo_awal']) > 0.009) {
            return true;
        }

        if (array_key_exists('saldo_awal_tanggal', $data)) {
            $baru = $data['saldo_awal_tanggal'] ? substr((string) $data['saldo_awal_tanggal'], 0, 10) : null;
            $lama = optional($account->saldo_awal_tanggal)->toDateString();
            if ($baru !== $lama) {
                return true;
            }
        }

        return false;
    }

    private function validated(Request $request, array $data): array
    {
        $validator = validator($data ?: $request->all(), [
            'nomor_akun'          => ['required', 'string', 'max:50'],
            'nama_akun'           => ['required', 'string', 'max:191'],
            'tipe_akun'           => ['required', 'in:Aset,Liabilitas,Ekuitas,Pendapatan,Beban'],
            'saldo_normal'        => ['required', 'in:Debit,Kredit'],
            'keterangan'          => ['nullable', 'string'],
            'is_active'           => ['nullable', 'boolean'],
            'is_header'           => ['nullable', 'boolean'],
            'parent_nomor_akun'   => ['nullable', 'string', 'max:50'],
            'saldo_awal'          => ['nullable', 'numeric', 'min:0'],
            'saldo_awal_tanggal'  => ['nullable', 'date'],
        ], [], [
            'nomor_akun' => 'Nomor Akun',
            'nama_akun'  => 'Nama Akun',
            'tipe_akun'  => 'Tipe Akun',
            'saldo_normal' => 'Saldo Normal',
        ]);

        if ($validator->fails()) {
            abort(response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422));
        }

        return $validator->validated();
    }
}
