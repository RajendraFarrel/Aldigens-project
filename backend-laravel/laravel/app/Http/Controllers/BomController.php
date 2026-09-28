<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BomController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Bom::with(['product', 'items.product'])->latest()->get()]);
    }
    public function show(Bom $bom)
    {
        return response()->json(['data' => $bom->load(['product', 'items.product'])]);
    }
    public function update(Request $request, Bom $bom)
    {
        $data = $request->validate(['document_number' => 'required|string|max:100|unique:boms,document_number,' . $bom->id, 'product_id' => 'required|exists:products,id', 'output_quantity' => 'required|numeric|min:0.001', 'unit' => 'required|string|max:50', 'status' => 'required|in:AKTIF,NONAKTIF', 'notes' => 'nullable|string', 'items' => 'required|array|min:1', 'items.*.product_id' => 'required|exists:products,id', 'items.*.quantity' => 'required|numeric|min:0.001', 'items.*.unit' => 'required|string|max:50']);
        $updated = DB::transaction(function () use ($data, $bom) { $bom->update(collect($data)->except('items')->toArray()); $bom->items()->delete(); $bom->items()->createMany($data['items']); return $bom->fresh(['product', 'items.product']); });
        return response()->json(['data' => $updated]);
    }

    public function destroy(Bom $bom)
    {
        if ($bom->productions()->exists()) return response()->json(['message' => 'BOM yang sudah digunakan produksi tidak dapat dihapus.'], 422);
        $bom->delete(); return response()->json(['message' => 'BOM berhasil dihapus.']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'document_number' => 'required|string|max:100|unique:boms,document_number',
            'product_id' => 'required|exists:products,id',
            'output_quantity' => 'required|numeric|min:0.001',
            'unit' => 'required|string|max:50',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'required|string|max:50',
        ]);
        $bom = DB::transaction(function () use ($data, $request) {
            $bom = Bom::create([...collect($data)->except('items')->toArray(), 'created_by' => $request->user()?->id, 'status' => $data['status'] ?? 'AKTIF']);
            $bom->items()->createMany($data['items']);
            return $bom->load(['product', 'items.product']);
        });
        return response()->json(['data' => $bom], 201);
    }
}
