<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $totalProducts = Product::count();
        $totalStock    = Product::sum('stock');
        $totalIn       = InventoryTransaction::where('transaction_type', 'MASUK')->sum('quantity');
        $totalOut      = InventoryTransaction::where('transaction_type', 'KELUAR')->sum('quantity');

        $recentTransactions = InventoryTransaction::with('product')
            ->orderBy('id', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($t) {
                return [
                    'id'               => $t->id,
                    'transaction_type' => $t->transaction_type,
                    'quantity'         => $t->quantity,
                    'stock_before'     => $t->stock_before,
                    'stock_after'      => $t->stock_after,
                    'user_name'        => $t->user_name,
                    'transaction_time' => $t->transaction_time,
                    'product'          => $t->product ? [
                        'id'           => $t->product->id,
                        'product_code' => $t->product->product_code,
                        'part_number'  => $t->product->part_number,
                        'name'         => $t->product->name,
                        'barcode'      => $t->product->barcode,
                        'unit'         => $t->product->unit,
                    ] : null,
                ];
            });

        return response()->json([
            'total_products'      => $totalProducts,
            'total_stock'         => $totalStock,
            'total_in'            => $totalIn,
            'total_out'           => $totalOut,
            'recent_transactions' => $recentTransactions,
        ]);
    }
}
