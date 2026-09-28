<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Production;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductionController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Production::with(['bom.product', 'items.product'])->latest()->get()]);
    }
    public function store(Request $request, InventoryStockService $stockService)
    {
        $data = $request->validate(['document_number' => 'required|string|max:100|unique:productions,document_number', 'bom_id' => 'required|exists:boms,id', 'production_date' => 'required|date', 'quantity' => 'required|numeric|min:0.001', 'warehouse_id' => 'nullable|exists:warehouses,id', 'warehouse_location_id' => 'nullable|exists:warehouse_locations,id', 'notes' => 'nullable|string']);
        $production = DB::transaction(function () use ($data, $request, $stockService) {
            $bom = Bom::with('items.product')->findOrFail($data['bom_id']);
            $factor = (float) $data['quantity'] / (float) $bom->output_quantity;
            $context = ['user_id' => $request->user()?->id, 'user_name' => $request->user()?->name, 'warehouse_id' => $data['warehouse_id'] ?? null, 'warehouse_location_id' => $data['warehouse_location_id'] ?? null, 'reference_type' => 'PRODUCTION', 'reference_number' => $data['document_number'], 'notes' => $data['notes'] ?? null];
            foreach ($bom->items as $item) $stockService->adjust($item->product, (int) ceil((float) $item->quantity * $factor), 'PRODUKSI KELUAR', $context);
            $stockService->adjust($bom->product, (int) $data['quantity'], 'PRODUKSI MASUK', $context);
            $production = Production::create([...$data, 'created_by' => $request->user()?->id]);
            foreach ($bom->items as $item) $production->items()->create(['product_id' => $item->product_id, 'direction' => 'KELUAR', 'quantity' => (float) $item->quantity * $factor, 'unit' => $item->unit]);
            $production->items()->create(['product_id' => $bom->product_id, 'direction' => 'MASUK', 'quantity' => $data['quantity'], 'unit' => $bom->unit]);
            return $production->load(['bom.product', 'items.product']);
        });
        return response()->json(['data' => $production], 201);
    }
}
