<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryTransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryTransaction::with(['product', 'warehouse', 'location'])
            ->orderBy('id', 'desc');

        if ($request->filled('type')) {
            $query->where('transaction_type', $request->type);
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $transactions = $query->get()->map(function ($t) {
            return [
                'id'               => $t->id,
                'transaction_type' => $t->transaction_type,
                'transfer_direction' => $t->transfer_direction,
                'quantity'         => $t->quantity,
                'stock_before'     => $t->stock_before,
                'stock_after'      => $t->stock_after,
                'user_name'        => $t->user_name,
                'client_pc'        => $t->client_pc,
                'notes'            => $t->notes,
                'transaction_time' => $t->transaction_time,
                'created_at'       => $t->created_at,
                'warehouse'        => $t->warehouse ? ['id' => $t->warehouse->id, 'code' => $t->warehouse->code, 'name' => $t->warehouse->name] : null,
                'location'         => $t->location ? ['id' => $t->location->id, 'code' => $t->location->code, 'name' => $t->location->name] : null,
                'reference_type'   => $t->reference_type,
                'reference_id'     => $t->reference_id,
                'reference_number' => $t->reference_number,
                'product'          => $t->product ? [
                    'id'           => $t->product->id,
                    'product_code' => $t->product->product_code,
                    'barcode'      => $t->product->barcode,
                    'part_number'  => $t->product->part_number,
                    'name'         => $t->product->name,
                    'category'     => $t->product->category,
                    'unit'         => $t->product->unit,
                    'stock'        => $t->product->stock,
                ] : null,
            ];
        });

        return response()->json(['data' => $transactions]);
    }

    /**
     * Transaksi tunggal: satu barang masuk/keluar.
     */
    public function store(Request $request, InventoryStockService $stockService)
    {
        $validated = $request->validate([
            'barcode' => 'required|string',
            'transaction_type' => 'required|in:MASUK,KELUAR,ADJUSTMENT,PRODUKSI MASUK,PRODUKSI KELUAR,RETURN',
            'quantity' => 'required|integer|min:1',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'warehouse_location_id' => 'nullable|exists:warehouse_locations,id',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|integer',
            'reference_number' => 'nullable|string|max:100',
            'user_name' => 'nullable|string|max:255',
            'client_pc' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $product = Product::findByCode($validated['barcode']);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produk tidak ditemukan untuk barcode: ' . $validated['barcode']], 404);
        }

        $updated = $stockService->adjust($product, $validated['quantity'], $validated['transaction_type'], [
            ...$validated,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Transaksi berhasil disimpan.', 'data' => $updated]);
    }

    /**
     * Transaksi batch: banyak barang sekaligus.
     */
    public function batch(Request $request, InventoryStockService $stockService)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:MASUK,KELUAR',
            'user_name'        => 'nullable|string|max:255',
            'client_pc'        => 'nullable|string|max:255',
            'items'            => 'required|array|min:1',
            'items.*.barcode'  => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes'    => 'nullable|string',
        ]);

        $transactionType = $validated['transaction_type'];
        $userName        = $validated['user_name'] ?? null;
        $clientPc        = $validated['client_pc'] ?? null;
        $items           = $validated['items'];

        // Validasi semua produk terlebih dahulu
        $resolvedItems = [];
        foreach ($items as $item) {
            $product = Product::findByCode($item['barcode']);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => "Produk tidak ditemukan untuk barcode: {$item['barcode']}",
                ], 404);
            }
            $resolvedItems[] = [
                'product'  => $product,
                'quantity' => $item['quantity'],
                'notes'    => $item['notes'] ?? null,
            ];
        }

        // Jika KELUAR, validasi stok dulu untuk semua item
        if ($transactionType === 'KELUAR') {
            $totals = [];
            foreach ($resolvedItems as $ri) {
                $pid = $ri['product']->id;
                $totals[$pid] = ($totals[$pid] ?? 0) + $ri['quantity'];
            }
            foreach ($resolvedItems as $ri) {
                $pid = $ri['product']->id;
                if ($totals[$pid] > $ri['product']->stock) {
                    $name = $ri['product']->name;
                    $avail = $ri['product']->stock;
                    $need  = $totals[$pid];
                    return response()->json([
                        'success' => false,
                        'message' => "Stok {$name} tidak mencukupi. Tersedia: {$avail}, diminta: {$need}.",
                    ], 400);
                }
            }
        }

        // Semua perubahan stok tetap melalui service terpusat dan satu transaksi database.
        DB::transaction(function () use ($resolvedItems, $transactionType, $userName, $clientPc, $stockService, $request) {
            foreach ($resolvedItems as $ri) {
                $stockService->adjust($ri['product'], $ri['quantity'], $transactionType, [
                    'user_id' => $request->user()?->id,
                    'user_name' => $userName,
                    'client_pc' => $clientPc,
                    'notes' => $ri['notes'],
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Semua transaksi batch berhasil disimpan.',
        ]);
    }
}
