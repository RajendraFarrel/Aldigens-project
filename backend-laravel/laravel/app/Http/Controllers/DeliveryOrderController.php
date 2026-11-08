<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\Product;
use App\Models\CustomerPartNumber;
use App\Services\InventoryStockService;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    // 1. Menampilkan daftar semua Delivery Order beserta item dan relasinya
    public function index()
    {
        // PERBAIKAN: Hapus relasi 'salesOrder' agar tidak memicu Error 500 (API Offline)
        $deliveryOrders = DeliveryOrder::with(['items'])->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $deliveryOrders
        ], 200);
    }

    // 2. Menampilkan detail satu Delivery Order (untuk cetak Surat Jalan & generate Invoice)
    public function show($id)
    {
        // PERBAIKAN: Hapus relasi 'salesOrder.items' agar tidak memicu Error 500
        $deliveryOrder = DeliveryOrder::with(['items'])->find($id);

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

    /**
     * Simpan Delivery Order (Surat Jalan) baru.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'nullable', 
            'do_number' => 'required|string|max:100|unique:delivery_orders,do_number',
            'do_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.part_number' => 'required|string',
            'items.*.description' => 'required|string',
            'items.*.qty_sent' => 'required|integer|min:1',
            'items.*.unit' => 'nullable|string|max:50',
        ]);
        
        DB::beginTransaction();

        try {
            // Simpan Header Delivery Order (Surat Jalan)
            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id'   => $request->sales_order_id,
                'do_number'        => $request->do_number,
                
                // PERBAIKAN: Menangkap dan menyimpan No. SO dan No. PO Pelanggan
                'so_number'        => $request->so_number ?? $request->sales_order_id, 
                'ref_po'           => $request->ref_po ?? $request->customer_po,
                
                'do_date'          => $request->do_date,
                'customer_name'    => $request->customer_name,
                'delivery_address' => $request->delivery_address,
                'vehicle_number'   => $request->vehicle_number,
                'driver_name'      => $request->driver_name,
                'status'           => 'Shipped',
                'notes'            => $request->notes,
            ]);

            // Simpan item-item barang yang dikirim
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    DeliveryOrderItem::create([
                        'delivery_order_id' => $deliveryOrder->id,
                        'part_number'       => $item['part_number'] ?? null,
                        'description'       => $item['description'],
                        'qty_sent'          => $item['qty_sent'],
                        'unit'              => $item['unit'] ?? 'SET',
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order berhasil dibuat. Stok akan berkurang setelah DO di-approve.',
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

    /**
     * Approve Delivery Order dan kurangi stok inventory secara otomatis.
     */
    public function approve(Request $request, $id, InventoryStockService $stockService)
    {
        $deliveryOrder = DeliveryOrder::with('items')->find($id);

        if (!$deliveryOrder) {
            return response()->json(['status' => 'error', 'message' => 'Delivery Order tidak ditemukan.'], 404);
        }

        if (in_array($deliveryOrder->status, ['Approved', 'Delivered'], true)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order ini sudah di-approve sebelumnya.',
                'data' => $deliveryOrder,
            ], 200);
        }

        return DB::transaction(function () use ($request, $deliveryOrder, $stockService) {
            foreach ($deliveryOrder->items as $item) {
                $code = $item->part_number;
                if (!$code) {
                    continue;
                }

                $product = null;

                // 1. Cek melalui tabel CustomerPartNumber (pencocokan berdasarkan kolom part_number saja)
                $customerPart = CustomerPartNumber::where('part_number', $code)->first();

                if ($customerPart) {
                    $product = Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null);
                }

                // 2. Jika tidak ketemu, cari langsung berdasarkan part_number/product_code internal produk
                if (!$product) {
                    $product = Product::where('part_number', $code)
                        ->orWhere('barcode', $code)
                        ->orWhere('product_code', $code)
                        ->first();
                }

                if (!$product) {
                    throw new \RuntimeException("Part Number [{$code}] tidak ditemukan di Inventory maupun Mapping Customer.");
                }

                // Kurangi stok + catat mutasi KELUAR.
                $stockService->adjust($product, (int) $item->qty_sent, 'KELUAR', [
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'warehouse_id' => $request->input('warehouse_id'),
                    'warehouse_location_id' => $request->input('warehouse_location_id'),
                    'reference_type' => 'DO',
                    'reference_id' => $deliveryOrder->id,
                    'reference_number' => $deliveryOrder->do_number,
                    'notes' => 'Approval Delivery Order ' . $deliveryOrder->do_number,
                ]);
            }

            $deliveryOrder->update(['status' => 'Approved']);

            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order berhasil di-approve dan stok Inventory otomatis berkurang!',
                'data' => $deliveryOrder->load('items'),
            ], 200);
        });
    }
}