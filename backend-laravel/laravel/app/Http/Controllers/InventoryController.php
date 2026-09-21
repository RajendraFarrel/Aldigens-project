<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Inventory;

class InventoryController extends Controller
{
    // 1. Menampilkan semua daftar inventaris gudang
    public function index()
    {
        $inventories = Inventory::latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $inventories
        ], 200);
    }

    // 2. Menambah data item inventaris baru
    public function store(Request $request)
    {
        $request->validate([
            'part_number' => 'required|string|unique:inventories,part_number',
            'item_name' => 'required|string',
            'stock_quantity' => 'required|integer',
            'selling_price' => 'required|numeric',
        ]);

        try {
            $inventory = Inventory::create([
                'part_number'        => $request->part_number,
                'item_name'          => $request->item_name,
                'category'           => $request->category,
                'stock_quantity'     => $request->stock_quantity,
                'unit'               => $request->unit ?? 'PCS',
                'purchase_price'     => $request->purchase_price ?? 0,
                'selling_price'      => $request->selling_price,
                'warehouse_location' => $request->warehouse_location,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Barang inventaris berhasil ditambahkan!',
                'data' => $inventory
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambah inventaris: ' . $e->getMessage()
            ], 500);
        }
    }

    // 3. Cari barang berdasarkan Part Number atau Barcode (untuk integrasi mikroservice Python)
    public function showByPartNumber($part_number)
    {
        $inventory = Inventory::where('part_number', $part_number)->first();

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
}
