<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
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
                $item['system_quantity'] = (int) $query->where('warehouse_location_id', $item['warehouse_location_id'])->value('quantity');
                $item['difference'] = (int) $item['physical_quantity'] - $item['system_quantity'];
                $opname->items()->create($item);
            }
            return $opname->load(['warehouse', 'items.product']);
        });
        return response()->json(['data' => $opname], 201);
    }

    public function complete(Request $request, StockOpname $stockOpname, InventoryStockService $stockService)
    {
        if ($stockOpname->status !== 'DRAFT') {
            throw ValidationException::withMessages(['status' => 'Stock opname sudah diproses.']);
        }
        $stockOpname->load('items.product');
        DB::transaction(function () use ($stockOpname, $stockService, $request) {
            foreach ($stockOpname->items as $item) {
                $difference = (int) $item->difference;
                if ($difference === 0) continue;
                $stockService->adjust($item->product, abs($difference), $difference > 0 ? 'ADJUSTMENT' : 'KELUAR', [
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'warehouse_id' => $stockOpname->warehouse_id,
                    'warehouse_location_id' => $item->warehouse_location_id,
                    'reference_type' => 'STOCK_OPNAME',
                    'reference_id' => $stockOpname->id,
                    'reference_number' => $stockOpname->document_number,
                    'notes' => $item->notes,
                ]);
            }
            $stockOpname->update(['status' => 'COMPLETED', 'approved_by' => $request->user()?->id, 'approved_at' => now()]);
        });
        return response()->json(['message' => 'Stock opname selesai dan adjustment tercatat.', 'data' => $stockOpname->fresh(['warehouse', 'items.product'])]);
    }
}
