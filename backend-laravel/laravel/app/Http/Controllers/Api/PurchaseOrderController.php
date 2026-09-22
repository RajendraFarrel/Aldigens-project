<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    // === TARUH FUNGSI INDEX DI SINI (DI ATAS ATAU DI BAWAH storeFromQuotation) ===
    public function index()
    {
        $pos = PurchaseOrder::with('items')->latest()->get();
        return response()->json($pos); 
    }

    public function storeFromQuotation(Request $request, $quotationId)
    {
        $quotation = Quotation::with('items')->findOrFail($quotationId);

        // Validasi input nomor PO dari customer
        $request->validate([
            'customer_po_number' => 'required|string|unique:purchase_orders,customer_po_number',
            'po_date' => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            // 1. Buat data PO utama
            $purchaseOrder = PurchaseOrder::create([
                'quotation_id' => $quotation->id,
                'customer_po_number' => $request->customer_po_number,
                'po_date' => $request->po_date,
                'customer_name' => $quotation->customer_name,
                'customer_address' => $quotation->customer_address,
                'sub_total' => $quotation->sub_total,
                'tax_amount' => $quotation->tax_amount,
                'grand_total' => $quotation->grand_total,
                'status' => 'confirmed',
                'notes' => $request->notes,
            ]);

            // 2. Salin item dari quotation_items ke purchase_order_items
            foreach ($quotation->items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item->product_id ?? null,
                    'description' => $item->description,
                    'quantity' => $item->qty,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->amount,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Purchase Order berhasil dibuat dari Quotation!',
                'data' => $purchaseOrder->load('items')
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal membuat Purchase Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}