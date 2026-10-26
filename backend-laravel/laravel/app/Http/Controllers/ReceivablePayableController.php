<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentReceipt;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\PaymentService;
use App\Services\ReceivablePayableService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Modul Utang Piutang: ringkasan, piutang, utang, aging, pembayaran, riwayat.
 */
class ReceivablePayableController extends Controller
{
    public function __construct(
        private ReceivablePayableService $rp,
        private PaymentService $payments,
    ) {}

    private function filter(Request $request): array
    {
        return [
            'customer_id' => $request->query('customer_id') ?: null,
            'supplier_id' => $request->query('supplier_id') ?: null,
            'from'        => $request->query('from') ?: null,
            'to'          => $request->query('to') ?: null,
            'status'      => $request->query('status') ?: null,
            'search'      => $request->query('search') ?: null,
        ];
    }

    /** Ringkasan gabungan piutang + utang. */
    public function ringkasan(Request $request)
    {
        $f = $this->filter($request);
        $piutang = $this->rp->piutang($f);
        $utang = $this->rp->utang($f);

        // Rekap per customer & per supplier (dari baris yang sudah dihitung).
        $perCustomer = collect($piutang['rows'])
            ->filter(fn($r) => $r['sisa'] > 0.009)
            ->groupBy('customer_name')
            ->map(fn($g, $nama) => [
                'customer_name' => $nama,
                'invoice'       => $g->count(),
                'total'         => round($g->sum('total'), 2),
                'dibayar'       => round($g->sum('dibayar'), 2),
                'sisa'          => round($g->sum('sisa'), 2),
                'terlambat'     => round($g->where('status', 'OVERDUE')->sum('sisa'), 2),
            ])
            ->sortByDesc('sisa')
            ->values();

        $perSupplier = collect($utang['rows'])
            ->filter(fn($r) => $r['sisa'] > 0.009)
            ->groupBy('supplier_name')
            ->map(fn($g, $nama) => [
                'supplier_name' => $nama,
                'invoice'       => $g->count(),
                'total'         => round($g->sum('total'), 2),
                'dibayar'       => round($g->sum('dibayar'), 2),
                'sisa'          => round($g->sum('sisa'), 2),
                'terlambat'     => round($g->where('status', 'OVERDUE')->sum('sisa'), 2),
            ])
            ->sortByDesc('sisa')
            ->values();

        $piutangAkun = $this->rp->cariAkunKontrol('piutang');
        $utangAkun = $this->rp->cariAkunKontrol('utang');

        return response()->json([
            'piutang' => [
                'ringkasan'    => $piutang['ringkasan'],
                'aging'        => $this->rp->aging(collect($piutang['rows'])),
                'per_customer' => $perCustomer,
                'catatan'      => $piutang['catatan'],
            ],
            'utang' => [
                'ringkasan'   => $utang['ringkasan'],
                'aging'       => $this->rp->aging(collect($utang['rows'])),
                'per_supplier' => $perSupplier,
                'catatan'     => $utang['catatan'],
            ],
            'posisi_neto' => round($piutang['ringkasan']['total_berjalan'] - $utang['ringkasan']['total_berjalan'], 2),
            'konfigurasi' => [
                'piutang' => [
                    'akun'     => $piutangAkun['account'] ? "{$piutangAkun['account']->nomor_akun} — {$piutangAkun['account']->nama_akun}" : null,
                    'pesan'    => $piutangAkun['pesan'],
                    'kandidat' => $piutangAkun['kandidat']->map(fn($a) => "{$a->nomor_akun} — {$a->nama_akun}")->values(),
                ],
                'utang' => [
                    'akun'     => $utangAkun['account'] ? "{$utangAkun['account']->nomor_akun} — {$utangAkun['account']->nama_akun}" : null,
                    'pesan'    => $utangAkun['pesan'],
                    'kandidat' => $utangAkun['kandidat']->map(fn($a) => "{$a->nomor_akun} — {$a->nama_akun}")->values(),
                ],
            ],
        ]);
    }

    public function piutang(Request $request)
    {
        return response()->json($this->rp->piutang($this->filter($request)));
    }

    public function utang(Request $request)
    {
        return response()->json($this->rp->utang($this->filter($request)));
    }

    /** Umur tagihan: gabungan piutang & utang dengan bucket aging. */
    public function aging(Request $request)
    {
        $f = $this->filter($request);
        $piutang = $this->rp->piutang($f);
        $utang = $this->rp->utang($f);

        return response()->json([
            'piutang' => $this->rp->aging(collect($piutang['rows'])),
            'utang'   => $this->rp->aging(collect($utang['rows'])),
            'detail_piutang' => collect($piutang['rows'])->filter(fn($r) => $r['sisa'] > 0.009)->values(),
            'detail_utang'   => collect($utang['rows'])->filter(fn($r) => $r['sisa'] > 0.009)->values(),
        ]);
    }

    /* ---------------- Penerimaan dari customer ---------------- */

    public function storePenerimaan(Request $request)
    {
        $data = $request->validate([
            'customer_id'      => ['required', 'integer', 'exists:customers,id'],
            'cash_bank_id'     => ['required', 'integer', 'exists:cash_banks,id'],
            'payment_date'     => ['required', 'date'],
            'amount'           => ['required', 'numeric', 'gt:0'],
            'reference_number' => ['nullable', 'string', 'max:191'],
            'notes'            => ['nullable', 'string', 'max:1000'],
            'request_key'      => ['nullable', 'string', 'max:100'],
            'allocations'                      => ['required', 'array', 'min:1'],
            'allocations.*.invoice_id'         => ['required', 'integer', 'exists:invoices,id'],
            'allocations.*.amount'             => ['required', 'numeric', 'gt:0'],
        ], [], [
            'customer_id'  => 'Customer',
            'cash_bank_id' => 'Kas/Bank Tujuan',
            'payment_date' => 'Tanggal Penerimaan',
            'amount'       => 'Jumlah Diterima',
            'allocations'  => 'Alokasi Invoice',
        ]);

        $data['customer_name'] = \App\Models\Customer::whereKey($data['customer_id'])->value('customer_name');

        $receipt = $this->payments->terimaDariCustomer($request, $data);

        return response()->json([
            'message' => "Penerimaan {$receipt->receipt_number} berhasil diposting.",
            'data'    => $receipt,
        ], 201);
    }

    public function indexPenerimaan(Request $request)
    {
        $rows = PaymentReceipt::with(['customer', 'cashBank', 'allocations.invoice', 'journalVoucher'])
            ->when($request->query('customer_id'), fn($q, $c) => $q->where('customer_id', $c))
            ->when($request->query('from'), fn($q, $d) => $q->whereDate('payment_date', '>=', $d))
            ->when($request->query('to'), fn($q, $d) => $q->whereDate('payment_date', '<=', $d))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows);
    }

    /* ---------------- Pembayaran ke supplier ---------------- */

    public function storePembayaran(Request $request)
    {
        $data = $request->validate([
            'supplier_id'      => ['required', 'integer', 'exists:suppliers,id'],
            'cash_bank_id'     => ['required', 'integer', 'exists:cash_banks,id'],
            'payment_date'     => ['required', 'date'],
            'amount'           => ['required', 'numeric', 'gt:0'],
            'reference_number' => ['nullable', 'string', 'max:191'],
            'notes'            => ['nullable', 'string', 'max:1000'],
            'request_key'      => ['nullable', 'string', 'max:100'],
            'allocations'                          => ['required', 'array', 'min:1'],
            'allocations.*.purchase_invoice_id'    => ['required', 'integer', 'exists:purchase_invoices,id'],
            'allocations.*.amount'                 => ['required', 'numeric', 'gt:0'],
        ], [], [
            'supplier_id'  => 'Supplier',
            'cash_bank_id' => 'Kas/Bank Sumber',
            'payment_date' => 'Tanggal Pembayaran',
            'amount'       => 'Jumlah Dibayar',
            'allocations'  => 'Alokasi Tagihan',
        ]);

        $data['supplier_name'] = \App\Models\Supplier::whereKey($data['supplier_id'])->value('supplier_name');

        $payment = $this->payments->bayarKeSupplier($request, $data);

        return response()->json([
            'message' => "Pembayaran {$payment->payment_number} berhasil diposting.",
            'data'    => $payment,
        ], 201);
    }

    public function indexPembayaran(Request $request)
    {
        $rows = SupplierPayment::with(['supplier', 'cashBank', 'allocations.purchaseInvoice', 'journalVoucher'])
            ->when($request->query('supplier_id'), fn($q, $s) => $q->where('supplier_id', $s))
            ->when($request->query('from'), fn($q, $d) => $q->whereDate('payment_date', '>=', $d))
            ->when($request->query('to'), fn($q, $d) => $q->whereDate('payment_date', '<=', $d))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows);
    }

    /**
     * Customer & supplier untuk pilihan form (filter, penerimaan, pembayaran).
     *
     * Kontrak respons tetap {"customers": [...], "suppliers": [...]} — array
     * datar tanpa pembungkus `data`, memakai kolom nama & ID apa adanya.
     * Data kosong tetap respons 200, bukan error: UI yang membedakan empty state.
     */
    public function masterPelanggan(Request $request)
    {
        // `only=customers|suppliers` → muat satu bagian saja, sehingga kegagalan
        // salah satu master tidak ikut menggagalkan yang lain di UI.
        $only = $request->query('only');

        try {
            $payload = [];

            if ($only === null || $only === 'customers') {
                $payload['customers'] = $this->masterRows(Customer::class, 'customer');
            }

            if ($only === null || $only === 'suppliers') {
                $payload['suppliers'] = $this->masterRows(Supplier::class, 'supplier');
            }

            return response()->json($payload);
        } catch (\Throwable $e) {
            report($e);

            $pihak = $only === 'suppliers' ? 'supplier' : ($only === 'customers' ? 'customer' : 'customer/supplier');

            return response()->json([
                'message' => "Gagal memuat master {$pihak} dari database.",
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Ambil kolom master yang benar-benar ada di tabel, sehingga perbedaan
     * skema (kolom belum dimigrasi / migrasi belum dijalankan) tidak berubah
     * menjadi HTTP 500 yang menutup seluruh halaman Utang Piutang.
     */
    private function masterRows(string $model, string $prefix): array
    {
        $table = (new $model)->getTable();
        $columns = Schema::getColumnListing($table);

        $wanted = ["{$prefix}_code", "{$prefix}_name", 'status'];
        $select = array_values(array_intersect(array_merge(['id'], $wanted), $columns));

        $query = $model::query()->select($select);

        if (in_array("{$prefix}_name", $columns, true)) {
            $query->orderBy("{$prefix}_name");
        }

        return $query->get()->toArray();
    }
}
