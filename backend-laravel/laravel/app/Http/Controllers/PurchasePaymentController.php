<?php

namespace App\Http\Controllers;

use App\Models\PurchasePayment;
use App\Services\FinanceJournalService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchasePaymentController extends Controller
{
    public function index()
    {
        $payments = PurchasePayment::latest()->get();
        return response()->json([
            'status' => 'success',
            'data' => $payments
        ]);
    }

    public function store(Request $request, FinanceJournalService $finance)
    {
        // Validasi di luar try supaya tetap 422 (bukan 500)
        $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'date'             => 'required|date',
            'cash_bank_id'     => 'required|integer|exists:cash_banks,id',   // uang keluar dari Kas/Bank mana
            'lawan_account_id' => 'required|integer|exists:accounts,id',     // akun lawan, mis. Utang Usaha
        ]);

        try {
            $payment = DB::transaction(function () use ($request, $finance) {
                // Memaksa format snake_case agar diterima oleh tabel MySQL
                $payment = PurchasePayment::create([
                    'payment_no'        => $request->paymentNo ?? $request->payment_no,
                    'date'              => $request->date,
                    'vendor_name'       => $request->vendorName ?? $request->vendor_name,
                    'payment_method'    => $request->paymentMethod ?? $request->payment_method,
                    'amount'            => $request->amount,
                    'notes'             => $request->notes,
                    'invoice_reference' => $request->invoice_reference ?? $request->invoice_no
                ]);

                $voucher = $finance->cashMovement(
                    request: $request,
                    cashBankId: (int) $request->cash_bank_id,
                    counterAccountId: (int) $request->lawan_account_id,
                    direction: 'out',
                    amount: (float) $request->amount,
                    date: $request->date,
                    keterangan: 'Pembayaran pembelian ' . $payment->payment_no . ' - ' . ($payment->vendor_name ?? ''),
                    noReferensi: $payment->payment_no,
                    pihak: $payment->vendor_name
                );

                $payment->cash_bank_id = $request->cash_bank_id;
                $payment->journal_voucher_id = $voucher->id;
                $payment->save();

                return $payment;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran berhasil disimpan',
                'data' => $payment
            ], 201);

        } catch (ValidationException|HttpResponseException $e) {
            throw $e; // biarkan Laravel membalas 422, jangan dijadikan 500
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan ke database: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $payment = PurchasePayment::findOrFail($id);

            // Jurnal yang sudah POSTED terkunci. Nominal/tanggal/Kas-Bank tidak boleh
            // diubah diam-diam; hapus pembayaran (otomatis reversal) lalu input ulang.
            if ($payment->journal_voucher_id) {
                $berubah = ($request->filled('amount') && (float) $request->amount != (float) $payment->amount)
                    || ($request->filled('date') && substr((string) $request->date, 0, 10) !== substr((string) $payment->date, 0, 10))
                    || ($request->filled('cash_bank_id') && (int) $request->cash_bank_id !== (int) $payment->cash_bank_id);

                if ($berubah) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Pembayaran ini sudah tercatat di jurnal. Nominal, tanggal, dan Kas/Bank tidak dapat diubah. Hapus pembayaran ini lalu input ulang.'
                    ], 422);
                }
            }

            $payment->update([
                'payment_no'        => $request->paymentNo ?? $request->payment_no ?? $payment->payment_no,
                'date'              => $payment->journal_voucher_id ? $payment->date : ($request->date ?? $payment->date),
                'vendor_name'       => $request->vendorName ?? $request->vendor_name ?? $payment->vendor_name,
                'payment_method'    => $request->paymentMethod ?? $request->payment_method ?? $payment->payment_method,
                'amount'            => $payment->journal_voucher_id ? $payment->amount : ($request->amount ?? $payment->amount),
                'notes'             => $request->notes ?? $payment->notes,
                'invoice_reference' => $request->invoice_reference ?? $payment->invoice_reference
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran berhasil diperbarui',
                'data' => $payment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengupdate database: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $id, FinanceJournalService $finance)
    {
        $payment = PurchasePayment::findOrFail($id);

        DB::transaction(function () use ($request, $payment, $finance) {
            if ($payment->journal_voucher_id) {
                $finance->reverse($request, (int) $payment->journal_voucher_id, 'Pembayaran ' . $payment->payment_no . ' dihapus');
            }
            $payment->delete();
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Pembayaran berhasil dihapus'
        ]);
    }
}
