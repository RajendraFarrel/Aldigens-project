<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Product;
use App\Models\CustomerPartNumber;
use App\Models\InventoryTransaction;
use App\Services\InventoryStockService;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    // 1. Menampilkan daftar semua Delivery Order beserta item dan relasinya
    public function index()
    {
        $deliveryOrders = DeliveryOrder::with(['items', 'salesOrder'])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $deliveryOrders,
        ], 200);
    }

    // 2. Menampilkan detail satu Delivery Order (untuk cetak Surat Jalan & generate Invoice)
    public function show($id)
    {
        $deliveryOrder = DeliveryOrder::with(['items', 'salesOrder'])->find($id);

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
     * 3. Simpan Delivery Order (Surat Jalan) baru dengan pengecekan stok otomatis.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sales_order_id'              => 'nullable|integer|exists:sales_orders,id',
            'do_number'                   => 'nullable|string|max:100',
            'so_number'                   => 'nullable|string|max:100',
            'ref_po'                      => 'nullable|string|max:100',
            'customer_po'                 => 'nullable|string|max:100',
            'do_date'                     => 'nullable|date',
            'customer_name'               => 'nullable|string|max:255',
            'delivery_address'            => 'nullable|string',
            'vehicle_number'              => 'nullable|string|max:100',
            'driver_name'                 => 'nullable|string|max:100',
            'notes'                       => 'nullable|string',
            'warehouse_id'                => 'nullable|integer|exists:warehouses,id',
            'warehouse_location_id'       => 'nullable|integer|exists:warehouse_locations,id',
            'items'                       => 'required|array|min:1',
            'items.*.sales_order_item_id' => 'nullable|integer|exists:sales_order_items,id',
            'items.*.product_id'          => 'nullable|integer|exists:products,id',
            'items.*.part_number'         => 'nullable|string',
            'items.*.description'         => 'required|string',
            'items.*.qty_sent'            => 'required|integer|min:1',
            'items.*.unit'                => 'nullable|string|max:50',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $salesOrder = !empty($validated['sales_order_id'])
                ? SalesOrder::with('items')->lockForUpdate()->findOrFail($validated['sales_order_id'])
                : null;

            $now = now();
            $doNumber = $validated['do_number'] ?? ('DO-' . $now->format('ym') . '-' . rand(1000, 9999));

            // Cek ketersediaan stok semua item
            $isStockAvailable = true;
            $resolvedItems = [];
            $pendingQuantities = [];

            foreach ($validated['items'] as $item) {
                $soItem = null;
                if (!empty($item['sales_order_item_id'])) {
                    $soItem = SalesOrderItem::query()
                        ->whereKey($item['sales_order_item_id'])
                        ->when($salesOrder, fn ($query) => $query->where('sales_order_id', $salesOrder->id))
                        ->firstOrFail();
                }

                $code = $item['part_number'] ?? $soItem?->part_number ?? null;
                $product = null;

                if (!empty($item['product_id'])) {
                    $product = Product::find($item['product_id']);
                } elseif ($soItem?->product_id) {
                    $product = Product::find($soItem->product_id);
                }

                if (!$product && $code) {
                    $customerPart = CustomerPartNumber::where('part_number', $code)->first();
                    if ($customerPart) {
                        $product = Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null);
                    }
                    if (!$product) {
                        $product = Product::where('part_number', $code)
                            ->orWhere('barcode', $code)
                            ->orWhere('product_code', $code)
                            ->first();
                    }
                }

                if (!$product && !empty($item['description']) && $item['description'] !== '-') {
                    $product = Product::where('name', 'LIKE', '%' . $item['description'] . '%')->first();
                }

                $productId = $product?->id;

                if ($salesOrder && !$soItem) {
                    $matches = $salesOrder->items->filter(function ($candidate) use ($productId, $code) {
                        return ($productId && (int) $candidate->product_id === (int) $productId)
                            || ($code && $code === $candidate->part_number);
                    });
                    if ($matches->count() === 1) {
                        $soItem = $matches->first();
                    }
                }

                if ($soItem) {
                    if (!$soItem->product_id && $productId) {
                        $soItem->update(['product_id' => $productId]);
                    }
                    $orderedQuantity = (int) $soItem->qty;
                    $alreadySent = DeliveryOrderItem::query()
                        ->where('sales_order_item_id', $soItem->id)
                        ->whereHas('deliveryOrder', fn ($query) => $query->where('status', '!=', 'Cancelled'))
                        ->sum('qty_sent');
                    $pendingQuantities[$soItem->id] = ($pendingQuantities[$soItem->id] ?? 0) + (int) $item['qty_sent'];
                    if ($alreadySent + $pendingQuantities[$soItem->id] > $orderedQuantity) {
                        abort(422, 'Jumlah barang DO melebihi kuantitas tersisa pada Sales Order.');
                    }
                }

                $currentStock = $product ? ($product->stock ?? $product->stok ?? $product->quantity ?? 0) : 0;
                $requiredQty = (int) $item['qty_sent'];

                if (!$product || $currentStock < $requiredQty) {
                    $isStockAvailable = false;
                }

                $resolvedItems[] = [
                    'sales_order_item_id' => $soItem?->id,
                    'product_id'          => $productId,
                    'part_number'         => $code ?? $product?->part_number ?? '-',
                    'description'         => $item['description'],
                    'qty_sent'            => $requiredQty,
                    'unit'                => $item['unit'] ?? 'PCS',
                ];
            }

            $initialStatus = $isStockAvailable ? 'Ready' : 'Waiting Production';

            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id'   => $salesOrder?->id,
                'do_number'        => $doNumber,
                'so_number'        => $salesOrder?->so_number ?? $request->input('so_number'),
                'ref_po'           => $request->input('ref_po', $request->input('customer_po')),
                'do_date'          => $request->input('do_date', $now->toDateString()),
                'customer_name'    => $request->input('customer_name', $salesOrder?->customer_name ?? 'Pelanggan'),
                'delivery_address' => $request->input('delivery_address', $salesOrder?->customer_address ?? '-'),
                'vehicle_number'   => $request->input('vehicle_number'),
                'driver_name'      => $request->input('driver_name'),
                'status'           => $initialStatus,
                'notes'            => $request->input('notes'),
            ]);

            foreach ($resolvedItems as $row) {
                DeliveryOrderItem::create([
                    'delivery_order_id'   => $deliveryOrder->id,
                    'sales_order_item_id' => $row['sales_order_item_id'],
                    'product_id'          => $row['product_id'],
                    'part_number'         => $row['part_number'],
                    'description'         => $row['description'],
                    'qty_sent'            => $row['qty_sent'],
                    'unit'                => $row['unit'],
                ]);
            }

            $message = $isStockAvailable
                ? 'Delivery Order berhasil dibuat. Stok tersedia dan siap di-Approve!'
                : 'Delivery Order dibuat. Stok kosong, dialihkan ke Waiting Production.';

            return response()->json([
                'status'  => 'success',
                'message' => $message,
                'data'    => $deliveryOrder->load(['salesOrder.items', 'items.product']),
            ], 201);
        });
    }

    /**
     * 4. Approve Delivery Order dan kurangi stok inventory secara otomatis.
     */
    public function approve(Request $request, $id, InventoryStockService $stockService)
    {
        return DB::transaction(function () use ($request, $id, $stockService) {
            $deliveryOrder = DeliveryOrder::with('items.product')->lockForUpdate()->find($id);
            if (!$deliveryOrder) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Delivery Order tidak ditemukan.',
                ], 404);
            }

            if (in_array($deliveryOrder->status, ['Approved', 'Delivered', 'BAST Signed'], true)) {
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Delivery Order ini sudah di-approve sebelumnya.',
                    'data'    => $deliveryOrder,
                ], 200);
            }

            $existingStockMovement = InventoryTransaction::where('reference_type', 'DO')
                ->where('reference_id', $deliveryOrder->id)
                ->exists();
            if ($existingStockMovement) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Mutasi stok untuk DO ini sudah tercatat; approval dihentikan untuk mencegah pengurangan ganda.',
                ], 422);
            }

            // Tahap 1: Validasi produk & kecukupan stok semua item
            $resolvedProducts = [];
            foreach ($deliveryOrder->items as $item) {
                $code = $item->part_number;
                $product = $item->product;

                if (!$product && $code && $code !== '-') {
                    $customerPart = CustomerPartNumber::where('part_number', $code)->first();
                    if ($customerPart) {
                        $product = Product::find($customerPart->product_id ?? $customerPart->inventory_product_id ?? null);
                    }
                    if (!$product) {
                        $product = Product::where('part_number', $code)
                            ->orWhere('barcode', $code)
                            ->orWhere('product_code', $code)
                            ->first();
                    }
                }

                if (!$product && !empty($item->description) && $item->description !== '-') {
                    $product = Product::where('name', 'LIKE', '%' . $item->description . '%')->first();
                }

                if (!$product) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Part Number [{$code}] / Deskripsi [{$item->description}] tidak ditemukan di Master Inventory.",
                    ], 422);
                }

                $currentStock = $product->stock ?? $product->stok ?? $product->quantity ?? 0;
                $requiredQty = (int) $item->qty_sent;

                if ($currentStock < $requiredQty) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Stok tidak mencukupi untuk '{$product->name}'. Stok gudang: {$currentStock}, dibutuhkan: {$requiredQty}. Silakan buat Work Order jika ingin memproduksi.",
                    ], 422);
                }

                $resolvedProducts[] = ['product' => $product, 'qty' => $requiredQty];
            }

            // Tahap 2: Potong stok via InventoryStockService
            foreach ($resolvedProducts as $entry) {
                $stockService->adjust($entry['product'], $entry['qty'], 'KELUAR', [
                    'user_id'               => $request->user()?->id,
                    'user_name'             => $request->user()?->name,
                    'warehouse_id'          => $request->input('warehouse_id', $deliveryOrder->warehouse_id),
                    'warehouse_location_id' => $request->input('warehouse_location_id', $deliveryOrder->warehouse_location_id),
                    'reference_type'        => 'DO',
                    'reference_id'          => $deliveryOrder->id,
                    'reference_number'      => $deliveryOrder->do_number,
                    'notes'                 => 'Approval Delivery Order ' . $deliveryOrder->do_number,
                ]);
            }

            $deliveryOrder->update(['status' => 'Approved']);

            return response()->json([
                'status'  => 'success',
                'message' => 'Delivery Order berhasil di-approve dan stok Inventory otomatis berkurang.',
                'data'    => $deliveryOrder->load('items'),
            ], 200);
        });
    }
}