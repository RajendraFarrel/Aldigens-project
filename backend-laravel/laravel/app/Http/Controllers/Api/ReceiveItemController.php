<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use App\Models\ReceiveItemLine;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveItemController extends Controller
{
    public function index()
    {
        // Gunakan relasi product agar detail nama/part number barang terbawa ke frontend
        return response()->json(ReceiveItem::with('items.product')->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string',
            'date' => 'required|date',
            'vendorName' => 'required|string',
            'poRef' => 'nullable|string',
            'status' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'nullable|array', 
        ]);

        DB::beginTransaction();

        try {
            // 1. Simpan Header Data Penerimaan
            $receiveItem = ReceiveItem::create([
                'document_number' => $validated['receiveNo'],
                'receive_date' => $validated['date'],
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? ("PO Ref: " . ($validated['poRef'] ?? '-') . " | Vendor: " . $validated['vendorName']),
            ]);

            // 2. Simpan Detail Item dan Tambah Stok
            if (!empty($request->items)) {
                foreach ($request->items as $itemData) {
                    $qty = isset($itemData['qty']) ? (float)$itemData['qty'] : (isset($itemData['quantity']) ? (float)$itemData['quantity'] : 0);
                    $unit = $itemData['unit'] ?? 'PCS';
                    
                    $productId = $itemData['product_id'] ?? null;
                    $partNumber = $itemData['part_number'] ?? null;

                    if ($qty > 0) {
                        // Jika product_id kosong dari frontend, cari berdasarkan part_number
                        if (!$productId && $partNumber) {
                            $product = Product::where('part_number', $partNumber)->first();
                            if ($product) {
                                $productId = $product->id;
                            }
                        }

                        // Jika ID Produk ditemukan, tambahkan stok & simpan detail
                        if ($productId) {
                            $productModel = Product::find($productId);
                            if ($productModel) {
                                $productModel->stock += $qty;
                                $productModel->save();
                            }

                            // Simpan detail item (MENYESUAIKAN DENGAN MODELMU)
                            ReceiveItemLine::create([
                                'receive_item_id' => $receiveItem->id,
                                'product_id' => $productId,
                                'quantity' => $qty, // Menggunakan 'quantity', bukan 'qty'
                                'unit' => $unit,
                            ]);
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Data penerimaan berhasil disimpan dan stok Inventory otomatis bertambah!', 
                'data' => $receiveItem->load('items.product')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $item = ReceiveItem::findOrFail($id);
        $item->items()->delete();
        $item->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}