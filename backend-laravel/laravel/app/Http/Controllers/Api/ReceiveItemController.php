<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Tambahkan ini untuk fitur Transaksi Database

class ReceiveItemController extends Controller
{
    public function index()
    {
        return response()->json(ReceiveItem::latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string|unique:receive_items,receive_no',
            'date' => 'required|date',
            'vendorName' => 'required|string',
            'poRef' => 'nullable|string',
            'status' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'nullable|array', // Validasi array barang/items yang diterima
        ]);

        // Gunakan DB Transaction agar jika ada error di tengah jalan, data digagalkan (tidak setengah-setengah)
        DB::beginTransaction();

        try {
            // 1. Simpan Header Data Penerimaan Barang (RI)
            $receiveItem = ReceiveItem::create([
                'receive_no' => $validated['receiveNo'],
                'date' => $validated['date'],
                'vendor_name' => $validated['vendorName'],
                'po_ref' => $validated['poRef'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // 2. Looping data items (barang) untuk MENAMBAH STOK
            if (!empty($request->items)) {
                $defaultWarehouse = Warehouse::first();

                foreach ($request->items as $itemData) {
                    $partNumber = $itemData['part_number'] ?? null;
                    $qty = isset($itemData['qty']) ? (int)$itemData['qty'] : 0;

                    if ($partNumber && $qty > 0) {
                        // Cari produk berdasarkan part_number
                        $product = Product::where('part_number', $partNumber)->first();

                        if ($product) {
                            // A. Tambah stok di tabel utama (products)
                            $product->stock += $qty;
                            $product->save();

                            // B. Tambah stok di tabel gudang (warehouse_stocks) agar tidak error saat diedit nanti
                            if ($defaultWarehouse) {
                                $warehouseStock = WarehouseStock::firstOrCreate(
                                    [
                                        'warehouse_id' => $defaultWarehouse->id,
                                        'product_id' => $product->id
                                    ],
                                    ['stock' => 0] // Nilai default jika belum ada di gudang
                                );
                                
                                $warehouseStock->stock += $qty;
                                $warehouseStock->save();
                            }
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
            // Batalkan semua perubahan database jika terjadi error
            DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()
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