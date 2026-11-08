<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Laporan periode yang dapat dipakai harian/mingguan/bulanan/tahunan/rentang.
     * weekly() dipertahankan apa adanya untuk kompatibilitas fitur lama.
     *
     * Query: ?period=daily|weekly|monthly|yearly|custom&date=YYYY-MM-DD&start_date=&end_date=
     */
    public function period(Request $request)
    {
        $period = strtolower((string) $request->query('period', 'weekly'));
        if (!in_array($period, ['daily', 'weekly', 'monthly', 'yearly', 'custom'], true)) {
            $period = 'weekly';
        }

        $dateStr = $request->query('date') ?: $request->query('week');
        $base    = $dateStr ? Carbon::parse($dateStr)->startOfDay() : Carbon::today();

        switch ($period) {
            case 'daily':
                $start = $base->copy()->startOfDay();
                $end   = $base->copy()->endOfDay();
                break;
            case 'monthly':
                $start = $base->copy()->startOfMonth()->startOfDay();
                $end   = $base->copy()->endOfMonth()->endOfDay();
                break;
            case 'yearly':
                $start = $base->copy()->startOfYear()->startOfDay();
                $end   = $base->copy()->endOfYear()->endOfDay();
                break;
            case 'custom':
                $rawStart = $request->query('start_date');
                $rawEnd   = $request->query('end_date');
                $start    = ($rawStart ? Carbon::parse($rawStart) : $base->copy())->startOfDay();
                $end      = ($rawEnd ? Carbon::parse($rawEnd) : $start->copy())->endOfDay();
                // Validasi: tanggal akhir tidak boleh lebih awal dari tanggal awal.
                if ($end->lt($start)) {
                    return response()->json(['message' => 'Tanggal akhir tidak boleh lebih awal dari tanggal awal.'], 422);
                }
                break;
            case 'weekly':
            default:
                $start = $base->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
                $end   = $base->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();
                break;
        }

        $startDate = $start->toDateString();
        $endDate   = $end->toDateString();

        $baseQuery = fn() => InventoryTransaction::query()
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate);

        $transactions = InventoryTransaction::with('product')
            ->whereDate('transaction_time', '>=', $startDate)
            ->whereDate('transaction_time', '<=', $endDate)
            ->orderBy('transaction_time', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $mapped = $transactions->map(function ($t) {
            return [
                'id'                 => $t->id,
                'transaction_type'   => $t->transaction_type,
                'transfer_direction' => $t->transfer_direction,
                'reference_type'     => $t->reference_type,
                'reference_number'   => $t->reference_number,
                'notes'              => $t->notes,
                'quantity'           => $t->quantity,
                'stock_before'       => $t->stock_before,
                'stock_after'        => $t->stock_after,
                'user_name'          => $t->user_name,
                'client_pc'          => $t->client_pc,
                'transaction_time'   => $t->transaction_time,
                'product'            => $t->product ? [
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

        // Ringkasan berdasarkan jenis mutasi. Transfer dihitung sekali (bukan IN + OUT).
        $typeTotals = $transactions->groupBy('transaction_type')->map(fn ($rows) => $rows->count());
        $totalIn    = $transactions->where('transaction_type', 'MASUK')->sum('quantity');
        $totalOut   = $transactions->where('transaction_type', 'KELUAR')->sum('quantity');

        $productSummary = $transactions
            ->groupBy('product_id')
            ->map(function ($txns) {
                $product  = $txns->first()->product;
                $totalIn  = $txns->where('transaction_type', 'MASUK')->sum('quantity');
                $totalOut = $txns->where('transaction_type', 'KELUAR')->sum('quantity');
                $transfer = $txns->where('transaction_type', 'TRANSFER')
                                 ->where('transfer_direction', '!=', 'IN')
                                 ->sum('quantity');
                return [
                    'product_code' => $product->product_code ?? '-',
                    'part_number'  => $product->part_number ?? '-',
                    'name'         => $product->name ?? '-',
                    'category'     => $product->category ?? '-',
                    'unit'         => $product->unit ?? 'Unit',
                    'total_in'     => (float) $totalIn,
                    'total_out'    => (float) $totalOut,
                    'total_transfer' => (float) $transfer,
                ];
            })
            ->sortBy('name')
            ->values();

        $currentProducts = Product::orderBy('name')->get(['product_code', 'part_number', 'name', 'category', 'unit', 'stock']);

        return response()->json([
            'period'             => $period,
            'selected_date'      => $base->toDateString(),
            'start_date'         => $startDate,
            'end_date'           => $endDate,
            'week_start'         => $start->format('d/m/Y'),
            'week_end'           => $end->format('d/m/Y'),
            'total_in'           => (float) $totalIn,
            'total_out'          => (float) $totalOut,
            'total_transactions' => $transactions->count(),
            'type_totals'        => $typeTotals,
            'weekly_transactions'=> $mapped,
            'product_summary'    => $productSummary,
            'current_products'   => $currentProducts,
        ]);
    }

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
