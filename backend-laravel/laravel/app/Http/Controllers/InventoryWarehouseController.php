<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\ReceiveItem;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InventoryWarehouseController extends Controller
{
    public function stocks(Request $request)
    {
        $query = InventoryStock::with(['product', 'warehouse', 'location'])->orderBy('product_id');
        foreach (['product_id', 'warehouse_id', 'warehouse_location_id'] as $field) {
            if ($request->filled($field)) $query->where($field, $request->input($field));
        }
        return response()->json(['data' => $query->get()]);
    }

    /**
     * Daftar mutasi untuk halaman penerimaan / pengeluaran / transfer.
     * Setiap grup = satu form (transfer punya 2 baris: OUT + IN).
     */
    public function mutations(Request $request)
    {
        $referenceTypes = array_values(array_filter(explode(',', (string) $request->input('reference_types', 'RECEIVE,ISSUE,TRANSFER'))));

        $query = InventoryTransaction::with(['product', 'warehouse', 'location'])
            ->whereIn('reference_type', $referenceTypes)
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('part_number', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        $rows = $query->get()->groupBy(fn($t) => $t->group_key ?: 'TX-' . $t->id);

        $data = $rows->map(function ($items, $groupKey) {
            $first = $items->sortBy('id')->first();
            $out = $items->firstWhere('transfer_direction', 'OUT') ?? $first;
            $in  = $items->firstWhere('transfer_direction', 'IN');

            $format = fn($model) => $model ? ['id' => $model->id, 'code' => $model->code, 'name' => $model->name] : null;

            return [
                'group_key'        => $groupKey,
                'transaction_ids'  => $items->pluck('id')->values(),
                'reference_type'   => $first->reference_type,
                'reference_number' => $first->reference_number,
                'notes'            => $first->notes,
                'transaction_time' => $first->transaction_time,
                'user_name'        => $first->user_name,
                'quantity'         => $first->quantity,
                'stock_before'     => $out->stock_before,
                'stock_after'      => $out->stock_after,
                'product'          => $first->product ? [
                    'id'          => $first->product->id,
                    'part_number' => $first->product->part_number,
                    'barcode'     => $first->product->barcode,
                    'name'        => $first->product->name,
                    'unit'        => $first->product->unit,
                    'stock'       => $first->product->stock,
                ] : null,
                'warehouse'             => $format($out->warehouse),
                'location'              => $format($out->location),
                'destination_warehouse' => $in ? $format($in->warehouse) : null,
                'destination_location'  => $in ? $format($in->location) : null,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    public function receive(Request $request, InventoryStockService $stockService)
    {
        $response = $this->changeStock($request, $stockService, 'MASUK', 'RECEIVE');
        if ($response->getStatusCode() < 300) {
            $payload = $request->validate([
                'document_number' => 'nullable|string|max:100',
                'receive_date' => 'nullable|date',
                'supplier_id' => 'nullable|exists:suppliers,id',
                'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            ]);
            $documentNumber = $payload['document_number'] ?? ($request->input('reference_number') ?: 'RCV-' . now()->format('YmdHis'));
            // document_number bersifat unik, jadi dipakai updateOrCreate agar
            // edit/penerimaan ulang dengan nomor sama tidak bentrok.
            ReceiveItem::updateOrCreate(
                ['document_number' => $documentNumber],
                [
                    'receive_date' => $payload['receive_date'] ?? now()->toDateString(),
                    'supplier_id' => $payload['supplier_id'] ?? null,
                    'purchase_order_id' => $payload['purchase_order_id'] ?? null,
                    'warehouse_id' => $request->input('warehouse_id'),
                    'created_by' => $request->user()?->id,
                    'notes' => $request->input('notes'),
                ]
            );
        }
        return $response;
    }

    public function issue(Request $request, InventoryStockService $stockService)
    {
        return $this->changeStock($request, $stockService, 'KELUAR', 'ISSUE');
    }

    private function changeStock(Request $request, InventoryStockService $stockService, string $type, string $referenceType)
    {
        $data = $request->validate([
            'barcode' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'warehouse_location_id' => 'nullable|exists:warehouse_locations,id',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);
        $product = Product::findByCode($data['barcode']);
        if (!$product) return response()->json(['message' => 'Part Number/barcode tidak ditemukan.'], 404);
        $updated = $stockService->adjust($product, $data['quantity'], $type, [
            ...$data,
            'group_key' => $request->input('_group_key') ?: (string) Str::uuid(),
            'user_id' => $request->user()?->id,
            'user_name' => $request->user()?->name,
            'reference_type' => $referenceType,
        ]);
        return response()->json(['message' => 'Stok berhasil diperbarui.', 'data' => $updated]);
    }

    public function transfer(Request $request, InventoryStockService $stockService)
    {
        $data = $request->validate([
            'barcode' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'source_warehouse_id' => 'required|exists:warehouses,id',
            'source_location_id' => 'nullable|exists:warehouse_locations,id',
            'destination_warehouse_id' => 'required|exists:warehouses,id',
            'destination_location_id' => 'nullable|exists:warehouse_locations,id',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);
        $product = Product::findByCode($data['barcode']);
        if (!$product) return response()->json(['message' => 'Part Number/barcode tidak ditemukan.'], 404);
        if ($data['source_warehouse_id'] == $data['destination_warehouse_id'] && ($data['source_location_id'] ?? null) == ($data['destination_location_id'] ?? null)) {
            throw ValidationException::withMessages(['destination_warehouse_id' => 'Lokasi tujuan harus berbeda dari lokasi sumber.']);
        }
        $groupKey = $request->input('_group_key') ?: (string) Str::uuid();
        DB::transaction(function () use ($data, $product, $stockService, $request, $groupKey) {
            $context = [
                'group_key' => $groupKey,
                'user_id' => $request->user()?->id,
                'user_name' => $request->user()?->name,
                'reference_type' => 'TRANSFER',
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
            ];
            $stockService->adjust($product, $data['quantity'], 'TRANSFER', [...$context, 'warehouse_id' => $data['source_warehouse_id'], 'warehouse_location_id' => $data['source_location_id'] ?? null, 'transfer_direction' => 'OUT']);
            $stockService->adjust($product, $data['quantity'], 'TRANSFER', [...$context, 'warehouse_id' => $data['destination_warehouse_id'], 'warehouse_location_id' => $data['destination_location_id'] ?? null, 'transfer_direction' => 'IN']);
        });
        return response()->json(['message' => 'Transfer lokasi berhasil disimpan.']);
    }

    /**
     * Edit mutasi: batalkan grup lama (rollback saldo), lalu terapkan ulang data baru.
     */
    public function updateMutation(Request $request, string $groupKey, InventoryStockService $stockService)
    {
        $referenceType = $request->input('reference_type');
        if (!in_array($referenceType, ['RECEIVE', 'ISSUE', 'TRANSFER'], true)) {
            throw ValidationException::withMessages(['reference_type' => 'Jenis mutasi tidak valid.']);
        }

        $existing = InventoryTransaction::where('group_key', $groupKey)->exists();
        if (!$existing) {
            return response()->json(['message' => 'Transaksi tidak ditemukan atau sudah dibatalkan.'], 404);
        }

        return DB::transaction(function () use ($request, $groupKey, $stockService, $referenceType) {
            $this->purgeReceiveItem($groupKey);
            $stockService->revertGroup($groupKey);
            $request->merge(['reference_type' => $referenceType, '_group_key' => $groupKey]);

            return match ($referenceType) {
                'RECEIVE' => $this->receive($request, $stockService),
                'TRANSFER' => $this->transfer($request, $stockService),
                default => $this->issue($request, $stockService),
            };
        });
    }

    /**
     * Hapus mutasi dan kembalikan saldo ke kondisi sebelum mutasi.
     */
    public function destroyMutation(string $groupKey, InventoryStockService $stockService)
    {
        $deleted = $stockService->revertGroup($groupKey);
        if ($deleted === 0) {
            return response()->json(['message' => 'Transaksi tidak ditemukan atau sudah dibatalkan.'], 404);
        }
        $this->purgeReceiveItem($groupKey);
        return response()->json(['message' => "{$deleted} baris mutasi dibatalkan dan stok dikembalikan."]);
    }

    /**
     * Bersihkan header ReceiveItem yang dibuat saat penerimaan, agar edit/hapus
     * tidak menyisakan dokumen qiunggi.
     */
    private function purgeReceiveItem(string $groupKey)
    {
        $referenceNumber = InventoryTransaction::where('group_key', $groupKey)
            ->where('reference_type', 'RECEIVE')
            ->value('reference_number');

        if (!$referenceNumber) return;

        ReceiveItem::where('document_number', $referenceNumber)->delete();
    }
}
