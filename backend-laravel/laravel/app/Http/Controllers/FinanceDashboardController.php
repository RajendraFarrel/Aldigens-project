<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\CapitalEntry;
use App\Models\CashBank;
use App\Models\JournalVoucher;
use App\Services\CashBankService;
use Illuminate\Http\Request;

/**
 * Dashboard Keuangan. Terpisah dari DashboardController (dashboard inventory).
 * Saldo diambil dari CashBankService (sumber yang sama dengan halaman Kas & Bank),
 * jadi angkanya selalu sama dengan Buku Besar dan Neraca.
 */
class FinanceDashboardController extends Controller
{
    public function summary(Request $request, CashBankService $service)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to   = $request->query('to', now()->endOfMonth()->toDateString());

        // Saldo per Kas/Bank. SENGAJA tanpa filter tanggal: CashBankService menerapkan
        // filter itu ke saldo_akhir juga, sehingga saldo hanya berisi mutasi periode.
        // Tanpa filter = saldo sebenarnya (saldo awal + semua jurnal POSTED).
        $ringkasan = $service->ringkasan();

        $cashAccountIds = CashBank::pluck('account_id')->all();

        // Uang masuk/keluar periode ini (transfer antar kas tidak dihitung)
        $periodVouchers = $this->cashVouchers($cashAccountIds)
            ->whereBetween('tanggal', [$from, $to])
            ->get();

        $totalIn = 0.0;
        $totalOut = 0.0;
        foreach ($periodVouchers as $v) {
            if ($v->jenis === 'Transfer Kas/Bank') {
                continue;
            }
            [$in, $out] = $this->flow($v, $cashAccountIds);
            $totalIn += $in;
            $totalOut += $out;
        }

        // Mutasi terakhir
        $recent = $this->cashVouchers($cashAccountIds)
            ->orderByDesc('tanggal')->orderByDesc('id')->limit(10)->get()
            ->map(function ($v) use ($cashAccountIds) {
                [$in, $out] = $this->flow($v, $cashAccountIds);
                return [
                    'no_voucher'    => $v->no_voucher,
                    'tanggal'       => substr((string) $v->tanggal, 0, 10),
                    'keterangan'    => $v->keterangan,
                    'kas_bank'      => $v->kas_bank,
                    'jenis'         => $v->jenis,
                    'arah'          => $v->jenis === 'Transfer Kas/Bank' ? 'transfer' : ($in > 0 ? 'masuk' : 'keluar'),
                    'nominal'       => $in > 0 ? $in : $out,
                ];
            })->values();

        // Aset
        $assets = Asset::where('status', 'active')->orderBy('acquisition_date', 'desc')->get();
        $movable = $assets->where('category', 'movable')->values();
        $immovable = $assets->where('category', 'immovable')->values();

        // Modal
        $capital = CapitalEntry::orderByDesc('entry_date')->orderByDesc('id')->get();
        $capitalTotal = $capital->sum(fn ($e) => $e->type === 'withdrawal' ? -$e->amount : $e->amount);

        return response()->json([
            'status' => 'success',
            'data' => [
                'period'               => ['from' => $from, 'to' => $to],
                'cash_bank_summary'    => $ringkasan,
                'total_in'             => round($totalIn, 2),
                'total_out'            => round($totalOut, 2),
                'recent_transactions'  => $recent,
                'assets' => [
                    'movable_total'   => round($movable->sum(fn ($a) => $a->book_value), 2),
                    'immovable_total' => round($immovable->sum(fn ($a) => $a->book_value), 2),
                    'total'           => round($assets->sum(fn ($a) => $a->book_value), 2),
                    'movable'         => $movable,
                    'immovable'       => $immovable,
                ],
                'capital_total'   => round($capitalTotal, 2),
                'capital_history' => $capital,
            ],
        ]);
    }

    private function cashVouchers(array $cashAccountIds)
    {
        return JournalVoucher::where('status', 'POSTED')
            ->whereHas('lines', fn ($q) => $q->whereIn('account_id', $cashAccountIds))
            ->with('lines');
    }

    /** [uang masuk, uang keluar] pada akun kas/bank untuk satu voucher */
    private function flow(JournalVoucher $v, array $cashAccountIds): array
    {
        $in = 0.0;
        $out = 0.0;
        foreach ($v->lines as $line) {
            if (in_array($line->account_id, $cashAccountIds)) {
                $in += (float) $line->debit;
                $out += (float) $line->kredit;
            }
        }
        return [$in, $out];
    }
}
