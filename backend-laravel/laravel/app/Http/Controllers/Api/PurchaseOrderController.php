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
    public function index()
    {
        $pos = PurchaseOrder::with('items')->latest()->get();
        return response()->json($pos); 
    }

    // === TAMBAHKAN FUNGSI STORE INI UNTUK MENANGKAP INPUT PO BARU DARI REACT ===
    public function store(Request $request)
    {
        $request->validate([
            'po_number' => 'required|string',
            'date' => 'required|date',
            'customer_name' => 'required|string',
            'items' => 'required|array|min:1',
        ]);

        try {
            DB::beginTransaction();

            // 1. Buat data PO utama (menyesuaikan field dari React & database)
            $purchaseOrder = PurchaseOrder::create([
                'po_number' => $request->po_number,
                'customer_po_number' => $request->customer_po_number ?? $request->po_number,
                'date' => $request->date,
                'po_date' => $request->date,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address ?? '-',
                'subject' => $request->subject ?? '-',
                'terms' => $request->terms ?? 'FOB',
                'ship_via' => $request->ship_via ?? '-',
                'tax_percentage' => $request->tax_percentage ?? 0,
                'sub_total' => $request->sub_total ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'grand_total' => $request->grand_total ?? 0,
                'status' => $request->status ?? 'Pending',
            ]);

            // 2. Simpan item-item PO ke tabel purchase_order_items
            foreach ($request->items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item['product_id'] ?? null,
                    'part_number' => $item['part_number'] ?? 'PART-GENERAL',
                    'description' => $item['description'] ?? '-',
                    'qty' => $item['qty'] ?? 1,
                    'quantity' => $item['qty'] ?? 1, // Mengcover berbagai variasi nama kolom database
                    'unit' => $item['unit'] ?? 'PCS',
                    'unit_price' => $item['unit_price'] ?? 0,
                    'total_price' => ($item['qty'] ?? 1) * ($item['unit_price'] ?? 0),
                    'amount' => ($item['qty'] ?? 1) * ($item['unit_price'] ?? 0),
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Purchase Order baru berhasil disimpan ke database!',
                'data' => $purchaseOrder->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menyimpan Purchase Order',
                'error' => $e->getMessage()
            ], 500);
        }
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