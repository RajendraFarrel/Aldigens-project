<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function weekly(Request $request)
    {
        // Tentukan tanggal yang dipilih (default: hari ini)
        $selectedDateStr = $request->query('week', '');
        $selectedDate    = $selectedDateStr ? Carbon::parse($selectedDateStr) : Carbon::today();

        // Hitung range minggu (Senin - Minggu)
        $monday = $selectedDate->copy()->startOfWeek(Carbon::MONDAY);
        $sunday = $selectedDate->copy()->endOfWeek(Carbon::SUNDAY);

        $startDate = $monday->toDateString();
        $endDate   = $sunday->toDateString();

        // Transaksi dalam rentang minggu ini
        $weeklyTransactions = InventoryTransaction::with('product')
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->orderBy('transaction_time', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($t) {
                return [
                    'id'               => $t->id,
                    'transaction_type' => $t->transaction_type,
                    'quantity'         => $t->quantity,
                    'stock_before'     => $t->stock_before,
                    'stock_after'      => $t->stock_after,
                    'user_name'        => $t->user_name,
                    'client_pc'        => $t->client_pc,
                    'transaction_time' => $t->transaction_time,
                    'product'          => $t->product ? [
                        'id'           => $t->product->id,
                        'product_code' => $t->product->product_code,
                        'part_number'  => $t->product->part_number,
                        'name'         => $t->product->name,
                        'barcode'      => $t->product->barcode,
                        'category'     => $t->product->category,
                        'unit'         => $t->product->unit,
                    ] : null,
                ];
            });

        $totalIn  = InventoryTransaction::where('transaction_type', 'MASUK')
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->sum('quantity');

        $totalOut = InventoryTransaction::where('transaction_type', 'KELUAR')
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->sum('quantity');

        $totalTransactions = InventoryTransaction::whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->count();

        // Ringkasan per produk
        $productSummary = InventoryTransaction::with('product')
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->get()
            ->groupBy('product_id')
            ->map(function ($txns) {
                $product   = $txns->first()->product;
                $totalIn   = $txns->where('transaction_type', 'MASUK')->sum('quantity');
                $totalOut  = $txns->where('transaction_type', 'KELUAR')->sum('quantity');
                return [
                    'product_code' => $product->product_code ?? '-',
                    'part_number'  => $product->part_number ?? '-',
                    'name'         => $product->name ?? '-',
                    'category'     => $product->category ?? '-',
                    'unit'         => $product->unit ?? 'Unit',
                    'total_in'     => $totalIn,
                    'total_out'    => $totalOut,
                ];
            })
            ->values();

        // Stok saat ini semua produk
        $currentProducts = Product::orderBy('name')->get(['product_code', 'part_number', 'name', 'category', 'unit', 'stock']);

        return response()->json([
            'selected_date'      => $selectedDate->toDateString(),
            'week_start'         => $monday->format('d/m/Y'),
            'week_end'           => $sunday->format('d/m/Y'),
            'total_in'           => $totalIn,
            'total_out'          => $totalOut,
            'total_transactions' => $totalTransactions,
            'weekly_transactions'=> $weeklyTransactions,
            'product_summary'    => $productSummary,
            'current_products'   => $currentProducts,
        ]);
    }
}
