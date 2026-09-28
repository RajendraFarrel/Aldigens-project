<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\WarehouseLocation;
use App\Models\StockOpname;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockOpnameController extends Controller
{
    public function index(Request $request)
    {
        $query = StockOpname::with(['warehouse', 'items.product'])->latest();
        if ($request->filled('status')) $query->where('status', $request->status);
        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'document_number' => 'required|string|max:100|unique:stock_opnames,document_number',
            'opname_date' => 'required|date',
            'warehouse_id' => 'required|exists:warehouses,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.warehouse_location_id' => 'nullable|exists:warehouse_locations,id',
            'items.*.physical_quantity' => 'required|integer|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        $opname = DB::transaction(function () use ($data, $request) {
            $opname = StockOpname::create([
                'document_number' => $data['document_number'],
                'opname_date' => $data['opname_date'],
                'warehouse_id' => $data['warehouse_id'],
                'status' => 'DRAFT',
                'created_by' => $request->user()?->id,
                'notes' => $data['notes'] ?? null,
            ]);
            foreach ($data['items'] as $item) {
                $query = InventoryStock::where('product_id', $item['product_id'])
                    ->where('warehouse_id', $data['warehouse_id']);
                $item['warehouse_location_id'] = $item['warehouse_location_id'] ?? null;
                if ($item['warehouse_location_id'] && !WarehouseLocation::where('id', $item['warehouse_location_id'])
                    ->where('warehouse_id', $data['warehouse_id'])->exists()) {
                    throw ValidationException::withMessages([
                        'items' => 'Lokasi Stock Opname harus berada di warehouse yang dipilih.',
                    ]);
                }
                $item['system_quantity'] = $item['warehouse_location_id']
                    ? (int) $query->where('warehouse_location_id', $item['warehouse_location_id'])->value('quantity')
                    : (int) $query->sum('quantity');
                $item['difference'] = (int) $item['physical_quantity'] - $item['system_quantity'];
                $opname->items()->create($item);
            }
            return $opname->load(['warehouse', 'items.product']);
        });
        return response()->json(['data' => $opname], 201);
    }

    public function complete(Request $request, StockOpname $stockOpname, InventoryStockService $stockService)
    {
        $completed = DB::transaction(function () use ($stockOpname, $stockService, $request) {
            $lockedOpname = StockOpname::query()->lockForUpdate()->findOrFail($stockOpname->id);
            if ($lockedOpname->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => 'Stock opname sudah diproses.']);
            }

            $lockedOpname->load('items.product');
            foreach ($lockedOpname->items as $item) {
                $systemQuantityQuery = InventoryStock::query()
                    ->where('product_id', $item->product_id)
                    ->where('warehouse_id', $lockedOpname->warehouse_id);
                $systemQuantity = $item->warehouse_location_id
                    ? (int) $systemQuantityQuery->where('warehouse_location_id', $item->warehouse_location_id)->sum('quantity')
                    : (int) $systemQuantityQuery->sum('quantity');
                $difference = (int) $item->physical_quantity - $systemQuantity;

                $item->update([
                    'system_quantity' => $systemQuantity,
                    'difference' => $difference,
                ]);
                if ($difference === 0) continue;

                $stockService->adjustWarehouseTotal($item->product, $difference, [
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'warehouse_id' => $lockedOpname->warehouse_id,
                    'warehouse_location_id' => $item->warehouse_location_id,
                    'reference_type' => 'STOCK_OPNAME',
                    'reference_id' => $lockedOpname->id,
                    'reference_number' => $lockedOpname->document_number,
                    'notes' => $item->notes,
                ]);
            }

            $lockedOpname->update([
                'status' => 'COMPLETED',
                'approved_by' => $request->user()?->id,
                'approved_at' => now(),
            ]);

            return $lockedOpname;
        });

        return response()->json([
            'message' => 'Stock opname selesai dan adjustment tercatat.',
            'data' => $completed->fresh(['warehouse', 'items.product']),
        ]);
    }
}
