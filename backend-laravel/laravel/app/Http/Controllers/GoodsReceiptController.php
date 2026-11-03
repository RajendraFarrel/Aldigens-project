<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GoodsReceipt;
use App\Models\Inventory;
use Illuminate\Support\Facades\DB;

class GoodsReceiptController extends Controller
{
    // 1. Menampilkan riwayat penerimaan barang
    public function index()
    {
        // Mengambil data receipt beserta detail item dan data inventory-nya
        $receipts = GoodsReceipt::with('items.inventory')->latest()->get();
        return response()->json($receipts);
    }

    // 2. Menyimpan penerimaan barang baru & Otomatis Update Stok
    public function store(Request $request)
    {
        // Validasi input dari frontend React
        $validated = $request->validate([
            'receive_date' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_product_id' => 'required|exists:inventories,id',
            'items.*.qty' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            // A. Simpan data header penerimaan
            $receipt = GoodsReceipt::create([
                'receive_date' => $validated['receive_date'],
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // B. Simpan detail item dan tambahkan stok ke tabel inventories
            foreach ($validated['items'] as $item) {
                // Simpan ke tabel goods_receipt_items
                $receipt->items()->create([
                    'inventory_product_id' => $item['inventory_product_id'],
                    'qty' => $item['qty'],
                ]);

                // Cari data inventory berdasarkan ID
                $inventory = Inventory::find($item['inventory_product_id']);
                
                // CATATAN PENTING: 
                // Ganti 'stok' dengan nama kolom stok Anda (misal: 'stock', 'current_stock', 'qty')
                $inventory->increment('stok', $item['qty']); 
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Penerimaan barang berhasil disimpan dan stok otomatis bertambah!',
                'data' => $receipt->load('items') // Kembalikan data yang baru disimpan
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan data: ' . $e->getMessage()
            ], 500);
        }
    }
}