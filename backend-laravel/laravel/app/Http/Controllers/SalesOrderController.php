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
                        'part_number'    => $item['part_number'] ?? null,
                        'description'    => $item['description'],
                        'qty'            => $item['qty'],
                        'unit'           => $item['unit'] ?? 'SET',
                        'unit_price'     => $item['unit_price'],
                        'amount'         => $item['amount'],
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

    public function show($id)
    {
        // Sesuaikan 'items' dengan nama relasi di model SalesOrder Anda (misalnya 'salesOrderItems' atau 'items')
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
