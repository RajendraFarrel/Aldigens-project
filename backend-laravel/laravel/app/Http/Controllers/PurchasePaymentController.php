<?php

namespace App\Http\Controllers;

use App\Models\PurchasePayment;
use Illuminate\Http\Request;

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

    public function store(Request $request)
    {
        try {
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

            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran berhasil disimpan',
                'data' => $payment
            ], 201);

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

            $payment->update([
                'payment_no'        => $request->paymentNo ?? $request->payment_no ?? $payment->payment_no,
                'date'              => $request->date ?? $payment->date,
                'vendor_name'       => $request->vendorName ?? $request->vendor_name ?? $payment->vendor_name,
                'payment_method'    => $request->paymentMethod ?? $request->payment_method ?? $payment->payment_method,
                'amount'            => $request->amount ?? $payment->amount,
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

    public function destroy($id)
    {
        $payment = PurchasePayment::findOrFail($id);
        $payment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pembayaran berhasil dihapus'
        ]);
    }
}