<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
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
<<<<<<< HEAD
        return response()->json(ReceiveItem::with('items')->latest()->get());
    }

    /**
     * Simpan penerimaan barang (Receive Item).
     *
     * Frontend mengirim payload camelCase (receiveNo, vendorName, poRef, dst).
     * Setiap baris item yang diterima MENAMBAH stok Inventory melalui
     * InventoryStockService (satu-satunya pintu perubahan stok + mutasi),
     * sehingga stok di menu Inventory otomatis bertambah.
     *
     * Bentuk `items`: { part_number|product_code|code, qty|quantity, unit? }.
     */
    public function store(Request $request, InventoryStockService $stockService)
    {
        $data = $request->validate([
            'receiveNo' => 'nullable|string',
            'date' => 'nullable|date',
            'vendorName' => 'nullable|string',
            'poRef' => 'nullable|string',
            'deliveryOrder' => 'nullable|string',
            'spkSupplier' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'items' => 'nullable|array',
        ]);

        // DB Transaction: jika ada satu item gagal, seluruh penerimaan dibatalkan.
        return DB::transaction(function () use ($data, $stockService, $request) {
            $receiveNo = $data['receiveNo'] ?? ('RI-' . now()->format('Ymd') . '-' . random_int(1000, 9999));
            $vendorName = $data['vendorName'] ?? null;
=======
        return response()->json(ReceiveItem::with('items.product')->latest()->get());
    }

    public function store(Request $request, InventoryStockService $stockService)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string|unique:receive_items,receive_no',
            'date' => 'required|date',
            'vendorName' => 'required|string|max:255',
            'poRef' => 'nullable|string|max:100',
            'status' => 'required|string|max:50',
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
                'data' => $receiveItem->load('items'),
                'received_items' => $receivedCount,
            ], 201);

        } catch (\Exception $e) {
            // Batalkan semua perubahan database jika terjadi error
            DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id, InventoryStockService $stockService)
    {
        $item = ReceiveItem::findOrFail($id);

        DB::transaction(function () use ($item, $stockService) {
            // Kembalikan stok yang pernah ditambahkan dokumen ini agar saldo
            // tidak menggantung setelah dokumen penerimaan dihapus.
            $groupKeys = \App\Models\InventoryTransaction::where('reference_type', 'RECEIVE')
                ->where('reference_number', $item->document_number)
                ->whereNotNull('group_key')
                ->distinct()
                ->pluck('group_key');

            foreach ($groupKeys as $groupKey) {
                $stockService->revertGroup($groupKey);
            }

            $item->delete();
        });

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}