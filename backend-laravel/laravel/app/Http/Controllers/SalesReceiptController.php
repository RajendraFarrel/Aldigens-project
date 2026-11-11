<?php

namespace App\Http\Controllers;

use App\Models\SalesReceipt;
use App\Services\FinanceJournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class SalesReceiptController extends Controller
{
    // Mengambil semua data untuk ditampilkan di tabel React
    public function index()
    {
        $receipts = SalesReceipt::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $receipts
        ]);
    }

    // Menyimpan data baru + mencatat jurnal uang masuk (Debit Kas/Bank, Kredit akun lawan)
    public function store(Request $request, FinanceJournalService $finance)
    {
        $validated = $request->validate([
            'form_no'          => 'required|unique:sales_receipts',
            'payment_date'     => 'required|date',
            'bill_to_no'       => 'nullable|string',
            'name'             => 'required|string',
            'cheque_no'        => 'nullable|string',
            'cheque_date'      => 'nullable|date',
            'amount'           => 'required|numeric|min:0.01',
            'reconciled'       => 'boolean',
            'description'      => 'nullable|string',
            'cash_bank_id'     => 'required|integer|exists:cash_banks,id',   // uang masuk ke Kas/Bank mana
            'lawan_account_id' => 'required|integer|exists:accounts,id',     // akun lawan, mis. Piutang Usaha
        ]);

        $receipt = DB::transaction(function () use ($validated, $request, $finance) {
            $receipt = SalesReceipt::create(Arr::except($validated, ['cash_bank_id', 'lawan_account_id']));

            $voucher = $finance->cashMovement(
                request: $request,
                cashBankId: (int) $validated['cash_bank_id'],
                counterAccountId: (int) $validated['lawan_account_id'],
                direction: 'in',
                amount: (float) $validated['amount'],
                date: $validated['payment_date'],
                keterangan: 'Penerimaan penjualan ' . $validated['form_no'] . ' - ' . $validated['name'],
                noReferensi: $validated['form_no'],
                pihak: $validated['name']
            );

            // Diisi langsung (tidak lewat $fillable) agar tidak perlu mengubah model
            $receipt->cash_bank_id = $validated['cash_bank_id'];
            $receipt->journal_voucher_id = $voucher->id;
            $receipt->save();

            return $receipt;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Penerimaan Penjualan (Receipt) berhasil dibuat',
            'data' => $receipt
        ], 201);
    }
}
