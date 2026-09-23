<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryTransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryTransaction::with('product')
            ->orderBy('id', 'desc');

        if ($request->has('type') && in_array($request->type, ['MASUK', 'KELUAR'])) {
            $query->where('transaction_type', $request->type);
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $transactions = $query->get()->map(function ($t) {
            return [
                'id'               => $t->id,
                'transaction_type' => $t->transaction_type,
                'quantity'         => $t->quantity,
                'stock_before'     => $t->stock_before,
                'stock_after'      => $t->stock_after,
                'user_name'        => $t->user_name,
                'client_pc'        => $t->client_pc,
                'notes'            => $t->notes,
                'transaction_time' => $t->transaction_time,
                'created_at'       => $t->created_at,
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'barcode'          => 'required|string',
            'transaction_type' => 'required|in:MASUK,KELUAR',
            'quantity'         => 'required|integer|min:1',
            'user_name'        => 'nullable|string|max:255',
            'client_pc'        => 'nullable|string|max:255',
            'notes'            => 'nullable|string',
        ]);

        $product = Product::findByCode($validated['barcode']);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan untuk barcode: ' . $validated['barcode'],
            ], 404);
        }

        $quantity    = $validated['quantity'];
        $stockBefore = $product->stock;

        if ($validated['transaction_type'] === 'KELUAR') {
            if ($quantity > $stockBefore) {
                return response()->json([
                    'success' => false,
                    'message' => "Stok {$product->name} tidak mencukupi. Stok tersedia: {$stockBefore}, yang diminta: {$quantity}.",
                ], 400);
            }
            $stockAfter = $stockBefore - $quantity;
        } else {
            $stockAfter = $stockBefore + $quantity;
        }

        DB::transaction(function () use ($product, $validated, $stockBefore, $stockAfter, $quantity) {
            $product->update(['stock' => $stockAfter]);

            InventoryTransaction::create([
                'product_id'       => $product->id,
                'transaction_type' => $validated['transaction_type'],
                'quantity'         => $quantity,
                'stock_before'     => $stockBefore,
                'stock_after'      => $stockAfter,
                'user_name'        => $validated['user_name'] ?? null,
                'client_pc'        => $validated['client_pc'] ?? null,
                'notes'            => $validated['notes'] ?? null,
                'transaction_time' => now(),
            ]);
        });

        $product->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil disimpan.',
            'data'    => $product,
        ]);
    }

    /**
     * Transaksi batch: banyak barang sekaligus.
     */
    public function batch(Request $request)
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

        // Eksekusi semua transaksi
        DB::transaction(function () use ($resolvedItems, $transactionType, $userName, $clientPc) {
            foreach ($resolvedItems as $ri) {
                $product     = $ri['product'];
                $quantity    = $ri['quantity'];
                $stockBefore = $product->stock;
                $stockAfter  = $transactionType === 'MASUK'
                    ? $stockBefore + $quantity
                    : $stockBefore - $quantity;

                $product->update(['stock' => $stockAfter]);

                InventoryTransaction::create([
                    'product_id'       => $product->id,
                    'transaction_type' => $transactionType,
                    'quantity'         => $quantity,
                    'stock_before'     => $stockBefore,
                    'stock_after'      => $stockAfter,
                    'user_name'        => $userName,
                    'client_pc'        => $clientPc,
                    'notes'            => $ri['notes'],
                    'transaction_time' => now(),
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Semua transaksi batch berhasil disimpan.',
        ]);
    }
}
