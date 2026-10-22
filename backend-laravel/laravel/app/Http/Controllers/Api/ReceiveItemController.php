<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveItemController extends Controller
{
    public function index()
    {
        return response()->json(ReceiveItem::latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string|unique:receive_items,document_number',
            'date' => 'required|date',
            'vendorName' => 'required|string',
            'poRef' => 'nullable|string',
            'status' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'nullable|array', 
        ]);

        DB::beginTransaction();

        try {
            // 1. Simpan Header Data Penerimaan Barang (RI)
            $receiveItem = ReceiveItem::create([
                'document_number' => $validated['receiveNo'],
                'receive_date' => $validated['date'],
                'status' => $validated['status'],
                'notes' => "PO Ref: " . ($validated['poRef'] ?? '-') . " | Vendor: " . $validated['vendorName'],
            ]);

            // 2. Looping data items (barang) untuk MENAMBAH STOK LANGSUNG KE INVENTORY
            if (!empty($request->items)) {
                foreach ($request->items as $itemData) {
                    $partNumber = $itemData['part_number'] ?? null;
                    $qty = isset($itemData['qty']) ? (int)$itemData['qty'] : 0;

                    if ($partNumber && $qty > 0) {
                        // Cari produk berdasarkan part_number di Data Inventory
                        $product = Product::where('part_number', $partNumber)->first();

                        if ($product) {
                            // Tambah stok di tabel utama (products)
                            $product->stock += $qty;
                            $product->save();
                        }
                    }
                }
            }

            // Simpan semua perubahan secara permanen
            DB::commit();

            return response()->json([
                'message' => 'Data penerimaan berhasil disimpan dan stok Inventory otomatis bertambah!', 
                'data' => $receiveItem
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $item = ReceiveItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}