<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\Inventory;
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

    // 2. Menyimpan Delivery Order baru dan otomatis memotong stok inventaris gudang
    public function store(Request $request)
    {
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

                    // Otomatis kurangi stok di tabel inventories jika part_number ditemukan
                    if (!empty($item['part_number'])) {
                        $inventory = Inventory::where('part_number', $item['part_number'])->first();
                        if ($inventory) {
                            $inventory->stock_quantity -= $item['qty_sent'];
                            $inventory->save();
                        }
                    }
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
