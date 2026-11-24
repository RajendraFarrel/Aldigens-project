<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Services\FinanceJournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $assets = Asset::query()
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('acquisition_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(['status' => 'success', 'data' => $assets]);
    }

    public function show($id)
    {
        return response()->json(['status' => 'success', 'data' => Asset::findOrFail($id)]);
    }

    /**
     * Dua mode:
     * 1) Aset yang sudah dimiliki (tanpa cash_bank_id): hanya dicatat di daftar aset.
     * 2) Aset yang dibeli sekarang (dengan cash_bank_id + asset_account_id):
     *    otomatis jurnal Debit akun aset tetap, Kredit Kas/Bank.
     */
    public function store(Request $request, FinanceJournalService $finance)
    {
        $data = $request->validate([
            'code'             => 'nullable|string|max:50|unique:assets,code',
            'name'             => 'required|string|max:191',
            'category'         => 'required|in:movable,immovable',
            'type'             => 'nullable|string|max:100',
            'acquisition_date' => 'required|date',
            'acquisition_cost' => 'required|numeric|min:0',
            'current_value'    => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string',
            'cash_bank_id'     => 'nullable|integer|exists:cash_banks,id',
            'asset_account_id' => 'required_with:cash_bank_id|nullable|integer|exists:accounts,id',
        ]);

        $asset = DB::transaction(function () use ($data, $request, $finance) {
            $asset = Asset::create([
                'code'             => $data['code'] ?? $this->nextCode(),
                'name'             => $data['name'],
                'category'         => $data['category'],
                'type'             => $data['type'] ?? null,
                'acquisition_date' => $data['acquisition_date'],
                'acquisition_cost' => $data['acquisition_cost'],
                'current_value'    => $data['current_value'] ?? null,
                'cash_bank_id'     => $data['cash_bank_id'] ?? null,
                'status'           => 'active',
                'notes'            => $data['notes'] ?? null,
            ]);

            if (! empty($data['cash_bank_id']) && (float) $data['acquisition_cost'] > 0) {
                $voucher = $finance->cashMovement(
                    request: $request,
                    cashBankId: (int) $data['cash_bank_id'],
                    counterAccountId: (int) $data['asset_account_id'],
                    direction: 'out',
                    amount: (float) $data['acquisition_cost'],
                    date: $data['acquisition_date'],
                    keterangan: 'Pembelian aset ' . $asset->code . ' - ' . $asset->name,
                    noReferensi: $asset->code
                );
                $asset->journal_voucher_id = $voucher->id;
                $asset->save();
            }

            return $asset;
        });

        return response()->json(['status' => 'success', 'message' => 'Aset berhasil disimpan', 'data' => $asset], 201);
    }

    public function update(Request $request, $id)
    {
        $asset = Asset::findOrFail($id);

        $data = $request->validate([
            'name'             => 'sometimes|required|string|max:191',
            'type'             => 'nullable|string|max:100',
            'current_value'    => 'nullable|numeric|min:0',
            'status'           => 'sometimes|in:active,sold,disposed',
            'notes'            => 'nullable|string',
            'category'         => 'sometimes|in:movable,immovable',
            // Nilai perolehan hanya boleh diubah kalau aset ini tidak punya jurnal
            'acquisition_cost' => 'sometimes|numeric|min:0',
            'acquisition_date' => 'sometimes|date',
        ]);

        if ($asset->journal_voucher_id && (isset($data['acquisition_cost']) || isset($data['acquisition_date']))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aset ini dibeli lewat jurnal. Nilai perolehan dan tanggal tidak dapat diubah. Hapus aset lalu input ulang.',
            ], 422);
        }

        $asset->update($data);

        return response()->json(['status' => 'success', 'message' => 'Aset berhasil diperbarui', 'data' => $asset->fresh()]);
    }

    public function destroy(Request $request, $id, FinanceJournalService $finance)
    {
        $asset = Asset::findOrFail($id);

        DB::transaction(function () use ($request, $asset, $finance) {
            if ($asset->journal_voucher_id) {
                $finance->reverse($request, (int) $asset->journal_voucher_id, 'Aset ' . $asset->code . ' dihapus');
            }
            $asset->delete();
        });

        return response()->json(['status' => 'success', 'message' => 'Aset berhasil dihapus']);
    }

    private function nextCode(): string
    {
        $last = Asset::where('code', 'like', 'AST-%')->orderByDesc('id')->value('code');
        $next = $last ? ((int) substr($last, 4)) + 1 : 1;
        return sprintf('AST-%04d', $next);
    }
}
