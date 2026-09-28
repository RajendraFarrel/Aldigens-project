<?php

namespace App\Services;

use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseLocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryStockService
{
    /**
     * Satu-satunya pintu perubahan stok produk dan pencatatan mutasinya.
     */
    public function adjust(Product|int $product, int $quantity, string $type = 'MASUK', array $context = []): Product
    {
        if ($quantity < 1) {
            throw ValidationException::withMessages(['quantity' => 'Quantity harus lebih besar dari 0.']);
        }

        return DB::transaction(function () use ($product, $quantity, $type, $context) {
            $productId = $product instanceof Product ? $product->id : $product;
            $lockedProduct = Product::query()->lockForUpdate()->find($productId);

            if (!$lockedProduct) {
                throw ValidationException::withMessages(['product_id' => 'Item tidak ditemukan.']);
            }

            $type = strtoupper($type);
            $isTransferOut = $type === 'TRANSFER' && (($context['transfer_direction'] ?? 'OUT') === 'OUT');
            $isOutbound = in_array($type, ['KELUAR', 'PRODUKSI KELUAR', 'RETURN'], true) || $isTransferOut;
            $warehouse = !empty($context['warehouse_id'])
                ? Warehouse::query()->lockForUpdate()->find($context['warehouse_id'])
                : Warehouse::query()->firstOrCreate(['code' => 'MAIN'], ['name' => 'Warehouse Utama', 'status' => 'AKTIF']);

            if (!$warehouse) {
                throw ValidationException::withMessages(['warehouse_id' => 'Warehouse tidak ditemukan.']);
            }

            $locationId = $context['warehouse_location_id'] ?? null;
            if ($locationId) {
                $location = WarehouseLocation::query()->where('warehouse_id', $warehouse->id)->find($locationId);
                if (!$location) {
                    throw ValidationException::withMessages(['warehouse_location_id' => 'Lokasi tidak berada di warehouse yang dipilih.']);
                }
            }

            $stockQuery = InventoryStock::query()
                ->where('product_id', $lockedProduct->id)
                ->where('warehouse_id', $warehouse->id);
            if ($locationId) {
                $stockQuery->where('warehouse_location_id', $locationId);
            } else {
                $stockQuery->whereNull('warehouse_location_id');
            }
            $stock = $stockQuery->lockForUpdate()->first();
            if (!$stock) {
                $stock = InventoryStock::create([
                    'product_id' => $lockedProduct->id,
                    'warehouse_id' => $warehouse->id,
                    'warehouse_location_id' => $locationId,
                    'quantity' => 0,
                ]);
            }

            $stockBefore = (int) $stock->quantity;
            $stockAfter = $isOutbound ? $stockBefore - $quantity : $stockBefore + $quantity;
            if ($stockAfter < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok {$lockedProduct->name} di {$warehouse->name} tidak mencukupi. Tersedia: {$stockBefore}.",
                ]);
            }

            $stock->update(['quantity' => $stockAfter]);
            // products.stock adalah total terproyeksi dari seluruh saldo lokasi.
            $lockedProduct->update(['stock' => InventoryStock::where('product_id', $lockedProduct->id)->sum('quantity')]);

            InventoryTransaction::create([
                'product_id' => $lockedProduct->id,
                'transaction_type' => $type,
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'user_id' => $context['user_id'] ?? null,
                'user_name' => $context['user_name'] ?? null,
                'client_pc' => $context['client_pc'] ?? null,
                'warehouse_id' => $warehouse->id,
                'warehouse_location_id' => $locationId,
                'reference_type' => $context['reference_type'] ?? null,
                'reference_id' => $context['reference_id'] ?? null,
                'reference_number' => $context['reference_number'] ?? null,
                'notes' => $context['notes'] ?? null,
                'transaction_time' => now(),
            ]);

            return $lockedProduct->fresh();
        });
    }
}
