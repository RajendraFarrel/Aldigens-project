<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\Product;
use App\Models\ReceiveItem;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryWarehouseController extends Controller
{
    public function stocks(Request $request)
    {
        $query = InventoryStock::with(['product', 'warehouse', 'location'])->orderBy('product_id');
        foreach (['product_id', 'warehouse_id', 'warehouse_location_id'] as $field) {
            if ($request->filled($field)) $query->where($field, $request->input($field));
        }
        return response()->json(['data' => $query->get()]);
    }

    public function receive(Request $request, InventoryStockService $stockService)
    {
        $response = $this->changeStock($request, $stockService, 'MASUK', 'RECEIVE');
        if ($response->getStatusCode() < 300) {
            $payload = $request->validate([
                'document_number' => 'nullable|string|max:100',
                'receive_date' => 'nullable|date',
                'supplier_id' => 'nullable|exists:suppliers,id',
                'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            ]);
            ReceiveItem::create([
                'document_number' => $payload['document_number'] ?? ($request->input('reference_number') ?: 'RCV-' . now()->format('YmdHis')),
                'receive_date' => $payload['receive_date'] ?? now()->toDateString(),
                'supplier_id' => $payload['supplier_id'] ?? null,
                'purchase_order_id' => $payload['purchase_order_id'] ?? null,
                'warehouse_id' => $request->input('warehouse_id'),
                'created_by' => $request->user()?->id,
                'notes' => $request->input('notes'),
            ]);
        }
        return $response;
    }

    public function issue(Request $request, InventoryStockService $stockService)
    {
        return $this->changeStock($request, $stockService, 'KELUAR', 'ISSUE');
    }

    private function changeStock(Request $request, InventoryStockService $stockService, string $type, string $referenceType)
    {
        $data = $request->validate([
            'barcode' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'warehouse_location_id' => 'nullable|exists:warehouse_locations,id',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);
        $product = Product::findByCode($data['barcode']);
        if (!$product) return response()->json(['message' => 'Part Number/barcode tidak ditemukan.'], 404);
        $updated = $stockService->adjust($product, $data['quantity'], $type, [
            ...$data,
            'user_id' => $request->user()?->id,
            'user_name' => $request->user()?->name,
            'reference_type' => $referenceType,
        ]);
        return response()->json(['message' => 'Stok berhasil diperbarui.', 'data' => $updated]);
    }

    public function transfer(Request $request, InventoryStockService $stockService)
    {
        $data = $request->validate([
            'barcode' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'source_warehouse_id' => 'required|exists:warehouses,id',
            'source_location_id' => 'nullable|exists:warehouse_locations,id',
            'destination_warehouse_id' => 'required|exists:warehouses,id',
            'destination_location_id' => 'nullable|exists:warehouse_locations,id',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);
        $product = Product::findByCode($data['barcode']);
        if (!$product) return response()->json(['message' => 'Part Number/barcode tidak ditemukan.'], 404);
        if ($data['source_warehouse_id'] == $data['destination_warehouse_id'] && ($data['source_location_id'] ?? null) == ($data['destination_location_id'] ?? null)) {
            throw ValidationException::withMessages(['destination_warehouse_id' => 'Lokasi tujuan harus berbeda dari lokasi sumber.']);
        }
        DB::transaction(function () use ($data, $product, $stockService, $request) {
            $context = [
                'user_id' => $request->user()?->id,
                'user_name' => $request->user()?->name,
                'reference_type' => 'TRANSFER',
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
            ];
            $stockService->adjust($product, $data['quantity'], 'TRANSFER', [...$context, 'warehouse_id' => $data['source_warehouse_id'], 'warehouse_location_id' => $data['source_location_id'] ?? null, 'transfer_direction' => 'OUT']);
            $stockService->adjust($product, $data['quantity'], 'TRANSFER', [...$context, 'warehouse_id' => $data['destination_warehouse_id'], 'warehouse_location_id' => $data['destination_location_id'] ?? null, 'transfer_direction' => 'IN']);
        });
        return response()->json(['message' => 'Transfer lokasi berhasil disimpan.']);
    }
}
