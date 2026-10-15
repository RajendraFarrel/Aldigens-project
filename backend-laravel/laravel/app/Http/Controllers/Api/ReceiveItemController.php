<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ReceiveItem;
<<<<<<< HEAD
use App\Models\ReceiveItemLine;
use App\Models\Supplier;
=======
<<<<<<< HEAD
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
=======
>>>>>>> 7c884ac67d259c58448c0de8c19d7fd3b5e482f3
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
<<<<<<< HEAD
use Illuminate\Support\Facades\DB;
=======
use Illuminate\Support\Facades\DB; // Tambahkan ini untuk fitur Transaksi Database
>>>>>>> 791cde976e81c37ebfa6340787232644d6015c14
>>>>>>> 7c884ac67d259c58448c0de8c19d7fd3b5e482f3

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
            'receiveNo' => 'required|string|max:100',
            'date' => 'required|date',
            'vendorName' => 'required|string|max:255',
            'poRef' => 'nullable|string|max:100',
            'status' => 'required|string|max:50',
            'notes' => 'nullable|string',
<<<<<<< HEAD
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.unit' => 'nullable|string|max:50',
        ]);

        $item = DB::transaction(function () use ($validated, $request, $stockService) {
            $receiveItem = ReceiveItem::create([
                'document_number' => $validated['receiveNo'],
                'receive_date' => $validated['date'],
                'vendor_name' => $validated['vendorName'],
                'po_ref' => $validated['poRef'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            // Satu group_key untuk seluruh baris dokumen ini, agar mutasinya
            // bisa dibatalkan bersamaan bila dokumen dihapus.
            $groupKey = (string) Str::uuid();

            foreach ($validated['items'] as $line) {
                $product = Product::findOrFail($line['product_id']);
                $quantity = (int) $line['quantity'];

                $receiveItem->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit' => $line['unit'] ?? $product->unit ?? 'PCS',
                ]);

                // Tambah stok inventory (MASUK) sekaligus catat mutasinya.
                $stockService->adjust($product, $quantity, 'MASUK', [
                    'group_key' => $groupKey,
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'reference_type' => 'RECEIVE',
                    'reference_number' => $receiveItem->document_number,
                    'reference_id' => $receiveItem->id,
                    'notes' => $validated['notes'] ?? null,
                ]);
            }

            return $receiveItem->load('items.product');
        });
=======
            'items' => 'nullable|array', // Validasi array barang/items yang diterima
        ]);

        // Gunakan DB Transaction agar jika ada error di tengah jalan, data digagalkan (tidak setengah-setengah)
        DB::beginTransaction();
>>>>>>> 791cde976e81c37ebfa6340787232644d6015c14
>>>>>>> 7c884ac67d259c58448c0de8c19d7fd3b5e482f3

            $warehouse = !empty($data['warehouse_id'])
                ? Warehouse::find($data['warehouse_id'])
                : Warehouse::query()->firstOrCreate(['code' => 'MAIN'], ['name' => 'Warehouse Utama', 'status' => 'AKTIF']);

            $supplier = null;
            if ($vendorName) {
                $supplier = Supplier::firstOrCreate(['supplier_name' => $vendorName]);
            }

            // 1. Simpan header penerimaan barang.
            $receiveItem = ReceiveItem::create([
                'document_number' => $receiveNo,
                'receive_date' => $data['date'] ?? now()->toDateString(),
                'supplier_id' => $supplier?->id,
                'warehouse_id' => $warehouse?->id,
                'delivery_order' => $data['deliveryOrder'] ?? null,
                'spk_supplier' => $data['spkSupplier'] ?? null,
                'status' => $data['status'] ?? 'COMPLETED',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            $receivedCount = 0;

            // 2. Simpan baris item & tambah stok Inventory.
            foreach (($data['items'] ?? []) as $line) {
                $code = $line['part_number'] ?? $line['product_code'] ?? $line['code'] ?? null;
                $qty = (int) ($line['qty'] ?? $line['quantity'] ?? 0);

                if (!$code || $qty < 1) {
                    continue;
                }

                $product = Product::where('part_number', $code)
                    ->orWhere('product_code', $code)
                    ->orWhere('barcode', $code)
                    ->first();

                if (!$product) {
                    throw new \RuntimeException("Part Number {$code} tidak ditemukan di Inventory.");
                }

                ReceiveItemLine::create([
                    'receive_item_id' => $receiveItem->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit' => $line['unit'] ?? $product->unit ?? 'PCS',
                ]);

                // Tambah stok + catat mutasi MASUK (stok Inventory ikut bertambah).
                $stockService->adjust($product, $qty, 'MASUK', [
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'warehouse_id' => $warehouse?->id,
                    'reference_type' => 'RECEIVE_ITEM',
                    'reference_id' => $receiveItem->id,
                    'reference_number' => $receiveNo,
                    'notes' => 'Penerimaan barang dari ' . ($vendorName ?? 'supplier'),
                ]);

                $receivedCount++;
            }

            return response()->json([
                'message' => 'Data penerimaan berhasil disimpan dan stok Inventory otomatis bertambah!',
                'data' => $receiveItem->load('items'),
                'received_items' => $receivedCount,
            ], 201);
        });
    }

    public function show($id)
    {
        return response()->json(ReceiveItem::with('items')->findOrFail($id));
    }

    /**
     * Update header penerimaan. Baris item/stok tidak diubah di sini agar mutasi
     * Inventory tidak dipotong/ditambah dua kali — koreksi stok dilakukan lewat
     * menu Inventory (Receive/Issue/Stock Opname).
     */
    public function update(Request $request, $id)
    {
        $receiveItem = ReceiveItem::findOrFail($id);

        $data = $request->validate([
            'date' => 'nullable|date',
            'vendorName' => 'nullable|string',
            'poRef' => 'nullable|string',
            'deliveryOrder' => 'nullable|string',
            'spkSupplier' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $receiveItem->update([
            'receive_date' => $data['date'] ?? $receiveItem->receive_date,
            'delivery_order' => $data['deliveryOrder'] ?? $receiveItem->delivery_order,
            'spk_supplier' => $data['spkSupplier'] ?? $receiveItem->spk_supplier,
            'status' => $data['status'] ?? $receiveItem->status,
            'notes' => $data['notes'] ?? $receiveItem->notes,
        ]);

        return response()->json([
            'message' => 'Data penerimaan berhasil diperbarui.',
            'data' => $receiveItem->load('items'),
        ]);
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