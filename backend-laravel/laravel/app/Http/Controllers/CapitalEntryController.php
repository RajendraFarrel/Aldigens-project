<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\CapitalEntry;
use App\Services\FinanceJournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CapitalEntryController extends Controller
{
    public function index()
    {
        $entries = CapitalEntry::orderByDesc('entry_date')->orderByDesc('id')->get();

        $total = $entries->sum(fn ($e) => $e->type === 'withdrawal' ? -$e->amount : $e->amount);

        return response()->json([
            'status' => 'success',
            'total_modal' => (float) $total,
            'data' => $entries,
        ]);
    }

    /**
     * initial / addition : Debit Kas/Bank, Kredit akun Ekuitas (Modal)
     * withdrawal         : Debit akun Ekuitas, Kredit Kas/Bank
     *
     * PENTING: kalau modal awal sudah masuk ke saldo awal Kas/Bank, JANGAN isi
     * cash_bank_id. Cukup dicatat sebagai riwayat supaya saldo tidak dihitung dua kali.
     */
    public function store(Request $request, FinanceJournalService $finance)
    {
        $data = $request->validate([
            'entry_date'       => 'required|date',
            'type'             => 'required|in:initial,addition,withdrawal',
            'amount'           => 'required|numeric|min:0.01',
            'description'      => 'nullable|string|max:255',
            'cash_bank_id'     => 'nullable|integer|exists:cash_banks,id',
            'lawan_account_id' => 'required_with:cash_bank_id|nullable|integer|exists:accounts,id',
        ]);

        if (! empty($data['cash_bank_id'])) {
            $equity = Account::find($data['lawan_account_id']);
            if (! $equity || $equity->tipe_akun !== 'Ekuitas') {
                throw ValidationException::withMessages([
                    'lawan_account_id' => 'Akun lawan untuk modal harus bertipe Ekuitas.',
                ]);
            }
        }

        $entry = DB::transaction(function () use ($data, $request, $finance) {
            $entry = CapitalEntry::create([
                'entry_date'   => $data['entry_date'],
                'type'         => $data['type'],
                'amount'       => $data['amount'],
                'cash_bank_id' => $data['cash_bank_id'] ?? null,
                'description'  => $data['description'] ?? null,
            ]);

            if (! empty($data['cash_bank_id'])) {
                $label = ['initial' => 'Modal awal', 'addition' => 'Tambahan modal', 'withdrawal' => 'Penarikan modal'][$data['type']];

                $voucher = $finance->cashMovement(
                    request: $request,
                    cashBankId: (int) $data['cash_bank_id'],
                    counterAccountId: (int) $data['lawan_account_id'],
                    direction: $data['type'] === 'withdrawal' ? 'out' : 'in',
                    amount: (float) $data['amount'],
                    date: $data['entry_date'],
                    keterangan: $label . ($data['description'] ? ' - ' . $data['description'] : '')
                );
                $entry->journal_voucher_id = $voucher->id;
                $entry->save();
            }

            return $entry;
        });

        return response()->json(['status' => 'success', 'message' => 'Data modal berhasil disimpan', 'data' => $entry], 201);
    }

    // Tidak ada update: koreksi dilakukan dengan hapus (otomatis reversal) lalu input ulang
    public function destroy(Request $request, $id, FinanceJournalService $finance)
    {
        $entry = CapitalEntry::findOrFail($id);

        DB::transaction(function () use ($request, $entry, $finance) {
            if ($entry->journal_voucher_id) {
                $finance->reverse($request, (int) $entry->journal_voucher_id, 'Data modal dihapus');
            }
            $entry->delete();
        });

        return response()->json(['status' => 'success', 'message' => 'Data modal berhasil dihapus']);
    }
}
