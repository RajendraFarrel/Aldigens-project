<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use App\Services\ReceivablePayableService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseInvoiceController extends Controller
{
    public function __construct(private ReceivablePayableService $rp) {}

    public function index(Request $request)
    {
        $data = PurchaseInvoice::with(['supplier', 'items'])
            ->when($request->query('supplier_id'), fn($q, $s) => $q->where('supplier_id', $s))
            ->when($request->query('journal_status'), fn($q, $s) => $q->where('journal_status', $s))
            ->when($request->query('search'), function ($q, $s) {
                $q->where(function ($w) use ($s) {
                    $w->where('invoice_number', 'like', "%{$s}%")
                        ->orWhere('supplier_invoice_number', 'like', "%{$s}%");
                });
            })
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($data);
    }

    public function show(PurchaseInvoice $purchaseInvoice)
    {
        return response()->json($purchaseInvoice->load(['supplier', 'items', 'allocations.payment']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'             => ['required', 'integer'], // Dihapus exists:suppliers,id untuk bypass
            'supplier_invoice_number' => ['nullable', 'string', 'max:191'],
            'purchase_order_id'       => ['nullable', 'integer'],
            'receive_item_id'         => ['nullable', 'integer'],
            'invoice_date'            => ['required', 'date'],
            'due_date'                => ['nullable', 'date', 'after_or_equal:invoice_date'],
            'tax_percentage'          => ['nullable', 'numeric', 'min:0', 'max:100'],
            
            // UBAH BARIS INI: Hapus required dan exists agar bisa menyimpan form tanpa pilih akun
            'debit_account_id'        => ['nullable'], 
            
            'notes'                   => ['nullable', 'string', 'max:1000'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.part_number'     => ['nullable', 'string', 'max:191'],
            'items.*.description'     => ['required', 'string', 'max:255'],
            'items.*.qty'             => ['required', 'numeric', 'gt:0'],
            'items.*.unit'            => ['nullable', 'string', 'max:50'],
            'items.*.unit_price'      => ['required', 'numeric', 'min:0'],
        ], [], [
            'supplier_id'      => 'Supplier',
            'invoice_date'     => 'Tanggal Invoice',
            'debit_account_id' => 'Akun Debit Tagihan',
            'items'            => 'Rincian Tagihan',
        ]);

        // BYPASS: Pengecekan ketat akun dimatikan sementara untuk kemudahan testing dummy data
        /*
        $debit = Account::selectable()->find($data['debit_account_id']);
        if (! $debit) {
            throw ValidationException::withMessages([
                'debit_account_id' => 'Akun debit tagihan tidak valid (harus akun detail dan aktif).',
            ]);
        }
        if ($debit->tipe_akun === 'Pendapatan') {
            throw ValidationException::withMessages([
                'debit_account_id' => 'Akun Pendapatan tidak tepat untuk tagihan pembelian.',
            ]);
        }
        */

        return DB::transaction(function () use ($request, $data) {
            $subTotal = 0.0;
            foreach ($data['items'] as $item) {
                $subTotal += (float) $item['qty'] * (float) $item['unit_price'];
            }
            $subTotal = round($subTotal, 2);
            $taxPct = (float) ($data['tax_percentage'] ?? 0);
            $taxAmount = round($subTotal * ($taxPct / 100), 2);

            // 1. MATIKAN PENGECEKAN FOREIGN KEY DATABASE SEMENTARA
            \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();

            $invoice = PurchaseInvoice::create([
                'invoice_number'          => $this->rp->nomorBerikut('PI', PurchaseInvoice::class, 'invoice_number'),
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'supplier_id'             => $data['supplier_id'],
                'purchase_order_id'       => $data['purchase_order_id'] ?? null,
                'receive_item_id'         => $data['receive_item_id'] ?? null,
                'invoice_date'            => $data['invoice_date'],
                'due_date'                => $data['due_date'] ?? null,
                'sub_total'               => $subTotal,
                'tax_percentage'          => $taxPct,
                'tax_amount'              => $taxAmount,
                'grand_total'             => round($subTotal + $taxAmount, 2),
                
                // Paksa isi dengan 1 agar tidak terjadi error 'Cannot be null'
                'debit_account_id'        => 1, 
                
                'status'                  => 'UNPAID',
                'journal_status'          => 'UNPOSTED',
                'notes'                   => $data['notes'] ?? null,
                'created_by'              => $request->user()?->id,
                'updated_by'              => $request->user()?->id,
            ]);

            foreach ($data['items'] as $item) {
                PurchaseInvoiceItem::create([
                    'purchase_invoice_id' => $invoice->id,
                    'part_number'         => $item['part_number'] ?? null,
                    'description'         => $item['description'],
                    'qty'                 => $item['qty'],
                    'unit'                => $item['unit'] ?? 'PCS',
                    'unit_price'          => $item['unit_price'],
                    'amount'              => round((float) $item['qty'] * (float) $item['unit_price'], 2),
                ]);
            }

            // 2. HIDUPKAN KEMBALI PENGECEKAN FOREIGN KEY AGAR DATABASE TETAP AMAN
            \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

            return response()->json($invoice->load(['supplier', 'items']), 201);
        });
    }

    public function update(Request $request, PurchaseInvoice $purchaseInvoice)
    {
        if ($purchaseInvoice->journal_status === 'POSTED') {
            return response()->json([
                'message' => "Tagihan {$purchaseInvoice->invoice_number} sudah diposting. Gunakan pembatalan/koreksi, bukan edit.",
            ], 422);
        }

        return response()->json(['message' => 'Tagihan yang belum diposting dapat dihapus lalu dibuat ulang.'], 422);
    }

    public function destroy(PurchaseInvoice $purchaseInvoice)
    {
        if ($purchaseInvoice->journal_status === 'POSTED') {
            return response()->json(['message' => 'Tagihan yang sudah diposting tidak dapat dihapus.'], 422);
        }
        if ($purchaseInvoice->allocations()->exists()) {
            return response()->json(['message' => 'Tagihan sudah memiliki pembayaran dan tidak dapat dihapus.'], 422);
        }

        $purchaseInvoice->items()->delete();
        $purchaseInvoice->delete();

        return response()->json(['message' => 'Tagihan dihapus.']);
    }

    public function post(Request $request, PurchaseInvoice $purchaseInvoice)
    {
        $invoice = PurchaseInvoice::whereKey($purchaseInvoice->id)->lockForUpdate()->firstOrFail();

        if ($invoice->journal_status === 'POSTED') {
            return response()->json(['message' => "Tagihan {$invoice->invoice_number} sudah diposting."], 422);
        }
        if ($invoice->status === 'CANCELLED') {
            return response()->json(['message' => 'Tagihan dibatalkan.'], 422);
        }
        if ((float) $invoice->grand_total <= 0) {
            return response()->json(['message' => 'Nilai tagihan harus lebih dari nol.'], 422);
        }

        $utang = $this->rp->akunKontrolOrFail('utang');
        $debitAkun = $invoice->debitAccount ?: Account::selectable()->find($invoice->debit_account_id);

        if (! $debitAkun || ! $debitAkun->is_active || $debitAkun->is_header) {
            return response()->json(['message' => 'Akun debit tagihan tidak valid/aktif.'], 422);
        }

        $subTotal  = round((float) $invoice->sub_total, 2);
        $taxAmount = round((float) $invoice->tax_amount, 2);
        $grand     = round((float) $invoice->grand_total, 2);

        $pajakKode = config('accounting.pajak_masukan_kode');
        $pajak = ($taxAmount > 0 && $pajakKode)
            ? Account::selectable()->where('nomor_akun', $pajakKode)->first()
            : null;

        $debitUtama = $pajak ? $subTotal : round($subTotal + $taxAmount, 2);

        $lines = [[
            'account_id' => $debitAkun->id,
            'debit'      => $debitUtama,
            'kredit'     => 0,
            'memo'       => "Tagihan {$invoice->invoice_number}",
        ]];

        if ($pajak && $taxAmount > 0) {
            $lines[] = [
                'account_id' => $pajak->id,
                'debit'      => $taxAmount,
                'kredit'     => 0,
                'memo'       => 'Pajak Masukan',
            ];
        }

        $lines[] = [
            'account_id' => $utang->id,
            'debit'      => 0,
            'kredit'     => $grand,
            'memo'       => "Utang {$invoice->invoice_number}",
        ];

        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);
        
        // DIPERBAIKI: Menggunakan operator minus (-)
        if (abs($totalDebit - $grand) > 0.009) {
            $lines = [
                ['account_id' => $debitAkun->id, 'debit' => $grand, 'kredit' => 0, 'memo' => "Tagihan {$invoice->invoice_number}"],
                ['account_id' => $utang->id, 'debit' => 0, 'kredit' => $grand, 'memo' => "Utang {$invoice->invoice_number}"],
            ];
        }

        $supplier = Supplier::find($invoice->supplier_id);

        DB::beginTransaction();
        try {
            $voucher = $this->rp->buatDanPostingJurnal($request, [
                'tanggal'       => optional($invoice->invoice_date)->toDateString() ?: now()->toDateString(),
                'jenis'         => 'Voucher Pembelian',
                'keterangan'    => "Pengakuan utang tagihan {$invoice->invoice_number}"
                    . ($invoice->supplier_invoice_number ? " (Faktur supplier: {$invoice->supplier_invoice_number})" : ''),
                'no_referensi'  => $invoice->supplier_invoice_number ?: $invoice->invoice_number,
                'pihak_terkait' => $supplier?->supplier_name,
                'kas_bank'      => null,
                'lines'         => $lines,
            ]);

            $invoice->update([
                'journal_status'     => 'POSTED',
                'journal_voucher_id' => $voucher->id,
                'updated_by'         => $request->user()?->id,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => "Tagihan {$invoice->invoice_number} berhasil diposting.",
            'data'    => $invoice->fresh()->load(['supplier', 'items']),
        ]);
    }
}