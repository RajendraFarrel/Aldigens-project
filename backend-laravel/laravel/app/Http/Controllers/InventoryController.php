<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Services\InventoryStockService;

class InventoryController extends Controller
{
    // 1. Menampilkan semua daftar inventaris gudang
    public function index()
    {
        return response()->json(['status' => 'success', 'data' => Product::with('customer')->latest()->get()], 200);
    }

    // 2. Menambah data item inventaris baru melalui sumber stok terpusat.
    public function store(Request $request, InventoryStockService $stockService)
    {
        $data = $request->validate(['part_number' => 'required|string|max:255', 'item_name' => 'required|string|max:255', 'category' => 'nullable|string|max:255', 'unit' => 'nullable|string|max:50', 'stock_quantity' => 'nullable|integer|min:0']);
        $code = Product::generateInternalCode();
        $product = Product::create(['product_code' => $code, 'barcode' => $code, 'part_number' => $data['part_number'], 'name' => $data['item_name'], 'category' => $data['category'] ?? null, 'unit' => $data['unit'] ?? 'PCS', 'stock' => 0]);
        if (($data['stock_quantity'] ?? 0) > 0) $stockService->adjust($product, (int) $data['stock_quantity'], 'MASUK', ['reference_type' => 'LEGACY_API']);
        return response()->json(['status' => 'success', 'message' => 'Barang inventaris berhasil ditambahkan!', 'data' => $product->fresh()], 201);
    }

    // 3. Cari barang berdasarkan Part Number atau Barcode (untuk integrasi mikroservice Python)
    public function showByPartNumber($part_number)
    {
        $inventory = Product::where('part_number', $part_number)->first();

        if (!$inventory) {
            return response()->json([
                'status' => 'error',
                'message' => 'Barang dengan part number tersebut tidak ditemukan.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $inventory
        ], 200);
    }

    // 4. Update stok otomatis saat scan barcode (Barang Masuk / Keluar)
    public function updateStock(Request $request, $part_number, InventoryStockService $stockService)
    {
        $data = $request->validate(['type' => 'required|in:in,out', 'quantity' => 'required|integer|min:1']);
        $product = Product::where('part_number', $part_number)->first();
        if (!$product) return response()->json(['status' => 'error', 'message' => 'Part Number tidak ditemukan.'], 404);
        $updated = $stockService->adjust($product, $data['quantity'], $data['type'] === 'out' ? 'KELUAR' : 'MASUK', ['user_id' => $request->user()?->id, 'user_name' => $request->user()?->name, 'reference_type' => 'LEGACY_API']);
        return response()->json(['status' => 'success', 'message' => 'Stok berhasil diperbarui!', 'data' => $updated], 200);
    }
}
