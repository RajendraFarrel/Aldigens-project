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
    public function store(Request $request, \App\Services\DocumentNumberService $numberService)
    {
        $validated = $request->validate([
            'sales_order_id' => 'required|integer|exists:sales_orders,id',
            'do_number' => 'nullable|string|max:100',
            'do_date' => 'nullable|date',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'warehouse_location_id' => 'nullable|integer|exists:warehouse_locations,id',
            'items' => 'required|array|min:1',
            'items.*.sales_order_item_id' => 'nullable|integer|exists:sales_order_items,id',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.part_number' => 'nullable|string',
            'items.*.description' => 'required|string',
            'items.*.qty_sent' => 'required|integer|min:1',
            'items.*.unit' => 'nullable|string|max:50',
        ]);

        return DB::transaction(function () use ($request, $validated, $numberService) {
            $salesOrder = !empty($validated['sales_order_id'])
                ? \App\Models\SalesOrder::with('items')->lockForUpdate()->findOrFail($validated['sales_order_id'])
                : null;
            $now = now();
            $doNumber = $numberService->nextDeliveryOrderNumber($now);

            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id' => $salesOrder?->id,
                'do_number' => $doNumber,
                'so_number' => $salesOrder?->so_number ?? $request->input('so_number'),
                'ref_po' => $request->input('ref_po', $request->input('customer_po')),
                'do_date' => $request->input('do_date', $now->toDateString()),
                'customer_name' => $request->input('customer_name', $salesOrder?->customer_name),
                'delivery_address' => $request->input('delivery_address', $salesOrder?->customer_address),
                'vehicle_number' => $request->input('vehicle_number'),
                'driver_name' => $request->input('driver_name'),
                'status' => 'Shipped',
                'notes' => $request->input('notes'),
            ]);

            $pendingQuantities = [];
            foreach ($validated['items'] as $item) {
                $soItem = null;
                if (!empty($item['sales_order_item_id'])) {
                    $soItem = \App\Models\SalesOrderItem::query()
                        ->whereKey($item['sales_order_item_id'])
                        ->when($salesOrder, fn ($query) => $query->where('sales_order_id', $salesOrder->id))
                        ->firstOrFail();
                }
                $productId = $item['product_id'] ?? $soItem?->product_id;
                if ($soItem?->product_id && $productId && (int) $soItem->product_id !== (int) $productId) {
                    abort(422, 'Produk yang dipilih tidak sesuai dengan item Sales Order.');
                }
                if (!$productId && !empty($item['part_number'])) {
                    $customerPart = CustomerPartNumber::where('part_number', $item['part_number'])->first();
                    $product = Product::find($customerPart?->inventory_product_id)
                        ?? Product::where('part_number', $item['part_number'])
                            ->orWhere('barcode', $item['part_number'])
                            ->orWhere('product_code', $item['part_number'])
                            ->first();
                    $productId = $product?->id;
                }
                if ($salesOrder && !$soItem) {
                    $matches = $salesOrder->items->filter(function ($candidate) use ($productId, $item) {
                        return ($productId && (int) $candidate->product_id === (int) $productId)
                            || ($item['part_number'] ?? null) === $candidate->part_number;
                    });
                    if ($matches->count() === 1) {
                        $soItem = $matches->first();
                    }
                }
                if ($salesOrder && !$soItem) {
                    abort(422, 'Setiap item DO harus terkait dengan item pada Sales Order yang dipilih.');
                }
                if (!$productId) {
                    abort(422, 'Setiap item DO harus memiliki product_id yang valid atau part number yang terhubung ke produk Inventory.');
                }
                if ($soItem && $productId && $soItem->product_id && (int) $soItem->product_id !== (int) $productId) {
                    abort(422, 'Produk pada item DO tidak sesuai dengan item Sales Order.');
                }
                if (!$soItem) {
                    abort(422, 'Item DO tidak memiliki item Sales Order yang valid.');
                }
                if (!$soItem->product_id) {
                    $soItem->update(['product_id' => $productId]);
                }
                $orderedQuantity = (int) $soItem->qty;
                $alreadySent = DeliveryOrderItem::query()
                    ->where('sales_order_item_id', $soItem->id)
                    ->where('delivery_order_id', '<>', $deliveryOrder->id)
                    ->whereHas('deliveryOrder', fn ($query) => $query->where('status', '!=', 'Cancelled'))
                    ->sum('qty_sent');
                $pendingQuantities[$soItem->id] = ($pendingQuantities[$soItem->id] ?? 0) + (int) $item['qty_sent'];
                if ($alreadySent + $pendingQuantities[$soItem->id] > $orderedQuantity) {
                    abort(422, 'Jumlah barang DO melebihi kuantitas tersisa pada Sales Order.');
                }

                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'sales_order_item_id' => $soItem?->id,
                    'product_id' => $productId,
                    'part_number' => $item['part_number'] ?? $soItem?->part_number,
                    'description' => $item['description'],
                    'qty_sent' => $item['qty_sent'],
                    'unit' => $item['unit'] ?? 'SET',
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order berhasil dibuat. Stok hanya berkurang setelah DO di-approve.',
                'data' => $deliveryOrder->load(['salesOrder.items', 'items.product', 'items.salesOrderItem']),
            ], 201);
        });
    }

    /**
     * Approve Delivery Order dan kurangi stok inventory secara otomatis.
     */
    public function approve(Request $request, $id, InventoryStockService $stockService)
    {
        return DB::transaction(function () use ($request, $id, $stockService) {
            $deliveryOrder = DeliveryOrder::with('items')->lockForUpdate()->find($id);
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

            $existingStockMovement = \App\Models\InventoryTransaction::where('reference_type', 'DO')
                ->where('reference_id', $deliveryOrder->id)
                ->exists();
            if ($existingStockMovement) {
                throw new \RuntimeException('Mutasi stok untuk DO ini sudah tercatat; approval dihentikan untuk mencegah pengurangan ganda.');
            }

            foreach ($deliveryOrder->items as $item) {
                $product = $item->product;
                if (!$product && $item->part_number) {
                    $customerPart = CustomerPartNumber::where('part_number', $item->part_number)->first();
                    $product = Product::find($customerPart?->inventory_product_id)
                        ?? Product::where('part_number', $item->part_number)
                            ->orWhere('barcode', $item->part_number)
                            ->orWhere('product_code', $item->part_number)
                            ->first();
                }
                if (!$product) {
                    throw new \RuntimeException("Produk [{$item->part_number}] tidak ditemukan di Inventory.");
                }

                $stockService->adjust($product, (int) $item->qty_sent, 'KELUAR', [
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'warehouse_id' => $request->input('warehouse_id', $deliveryOrder->warehouse_id),
                    'warehouse_location_id' => $request->input('warehouse_location_id', $deliveryOrder->warehouse_location_id),
                    'reference_type' => 'DO',
                    'reference_id' => $deliveryOrder->id,
                    'reference_number' => $deliveryOrder->do_number,
                    'notes' => 'Approval Delivery Order ' . $deliveryOrder->do_number,
                ]);
            }

            $deliveryOrder->update(['status' => 'Approved']);

            return response()->json([
                'status' => 'success',
                'message' => 'Delivery Order berhasil di-approve dan stok Inventory otomatis berkurang sekali.',
                'data' => $deliveryOrder->load('items'),
            ], 200);
        });
    }
}