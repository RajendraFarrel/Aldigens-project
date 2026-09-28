<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\Product;
use App\Services\InventoryStockService;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    // 1. Menampilkan daftar semua Delivery Order beserta item dan relasinya
    public function index()
    {
        $deliveryOrders = DeliveryOrder::with(['salesOrder', 'items'])->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $deliveryOrders
        ], 200);
    }

    // 2. Menampilkan detail satu Delivery Order (untuk cetak Surat Jalan & generate Invoice)
    public function show($id)
    {
        $deliveryOrder = DeliveryOrder::with(['salesOrder.items', 'items'])->find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Delivery Order tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $deliveryOrder,
        ], 200);
    }

    // 3. Menyimpan Delivery Order baru dan otomatis memotong stok inventaris gudang
    public function store(Request $request, InventoryStockService $stockService)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'do_number' => 'required|string|max:100|unique:delivery_orders,do_number',
            'do_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.part_number' => 'required|string',
            'items.*.description' => 'required|string',
            'items.*.qty_sent' => 'required|integer|min:1',
            'items.*.unit' => 'nullable|string|max:50',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'warehouse_location_id' => 'nullable|exists:warehouse_locations,id',
        ]);
        DB::beginTransaction();

        try {
            // Simpan Header Delivery Order (Surat Jalan)
            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id'   => $request->sales_order_id,
                'do_number'        => $request->do_number,
                'do_date'          => $request->do_date,
                'customer_name'    => $request->customer_name,
                'delivery_address' => $request->delivery_address,
                'vehicle_number'   => $request->vehicle_number,
                'driver_name'      => $request->driver_name,
                'status'           => 'Shipped',
                'notes'            => $request->notes,
            ]);

            // Simpan item-item barang yang dikirim & kurangi stok inventaris
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    DeliveryOrderItem::create([
                        'delivery_order_id' => $deliveryOrder->id,
                        'part_number'       => $item['part_number'] ?? null,
                        'description'       => $item['description'],
                        'qty_sent'          => $item['qty_sent'],
                        'unit'              => $item['unit'] ?? 'SET',
                    ]);

                    $product = Product::where('part_number', $item['part_number'])
                        ->orWhere('barcode', $item['part_number'])
                        ->orWhere('product_code', $item['part_number'])
                        ->first();
                    if (!$product) {
                        throw new \RuntimeException("Part Number {$item['part_number']} tidak ditemukan.");
                    }
                    $stockService->adjust($product, (int) $item['qty_sent'], 'KELUAR', [
                        'user_id' => $request->user()?->id,
                        'user_name' => $request->user()?->name,
                        'warehouse_id' => $request->warehouse_id,
                        'warehouse_location_id' => $request->warehouse_location_id,
                        'reference_type' => 'DO',
                        'reference_id' => $deliveryOrder->id,
                        'reference_number' => $deliveryOrder->do_number,
                        'notes' => $request->notes,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order berhasil dibuat dan stok gudang berhasil diperbarui!',
                'data' => $deliveryOrder->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat Delivery Order: ' . $e->getMessage()
            ], 500);
        }
    }
}
