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
                'group_key' => $context['group_key'] ?? null,
                'transaction_type' => $type,
                'transfer_direction' => $context['transfer_direction'] ?? null,
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

    /**
     * Menyesuaikan total stok pada satu warehouse tanpa membuat saldo baru
     * di lokasi umum. Digunakan khusus oleh Stock Opname level warehouse.
     */
    public function adjustWarehouseTotal(Product|int $product, int $difference, array $context = []): Product
    {
        if ($difference === 0) {
            return $product instanceof Product ? $product->fresh() : Product::findOrFail($product);
        }

        return DB::transaction(function () use ($product, $difference, $context) {
            $productId = $product instanceof Product ? $product->id : $product;
            $lockedProduct = Product::query()->lockForUpdate()->find($productId);

            if (!$lockedProduct) {
                throw ValidationException::withMessages(['product_id' => 'Item tidak ditemukan.']);
            }

            $warehouse = Warehouse::query()->lockForUpdate()->find($context['warehouse_id'] ?? null);
            if (!$warehouse) {
                throw ValidationException::withMessages(['warehouse_id' => 'Warehouse tidak ditemukan.']);
            }

            $locationId = $context['warehouse_location_id'] ?? null;
            $stocksQuery = InventoryStock::query()
                ->where('product_id', $lockedProduct->id)
                ->where('warehouse_id', $warehouse->id);
            if ($locationId) {
                $stocksQuery->where('warehouse_location_id', $locationId);
            }
            $stocks = $stocksQuery
                ->lockForUpdate()
                ->orderBy('id')
                ->get();
            $stockBefore = (int) $stocks->sum('quantity');
            $stockAfter = $stockBefore + $difference;

            if ($stockAfter < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok {$lockedProduct->name} di {$warehouse->name} tidak mencukupi. Tersedia: {$stockBefore}.",
                ]);
            }

            if ($difference < 0) {
                $remaining = abs($difference);
                foreach ($stocks as $stock) {
                    if ($remaining === 0) break;
                    $decrease = min((int) $stock->quantity, $remaining);
                    if ($decrease > 0) {
                        $stock->decrement('quantity', $decrease);
                        $remaining -= $decrease;
                    }
                }
            } else {
                $stock = $stocks->firstWhere('warehouse_location_id', '!=', null) ?: $stocks->first();
                if (!$stock) {
                    if (!$locationId) {
                        throw ValidationException::withMessages([
                            'quantity' => 'Saldo warehouse belum tersedia untuk adjustment Stock Opname.',
                        ]);
                    }
                    $stock = InventoryStock::create([
                        'product_id' => $lockedProduct->id,
                        'warehouse_id' => $warehouse->id,
                        'warehouse_location_id' => $locationId,
                        'quantity' => 0,
                    ]);
                }
                $stock->increment('quantity', $difference);
            }

            $lockedProduct->update([
                'stock' => InventoryStock::where('product_id', $lockedProduct->id)->sum('quantity'),
            ]);

            InventoryTransaction::create([
                'product_id' => $lockedProduct->id,
                'group_key' => $context['group_key'] ?? null,
                'transaction_type' => 'ADJUSTMENT',
                'transfer_direction' => null,
                'quantity' => $difference,
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

    /**
     * Membatalkan satu grup mutasi (penerimaan / pengeluaran / transfer) dengan
     * mengembalikan saldo lokasi ke nilai sebelum mutasi dibuat.
     */
    public function revertGroup(?string $groupKey = null, ?int $transactionId = null): int
    {
        return DB::transaction(function () use ($groupKey, $transactionId) {
            $query = InventoryTransaction::query()->orderBy('id', 'asc');
            if ($groupKey) {
                $query->where('group_key', $groupKey);
            } elseif ($transactionId) {
                $query->where('id', $transactionId);
            } else {
                return 0;
            }

            $transactions = $query->get();
            $affectedProducts = [];

            foreach ($transactions as $transaction) {
                $stockQuery = InventoryStock::query()
                    ->where('product_id', $transaction->product_id)
                    ->where('warehouse_id', $transaction->warehouse_id);
                if ($transaction->warehouse_location_id) {
                    $stockQuery->where('warehouse_location_id', $transaction->warehouse_location_id);
                } else {
                    $stockQuery->whereNull('warehouse_location_id');
                }

                $stock = $stockQuery->lockForUpdate()->first();
                if ($stock) {
                    $stock->update(['quantity' => (int) $transaction->stock_before]);
                }

                $affectedProducts[$transaction->product_id] = true;
                $transaction->delete();
            }

            foreach (array_keys($affectedProducts) as $productId) {
                Product::where('id', $productId)->update([
                    'stock' => InventoryStock::where('product_id', $productId)->sum('quantity'),
                ]);
            }

            return $transactions->count();
        });
    }
}
