<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\PurchaseInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Logika Piutang Customer & Utang Supplier.
 *
 * Prinsip:
 * - Tidak ada tabel saldo. Sisa = tagihan - alokasi pembayaran POSTED.
 * - Jurnal memakai journal_vouchers/journal_lines existing.
 * - Status OVERDUE dihitung (turunan) dari due_date + sisa, bukan disimpan.
 * - Akun piutang/utang TIDAK di-hardcode: dicari dari COA lalu, bila tidak
 *   ada, dipilih dari konfigurasi .env (ACCOUNTING_PIUTANG_KODE / UTANG_KODE).
 */
class ReceivablePayableService
{
    /* ------------------------------------------------------------------
     * Akun COA Piutang / Utang
     * ------------------------------------------------------------------ */

    /**
     * Cari akun piutang/utang dari COA berdasarkan kata kunci nama akun,
     * tipe, akun detail, dan status aktif. Bila tidak ditemukan / ambigu,
     * kembalikan daftar kandidat untuk dipilih pengguna — jangan menebak.
     *
     * @return array{account: ?Account, kandidat: Collection, pesan: ?string}
     */
    public function cariAkunKontrol(string $jenis): array
    {
        $config = $jenis === 'piutang' ? 'accounting.piutang_kode' : 'accounting.utang_kode';
        $kata = $jenis === 'piutang' ? 'piutang' : 'utang';
        $tipe = $jenis === 'piutang' ? 'Aset' : 'Liabilitas';

        // 1) Konfigurasi eksplisit (kode akun) — paling aman & dapat diatur perusahaan.
        $kode = config($config);
        if ($kode) {
            $akun = Account::selectable()->where('nomor_akun', $kode)->first();
            if ($akun) {
                return ['account' => $akun, 'kandidat' => collect([$akun]), 'pesan' => null];
            }
        }

        // 2) Cari dari COA berdasarkan nama.
        $kandidat = Account::selectable()
            ->where('tipe_akun', $tipe)
            ->where(function ($q) use ($kata) {
                $q->where('nama_akun', 'like', "%{$kata}%");
            })
            ->orderBy('nomor_akun')
            ->get();

        if ($kandidat->isEmpty()) {
            return [
                'account'  => null,
                'kandidat' => $kandidat,
                'pesan'    => $jenis === 'piutang'
                    ? 'Akun Piutang Usaha belum ada di Chart of Account. Buat akun tipe Aset (mis. "Piutang Usaha") lalu isi kode akunnya pada konfigurasi ACCOUNTING_PIUTANG_KODE.'
                    : 'Akun Utang Usaha belum ada di Chart of Account. Buat akun tipe Liabilitas (mis. "Utang Usaha") lalu isi kode akunnya pada konfigurasi ACCOUNTING_UTANG_KODE.',
            ];
        }

        // Ambil yang namanya paling tepat (piutang usaha / utang usaha).
        $tepat = $kandidat->first(fn($a) => stripos($a->nama_akun, $kata . ' usaha') !== false);

        if ($tepat) {
            return ['account' => $tepat, 'kandidat' => $kandidat, 'pesan' => null];
        }

        if ($kandidat->count() === 1) {
            return ['account' => $kandidat->first(), 'kandidat' => $kandidat, 'pesan' => null];
        }

        return [
            'account'  => null,
            'kandidat' => $kandidat,
            'pesan'    => "Lebih dari satu akun {$kata} ditemukan di COA. Tentukan akun kontrol agar jurnal tidak salah (set ACCOUNTING_"
                . ($jenis === 'piutang' ? 'PIUTANG' : 'UTANG') . '_KODE).',
        ];
    }

    /** Akun kontrol atau gagal dengan pesan panduan konfigurasi. */
    public function akunKontrolOrFail(string $jenis): Account
    {
        $hasil = $this->cariAkunKontrol($jenis);

        if (! $hasil['account']) {
            throw ValidationException::withMessages([
                'account' => $hasil['pesan'],
                'kandidat' => $hasil['kandidat']->map(fn($a) => "{$a->nomor_akun} — {$a->nama_akun}")->values()->all(),
            ]);
        }

        return $hasil['account'];
    }

    /* ------------------------------------------------------------------
     * Saldo & status
     * ------------------------------------------------------------------ */

    /**
     * Total alokasi sah (pembayaran POSTED) per invoice penjualan.
     * @return array<int,float>
     */
    public function alokasiPerInvoice(): array
    {
        return $this->jumlahAlokasi('payment_receipt_allocations', 'payment_receipt_id', 'payment_receipts', 'invoice_id');
    }

    /** @return array<int,float> */
    public function alokasiPerPurchaseInvoice(): array
    {
        return $this->jumlahAlokasi('supplier_payment_allocations', 'supplier_payment_id', 'supplier_payments', 'purchase_invoice_id');
    }

    /**
     * Jumlah alokasi per dokumen tujuan, HANYA dari pembayaran berstatus POSTED.
     *
     * @return array<int,float> [id_dokumen => total_alokasi]
     */
    private function jumlahAlokasi(string $tabel, string $kolomFk, string $tabelHeader, string $kunciTujuan): array
    {
        $rows = DB::table($tabel)
            ->join($tabelHeader, "{$tabelHeader}.id", '=', "{$tabel}.{$kolomFk}")
            ->where("{$tabelHeader}.journal_status", 'POSTED')
            ->groupBy("{$tabel}.{$kunciTujuan}")
            ->selectRaw("{$tabel}.{$kunciTujuan} as target_id, SUM({$tabel}.amount) as total")
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->target_id] = round((float) $row->total, 2);
        }

        return $out;
    }

    /** Status pembayaran turunan: UNPAID / PARTIALLY_PAID / PAID / OVERDUE. */
    public function statusPembayaran(?string $dueDate, float $total, float $dibayar): string
    {
        $sisa = round($total - $dibayar, 2);

        if ($sisa <= 0.009) {
            return 'PAID';
        }
        if ($dibayar > 0.009) {
            // Sebagian sudah dibayar; tetap OVERDUE bila lewat jatuh tempo.
            return $this->lewatJatuhTempo($dueDate) ? 'OVERDUE' : 'PARTIALLY_PAID';
        }

        return $this->lewatJatuhTempo($dueDate) ? 'OVERDUE' : 'UNPAID';
    }

    public function lewatJatuhTempo(?string $dueDate): bool
    {
        if (! $dueDate) {
            return false;
        }

        return strtotime(substr($dueDate, 0, 10)) < strtotime(now()->format('Y-m-d'));
    }

    /**
     * Daftar piutang customer (bersumber dari tabel invoices — bukan salinan).
     *
     * @param  array{customer_id?: int|null, from?: string|null, to?: string|null, status?: string|null, search?: string|null}  $filter
     */
    public function piutang(array $filter = []): array
    {
        $alokasi = $this->alokasiPerInvoice();

        $rows = Invoice::query()
            ->with(['items', 'salesOrder'])
            ->when($filter['customer_id'] ?? null, fn($q, $c) => $q->where('customer_id', $c))
            ->when($filter['from'] ?? null, fn($q, $d) => $q->whereDate('invoice_date', '>=', $d))
            ->when($filter['to'] ?? null, fn($q, $d) => $q->whereDate('invoice_date', '<=', $d))
            ->when($filter['search'] ?? null, function ($q, $s) {
                $q->where(function ($w) use ($s) {
                    $w->where('invoice_number', 'like', "%{$s}%")
                        ->orWhere('customer_name', 'like', "%{$s}%")
                        ->orWhere('so_number', 'like', "%{$s}%");
                });
            })
            ->orderBy('invoice_date')
            ->orderBy('id')
            ->get();

        $data = $rows
            ->filter(fn(Invoice $inv) => $inv->status !== 'Cancelled')
            ->map(function (Invoice $inv) use ($alokasi) {
                $total = round((float) $inv->grand_total, 2);
                $dibayar = $alokasi[$inv->id] ?? 0.0;
                $sisa = round(max($total - $dibayar, 0), 2);

                return [
                    'id'             => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'invoice_date'   => optional($inv->invoice_date)->toDateString(),
                    'due_date'       => optional($inv->due_date)->toDateString(),
                    'customer_id'    => $inv->customer_id,
                    'customer_name'  => $inv->customer_name,
                    'so_number'      => $inv->so_number,
                    'do_number'      => $inv->do_number,
                    'total'          => $total,
                    'dibayar'        => $dibayar,
                    // Belum ada fitur retur/credit note -> pengurang selalu 0,
                    // tidak dikarang.
                    'kredit_pengurang' => 0.0,
                    'sisa'           => $sisa,
                    'status'         => $this->statusPembayaran(optional($inv->due_date)->toDateString(), $total, $dibayar),
                    'status_invoice' => $inv->status,
                    'journal_voucher_id' => $inv->journal_voucher_id,
                    'umur_hari'      => $this->umurHari(optional($inv->due_date)->toDateString()),
                ];
            })
            ->when(($filter['status'] ?? null) && $filter['status'] !== 'Semua', fn($c, $s) => $c->where('status', $s))
            ->values();

        return [
            'rows' => $data->all(),
            'ringkasan' => $this->ringkasanDari($data),
            'catatan' => 'Pengurang tagihan (retur/credit note) belum tersedia di sistem, sehingga nilainya 0 dan tidak dikarang.',
        ];
    }

    /**
     * Daftar utang supplier (bersumber dari purchase_invoices).
     *
     * @param  array{supplier_id?: int|null, from?: string|null, to?: string|null, status?: string|null, search?: string|null}  $filter
     */
    public function utang(array $filter = []): array
    {
        $alokasi = $this->alokasiPerPurchaseInvoice();

        $rows = PurchaseInvoice::query()
            ->with(['supplier'])
            ->when($filter['supplier_id'] ?? null, fn($q, $c) => $q->where('supplier_id', $c))
            ->when($filter['from'] ?? null, fn($q, $d) => $q->whereDate('invoice_date', '>=', $d))
            ->when($filter['to'] ?? null, fn($q, $d) => $q->whereDate('invoice_date', '<=', $d))
            ->when($filter['search'] ?? null, function ($q, $s) {
                $q->where(function ($w) use ($s) {
                    $w->where('invoice_number', 'like', "%{$s}%")
                        ->orWhere('supplier_invoice_number', 'like', "%{$s}%");
                });
            })
            ->orderBy('invoice_date')
            ->orderBy('id')
            ->get();

        $data = $rows
            ->reject(fn(PurchaseInvoice $pi) => $pi->status === 'CANCELLED')
            ->map(function (PurchaseInvoice $pi) use ($alokasi) {
                $total = round((float) $pi->grand_total, 2);
                $dibayar = $alokasi[$pi->id] ?? 0.0;
                $sisa = round(max($total - $dibayar, 0), 2);

                return [
                    'id'             => $pi->id,
                    'invoice_number' => $pi->invoice_number,
                    'supplier_invoice_number' => $pi->supplier_invoice_number,
                    'invoice_date'   => optional($pi->invoice_date)->toDateString(),
                    'due_date'       => optional($pi->due_date)->toDateString(),
                    'supplier_id'    => $pi->supplier_id,
                    'supplier_name'  => $pi->supplier?->supplier_name,
                    'total'          => $total,
                    'dibayar'        => $dibayar,
                    'kredit_pengurang' => 0.0,
                    'sisa'           => $sisa,
                    'status'         => $this->statusPembayaran(optional($pi->due_date)->toDateString(), $total, $dibayar),
                    'status_invoice' => $pi->status,
                    'journal_status' => $pi->journal_status,
                    'journal_voucher_id' => $pi->journal_voucher_id,
                    'umur_hari'      => $this->umurHari(optional($pi->due_date)->toDateString()),
                ];
            })
            ->when(($filter['status'] ?? null) && $filter['status'] !== 'Semua', fn($c, $s) => $c->where('status', $s))
            ->values();

        return [
            'rows' => $data->all(),
            'ringkasan' => $this->ringkasanDari($data),
            'catatan' => 'Pengurang utang (retur pembelian/credit note) belum terhubung ke utang, sehingga nilainya 0.',
        ];
    }

    /** umur hari: positif = sudah lewat jatuh tempo; negatif = sisa hari. */
    private function umurHari(?string $dueDate): ?int
    {
        if (! $dueDate) {
            return null;
        }

        return (int) floor((strtotime(now()->format('Y-m-d')) - strtotime(substr($dueDate, 0, 10))) / 86400);
    }

    /** Ringkasan turunan dari baris piutang/utang. */
    private function ringkasanDari(Collection $rows): array
    {
        $berjalan = round($rows->sum('sisa'), 2);
        $terlambat = round($rows->filter(fn($r) => $r['status'] === 'OVERDUE')->sum('sisa'), 2);
        $belumJatuhTempo = round($rows->filter(fn($r) => in_array($r['status'], ['UNPAID', 'PARTIALLY_PAID'], true) && ($r['umur_hari'] ?? -1) < 0)->sum('sisa'), 2);

        return [
            'total_berjalan'      => $berjalan,
            'belum_jatuh_tempo'   => $belumJatuhTempo,
            'terlambat'           => $terlambat,
            'jatuh_tempo'         => $terlambat, // yang perlu segera ditagih
            'total_tagihan'       => round($rows->sum('total'), 2),
            'total_dibayar'       => round($rows->sum('dibayar'), 2),
            'jumlah_invoice'      => $rows->count(),
            'jumlah_lunas'        => $rows->where('status', 'PAID')->count(),
        ];
    }

    /** Aging bucket berdasarkan due_date. */
    public function aging(Collection $rows): array
    {
        $buckets = [
            'belum_jatuh_tempo' => 0.0,
            '1_30'   => 0.0,
            '31_60'  => 0.0,
            '61_90'  => 0.0,
            'lebih_90' => 0.0,
        ];

        foreach ($rows as $r) {
            if (($r['sisa'] ?? 0) <= 0.009) {
                continue;
            }
            $umur = $r['umur_hari'] ?? 0;
            if ($umur <= 0) {
                $buckets['belum_jatuh_tempo'] += $r['sisa'];
            } elseif ($umur <= 30) {
                $buckets['1_30'] += $r['sisa'];
            } elseif ($umur <= 60) {
                $buckets['31_60'] += $r['sisa'];
            } elseif ($umur <= 90) {
                $buckets['61_90'] += $r['sisa'];
            } else {
                $buckets['lebih_90'] += $r['sisa'];
            }
        }

        return array_map(fn($v) => round($v, 2), $buckets);
    }

    /* ------------------------------------------------------------------
     * Posting invoice & pembayaran (memakai JournalVoucher existing)
     * ------------------------------------------------------------------ */

    /**
     * Buat + posting Journal Voucher lewat controller existing agar semua
     * validasi & idempotensi posting tetap dipakai.
     *
     * @param  array<string,mixed>  $payload
     * @throws ValidationException
     */
    public function buatDanPostingJurnal(Request $request, array $payload): JournalVoucher
    {
        $controller = app(\App\Http\Controllers\JournalVoucherController::class);

        $draft = $controller->store($request, $payload);
        $voucher = JournalVoucher::findOrFail($draft->getData(true)['id']);

        $posted = $controller->post($request, $voucher);

        if ($posted->getStatusCode() !== 200) {
            $body = $posted->getData(true);
            // Draft yang gagal posting dihapus agar tidak menjadi sampah,
            // karena proses pemanggil berjalan di dalam DB::transaction.
            $voucher->lines()->delete();
            $voucher->delete();

            throw ValidationException::withMessages([
                'journal' => ($body['message'] ?? 'Posting jurnal gagal.') . ' Transaksi dibatalkan.',
            ]);
        }

        return $voucher->fresh();
    }

    /** Nomor dokumen berurutan: PI-2026-0001, RCV-2026-0001, PAY-2026-0001. */
    public function nomorBerikut(string $prefix, string $model, string $kolom): string
    {
        $tahun = now()->format('Y');
        $like = "{$prefix}-{$tahun}-%";
        $last = $model::where($kolom, 'like', $like)->orderByDesc('id')->value($kolom);
        $next = $last ? ((int) substr((string) $last, -4)) + 1 : 1;

        do {
            $kandidat = sprintf('%s-%s-%04d', $prefix, $tahun, $next);
            $next++;
        } while ($model::where($kolom, $kandidat)->exists());

        return $kandidat;
    }
}
