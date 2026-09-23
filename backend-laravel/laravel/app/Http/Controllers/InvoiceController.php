<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\DeliveryOrder;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    /**
     * 1. Daftar semua Invoice beserta relasi SO, DO, dan item.
     */
    public function index()
    {
        $invoices = Invoice::with(['salesOrder', 'deliveryOrder', 'items'])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $invoices,
        ], 200);
    }

    /**
     * 2. Terbitkan Invoice baru dari Sales Order (harga) + Delivery Order (bukti kirim).
     *    Rincian item ditarik dari SO, dan qty divalidasi terhadap DO (barang benar-benar dikirim).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sales_order_id'    => 'required|exists:sales_orders,id',
            'delivery_order_id' => 'nullable|exists:delivery_orders,id',
            'invoice_number'    => 'nullable|string|unique:invoices,invoice_number',
            'invoice_date'      => 'nullable|date',
            'due_date'          => 'nullable|date',
            'tax_percentage'    => 'nullable|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        $salesOrder = SalesOrder::with('items')->findOrFail($validated['sales_order_id']);

        $deliveryOrder = null;
        if (!empty($validated['delivery_order_id'])) {
            $deliveryOrder = DeliveryOrder::with('items')->find($validated['delivery_order_id']);
        }

        DB::beginTransaction();

        try {
            $taxPercentage = $validated['tax_percentage'] ?? 0;

            $invoice = Invoice::create([
                'sales_order_id'    => $salesOrder->id,
                'delivery_order_id' => $deliveryOrder?->id,
                'invoice_number'    => $validated['invoice_number']
                    ?? ('INV-' . date('Ymd') . '-' . str_pad((string) (Invoice::count() + 1), 4, '0', STR_PAD_LEFT)),
                'invoice_date'      => $validated['invoice_date'] ?? now()->format('Y-m-d'),
                'due_date'          => $validated['due_date'] ?? now()->addDays(14)->format('Y-m-d'),
                'customer_name'     => $salesOrder->customer_name,
                'customer_address'  => $salesOrder->customer_address,
                'so_number'         => $salesOrder->so_number,
                'do_number'         => $deliveryOrder?->do_number,
                'sub_total'         => 0,
                'tax_percentage'    => $taxPercentage,
                'tax_amount'        => 0,
                'grand_total'       => 0,
                'status'            => 'Unpaid',
                'notes'             => $validated['notes'] ?? null,
            ]);

            // Tarik rincian harga dari item Sales Order
            $subTotal = 0;
            foreach ($salesOrder->items as $soItem) {
                $qty   = (int) ($soItem->qty ?? 1);
                $price = (float) ($soItem->unit_price ?? 0);

                // Validasi terhadap bukti pengiriman (DO) bila ada
                if ($deliveryOrder) {
                    $doItem = $deliveryOrder->items->firstWhere('part_number', $soItem->part_number);
                    if ($doItem) {
                        // Tagih sebesar qty yang benar-benar dikirim
                        $qty = (int) $doItem->qty_sent;
                    }
                }

                $amount    = $qty * $price;
                $subTotal += $amount;

                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'part_number' => $soItem->part_number,
                    'description' => $soItem->description ?? '-',
                    'qty'         => $qty,
                    'unit'        => $soItem->unit ?? 'SET',
                    'unit_price'  => $price,
                    'amount'      => $amount,
                ]);
            }

            $taxAmount  = $subTotal * ($taxPercentage / 100);
            $grandTotal = $subTotal + $taxAmount;

            $invoice->update([
                'sub_total'   => $subTotal,
                'tax_amount'  => $taxAmount,
                'grand_total' => $grandTotal,
            ]);

            // Tandai SO sudah ditagihkan
            $salesOrder->update(['status' => 'Invoiced']);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Invoice berhasil diterbitkan!',
                'data'    => $invoice->load('items'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menerbitkan Invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 3. Detail satu Invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['salesOrder', 'deliveryOrder.items', 'items'])->find($id);

        if (!$invoice) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invoice tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $invoice,
        ], 200);
    }

    /**
     * 4. Ubah status pembayaran Invoice (Unpaid / Paid / Cancelled).
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Unpaid,Paid,Cancelled',
        ]);

        $invoice = Invoice::find($id);

        if (!$invoice) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invoice tidak ditemukan.',
            ], 404);
        }

        $invoice->update(['status' => $validated['status']]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Status Invoice berhasil diperbarui.',
            'data'    => $invoice->load('items'),
        ], 200);
    }
}
