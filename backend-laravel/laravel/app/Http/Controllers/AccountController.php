<?php

namespace App\Http\Controllers;

use App\Models\Account;
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
