<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $totalProducts = Product::where('status', 'AKTIF')->count();
        $totalStock = Product::sum('stock');
        $today = now()->toDateString();
        $totalIn = InventoryTransaction::where('transaction_type', 'MASUK')->whereDate('transaction_time', $today)->sum('quantity');
        $totalOut = InventoryTransaction::whereIn('transaction_type', ['KELUAR', 'PRODUKSI KELUAR', 'RETURN'])->whereDate('transaction_time', $today)->sum('quantity');
        $minimumStock = Product::whereColumn('stock', '<=', 'minimum_stock')->where('stock', '>', 0)->count();
        $outOfStock = Product::where('stock', '<=', 0)->count();
        $overstock = Product::whereNotNull('maximum_stock')->whereColumn('stock', '>', 'maximum_stock')->count();

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
            'total_products' => $totalProducts,
            'total_stock' => $totalStock,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'minimum_stock' => $minimumStock,
            'out_of_stock' => $outOfStock,
            'overstock' => $overstock,
            'total_customers' => class_exists(Customer::class) ? Customer::where('status', 'AKTIF')->count() : 0,
            'total_suppliers' => class_exists(Supplier::class) ? Supplier::where('status', 'AKTIF')->count() : 0,
            'recent_transactions' => $recentTransactions,
            'stock_alerts' => Product::orderBy('stock')->get(['id', 'part_number', 'name', 'stock', 'minimum_stock', 'maximum_stock', 'unit'])->map(function ($product) {
                $status = $product->stock <= 0 ? 'HABIS' : ($product->maximum_stock !== null && $product->stock > $product->maximum_stock ? 'OVERSTOCK' : ($product->stock <= $product->minimum_stock ? 'MINIMUM' : 'AMAN'));
                return [...$product->toArray(), 'status_label' => $status];
            }),
        ]);
    }
}
