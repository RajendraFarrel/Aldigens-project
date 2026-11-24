<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PurchasePaymentController extends Controller
{
    public function index()
    {
        $payments = PurchasePayment::latest()->get();
        return response()->json([
            'status' => 'success',
            'data'   => $payments,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'date'   => 'required|date',
        ]);

        try {
            $payment = DB::transaction(function () use ($request) {
                $invoiceRef = $request->invoice_reference ?? $request->invoice_no;

                $payment = PurchasePayment::create([
                    'payment_no'        => $request->paymentNo ?? $request->payment_no ?? ('PP-' . rand(100000, 999999)),
                    'date'              => $request->date,
                    'vendor_name'       => $request->vendorName ?? $request->vendor_name,
                    'payment_method'    => $request->paymentMethod ?? $request->payment_method,
                    'amount'            => $request->amount,
                    'notes'             => $request->notes,
                    'invoice_reference' => $invoiceRef,
                ]);

                $this->syncInvoiceStatus($invoiceRef);

                return $payment;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Pembayaran berhasil disimpan',
                'data'    => $payment,
            ], 201);
        } catch (ValidationException|HttpResponseException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan ke database: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $payment = PurchasePayment::findOrFail($id);
            $oldInvoiceRef = $payment->invoice_reference;
            $newInvoiceRef = $request->invoice_reference ?? $payment->invoice_reference;

            DB::transaction(function () use ($request, $payment, $oldInvoiceRef, $newInvoiceRef) {
                $payment->update([
                    'payment_no'        => $request->paymentNo ?? $request->payment_no ?? $payment->payment_no,
                    'date'              => $request->date ?? $payment->date,
                    'vendor_name'       => $request->vendorName ?? $request->vendor_name ?? $payment->vendor_name,
                    'payment_method'    => $request->paymentMethod ?? $request->payment_method ?? $payment->payment_method,
                    'amount'            => $request->amount ?? $payment->amount,
                    'notes'             => $request->notes ?? $payment->notes,
                    'invoice_reference' => $newInvoiceRef,
                ]);

                $this->syncInvoiceStatus($oldInvoiceRef);
                if ($newInvoiceRef && $newInvoiceRef !== $oldInvoiceRef) {
                    $this->syncInvoiceStatus($newInvoiceRef);
                }
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Pembayaran berhasil diperbarui',
                'data'    => $payment->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengupdate database: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        $payment = PurchasePayment::findOrFail($id);
        $invoiceRef = $payment->invoice_reference;

        DB::transaction(function () use ($payment, $invoiceRef) {
            $payment->delete();
            $this->syncInvoiceStatus($invoiceRef);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Pembayaran berhasil dihapus',
        ]);
    }

    private function syncInvoiceStatus(?string $invoiceNumber): void
    {
        if (empty($invoiceNumber)) {
            return;
        }

        $invoice = PurchaseInvoice::where('invoice_number', $invoiceNumber)->first();
        if (!$invoice) {
            return;
        }

        $totalPaid  = (float) PurchasePayment::where('invoice_reference', $invoiceNumber)->sum('amount');
        $grandTotal = (float) ($invoice->grand_total ?? $invoice->total_amount ?? $invoice->amount ?? 0);

        if ($totalPaid <= 0) {
            $status = 'Unpaid';
        } elseif ($grandTotal > 0 && $totalPaid >= $grandTotal) {
            $status = 'Paid';
        } else {
            $status = 'Partial';
        }

        $updateData = ['status' => $status];
        if (Schema::hasColumn('purchase_invoices', 'paid_amount')) {
            $updateData['paid_amount'] = $totalPaid;
        }

        $invoice->update($updateData);
    }
}