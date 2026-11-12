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
        $deliveryOrders = DeliveryOrder::with(['items'])->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $deliveryOrders
        ], 200);
    }

    // 2. Menampilkan detail satu Delivery Order (untuk cetak Surat Jalan & generate Invoice)
    public function show($id)
    {
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
     * Simpan Delivery Order (Surat Jalan) baru dengan pengecekan stok otomatis.
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
            // --- CEK APAKAH SEMUA STOK ITEM TERSEDIA ---
            $isStockAvailable = true;

            foreach ($request->items as $item) {
                $code = $item['part_number'];
                
                $customerPart = CustomerPartNumber::where('part_number', $code)->first();
                $product = $customerPart ? Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null) : null;

                if (!$product) {
                    $product = Product::where('part_number', $code)
                        ->orWhere('barcode', $code)
                        ->orWhere('product_code', $code)
                        ->orWhere('name', 'LIKE', '%' . $item['description'] . '%')
                        ->first();
                }

                $currentStock = $product ? ($product->stock ?? $product->stok ?? $product->quantity ?? 0) : 0;
                $requiredQty = (int) $item['qty_sent'];

                // Jika ada barang yang stoknya kurang atau tidak ditemukan, tandai stok tidak tersedia
                if (!$product || $currentStock < $requiredQty) {
                    $isStockAvailable = false;
                    break;
                }
            }

            // Tentukan status awal: 'Ready' jika barang ada, 'Waiting Production' jika kosong
            $initialStatus = $isStockAvailable ? 'Ready' : 'Waiting Production';

            // Simpan Header Delivery Order (Surat Jalan)
            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id'   => $request->sales_order_id,
                'do_number'        => $request->do_number,
                'so_number'        => $request->so_number ?? $request->sales_order_id, 
                'ref_po'           => $request->ref_po ?? $request->customer_po,
                'do_date'          => $request->do_date,
                'customer_name'    => $request->customer_name,
                'delivery_address' => $request->delivery_address,
                'vehicle_number'   => $request->vehicle_number,
                'driver_name'      => $request->driver_name,
                'status'           => $initialStatus,
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

            $message = $isStockAvailable 
                ? 'Delivery Order berhasil dibuat. Stok tersedia dan siap di-Approve!' 
                : 'Delivery Order dibuat. Stok kosong, dialihkan ke Waiting Production.';

            return response()->json([
                'status' => 'success',
                'message' => $message,
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

        if (in_array($deliveryOrder->status, ['Approved', 'Delivered', 'BAST Signed'], true)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order ini sudah di-approve sebelumnya.',
                'data' => $deliveryOrder,
            ], 200);
        }

        // --- TAHAP 1: VALIDASI KETERSEDIAAN STOK ---
        foreach ($deliveryOrder->items as $item) {
            $code = $item->part_number;
            if (!$code) continue;

            $product = null;

            // 1. Cari melalui CustomerPartNumber (Mapping Pelanggan)
            $customerPart = CustomerPartNumber::where('part_number', $code)->first();
            if ($customerPart) {
                $product = Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null);
            }

            // 2. Jika tidak ketemu di mapping, cari langsung berdasarkan part_number/barcode/product_code/name internal
            if (!$product) {
                $product = Product::where('part_number', $code)
                    ->orWhere('barcode', $code)
                    ->orWhere('product_code', $code)
                    ->orWhere('name', 'LIKE', '%' . $item->description . '%')
                    ->first();
            }

            if (!$product) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Part Number [{$code}] / Deskripsi [{$item->description}] tidak ditemukan di Master Inventory."
                ], 422);
            }

            $currentStock = $product->stock ?? $product->stok ?? $product->quantity ?? 0;
            $requiredQty = (int) $item->qty_sent;

            // JIKA STOK KURANG
            if ($currentStock < $requiredQty) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Stok tidak mencukupi untuk '{$product->name}'. Stok gudang: {$currentStock}, dibutuhkan: {$requiredQty}. Silakan buat Work Order jika ingin memproduksi."
                ], 422);
            }
        }

        // --- TAHAP 2: EKSEKUSI APPROVAL & POTONG STOK ---
        return DB::transaction(function () use ($request, $deliveryOrder, $stockService) {
            foreach ($deliveryOrder->items as $item) {
                $code = $item->part_number;
                if (!$code) continue;

                $customerPart = CustomerPartNumber::where('part_number', $code)->first();
                $product = $customerPart ? Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null) : null;

                if (!$product) {
                    $product = Product::where('part_number', $code)
                        ->orWhere('barcode', $code)
                        ->orWhere('product_code', $code)
                        ->orWhere('name', 'LIKE', '%' . $item->description . '%')
                        ->first();
                }

                // Kurangi stok menggunakan InventoryStockService
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