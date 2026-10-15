<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use App\Models\ReceiveItemLine;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveItemController extends Controller
{
    public function index()
    {
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

    public function destroy($id)
    {
        $item = ReceiveItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}