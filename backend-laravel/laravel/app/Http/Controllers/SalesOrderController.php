<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Support\Facades\DB;

class SalesOrderController extends Controller
{
    // 1. Menampilkan daftar semua Sales Order beserta item dan relasi quotation-nya
    public function index()
    {
        $salesOrders = SalesOrder::with(['quotation', 'items'])->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $salesOrders
        ], 200);
    }

    // 2. Menyimpan data Sales Order baru (biasanya di-generate setelah Quotation disetujui / Deal)
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            // Simpan Header Sales Order
            $salesOrder = SalesOrder::create([
                'quotation_id'     => $request->quotation_id,
                'so_number'        => $request->so_number,
                'client_po_number' => $request->client_po_number,
                'so_date'          => $request->so_date,
                'customer_name'    => $request->customer_name,
                'customer_address' => $request->customer_address,
                'model_unit'       => $request->model_unit,
                'status'           => 'Pending', // Status awal SO
                'sub_total'        => $request->sub_total,
                'tax_amount'       => $request->tax_amount,
                'grand_total'      => $request->grand_total,
            ]);

            // Simpan item-item barang/jasa ke Sales Order Items
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    SalesOrderItem::create([
                        'sales_order_id' => $salesOrder->id,
                        'part_number'    => $item['part_number'] ?? $item['product_id'] ?? null,
                        'description'    => $item['description'] ?? '-',
                        'qty'            => $item['qty'] ?? 1,
                        'unit'           => $item['unit'] ?? 'SET',
                        'unit_price'     => $item['unit_price'] ?? 0,
                        'amount'         => $item['amount'] ?? 0,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Sales Order berhasil dibuat!',
                'data' => $salesOrder->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat Sales Order: ' . $e->getMessage()
            ], 500);
        }
    }

    // 3. Men-generate Sales Order secara otomatis dari Purchase Order (PO)
    public function storeFromPO(Request $request, $poId)
    {
        $purchaseOrder = \App\Models\PurchaseOrder::with(['items', 'quotation.items'])->findOrFail($poId);

        DB::beginTransaction();

        try {
            $quotationItems = \App\Models\QuotationItem::where('quotation_id', $purchaseOrder->quotation_id)->get();
            $sourceItems = count($quotationItems) > 0 ? $quotationItems : $purchaseOrder->items;

            $subTotal = 0;
            foreach ($sourceItems as $item) {
                // Mendefinisikan variabel secara pasti sebelum dikalikan agar tidak ada nilai null
                $qty = $item->quantity ?? $item->qty ?? 1;
                $price = $item->unit_price ?? 0;
                $subTotal += $item->total_price ?? $item->amount ?? ($qty * $price);
            }

            $taxAmount = $subTotal * 0.11;
            $grandTotal = $subTotal + $taxAmount;

            $salesOrder = SalesOrder::create([
                'purchase_order_id' => $purchaseOrder->id,
                'quotation_id'      => $purchaseOrder->quotation_id,
                'so_number'         => 'SO-' . time(),
                'client_po_number'  => $purchaseOrder->customer_po_number,
                'so_date'           => now()->format('Y-m-d'),
                'customer_name'     => $purchaseOrder->customer_name ?? optional($purchaseOrder->quotation)->customer_name ?? 'Pelanggan',
                'customer_address'  => $purchaseOrder->customer_address ?? optional($purchaseOrder->quotation)->customer_address ?? '-',
                'model_unit'        => optional($purchaseOrder->quotation)->model_unit ?? '-',
                'status'            => 'Pending',
                'sub_total'         => $subTotal,
                'tax_amount'        => $taxAmount, 
                'grand_total'       => $grandTotal,
            ]);

            foreach ($sourceItems as $item) {
                // Menghitung amount per item dengan aman
                $qty = $item->quantity ?? $item->qty ?? 1;
                $price = $item->unit_price ?? 0;
                $amount = $item->total_price ?? $item->amount ?? ($qty * $price);

                SalesOrderItem::create([
                    'sales_order_id' => $salesOrder->id,
                    'part_number'    => $item->part_number ?? $item->product_id ?? '-',
                    'description'    => $item->description ?? $item->item_name ?? '-',
                    'qty'            => $qty,
                    'unit'           => $item->unit ?? 'SET',
                    'unit_price'     => $price,
                    'amount'         => $amount,
                ]);
            }

            $purchaseOrder->update(['status' => 'processed_to_so']);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Sales Order berhasil dibuat dari Purchase Order!',
                'data' => $salesOrder->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $salesOrder = \App\Models\SalesOrder::with('items')->find($id);

        if (!$salesOrder) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sales Order tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $salesOrder
        ], 200);
    }
}