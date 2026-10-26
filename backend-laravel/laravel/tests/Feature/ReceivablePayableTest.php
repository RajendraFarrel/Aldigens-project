<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\CashBank;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JournalVoucher;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Uji modul Utang Piutang (piutang customer & utang supplier).
 * Berjalan pada database uji (phpunit.xml) — tidak menyentuh database perusahaan.
 */
class ReceivablePayableTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Customer $customer;
    private Supplier $supplier;
    private CashBank $kas;
    private Account $kasAkun;
    private Account $piutang;
    private Account $utang;
    private Account $pendapatan;
    private Account $persediaan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Tester AR AP',
            'email' => 'arap@example.com',
            'password' => Hash::make('secret'),
            'role' => 'Administrator',
        ]);
        $this->actingAs($this->user, 'sanctum');

        $this->customer = Customer::create([
            'customer_code' => 'CUST-AR',
            'customer_name' => 'PT Pelanggan AR',
            'status' => 'AKTIF',
        ]);
        $this->supplier = Supplier::create([
            'supplier_code' => 'SUP-AP',
            'supplier_name' => 'PT Supplier AP',
            'status' => 'AKTIF',
        ]);

        $this->kasAkun = Account::create([
            'nomor_akun' => '1-1100',
            'nama_akun' => 'Kas Utama',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
        ]);
        $this->piutang = Account::create([
            'nomor_akun' => '1-2100',
            'nama_akun' => 'Piutang Usaha',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
        ]);
        $this->utang = Account::create([
            'nomor_akun' => '2-1100',
            'nama_akun' => 'Utang Usaha',
            'tipe_akun' => 'Liabilitas',
            'saldo_normal' => 'Kredit',
            'is_active' => true,
            'is_header' => false,
        ]);
        $this->pendapatan = Account::create([
            'nomor_akun' => '4-1000',
            'nama_akun' => 'Pendapatan Penjualan',
            'tipe_akun' => 'Pendapatan',
            'saldo_normal' => 'Kredit',
            'is_active' => true,
            'is_header' => false,
        ]);
        $this->persediaan = Account::create([
            'nomor_akun' => '1-3000',
            'nama_akun' => 'Persediaan Barang',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
        ]);

        $this->kas = CashBank::create([
            'account_id' => $this->kasAkun->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Kas Utama',
            'is_active' => true,
        ]);
    }

    /* ---------------- helper ---------------- */

    private function buatInvoice(float $total, ?string $dueDate = null): Invoice
    {
        $inv = Invoice::create([
            'invoice_number' => 'INV-T-' . uniqid(),
            'invoice_date'   => '2026-02-01',
            'due_date'       => $dueDate ?? '2026-12-31',
            'customer_id'    => $this->customer->id,
            'customer_name'  => $this->customer->customer_name,
            'sub_total'      => $total,
            'tax_amount'     => 0,
            'grand_total'    => $total,
            'status'         => 'Unpaid',
        ]);
        InvoiceItem::create([
            'invoice_id' => $inv->id,
            'description' => 'Jasa',
            'qty' => 1,
            'unit' => 'SET',
            'unit_price' => $total,
            'amount' => $total,
        ]);

        return $inv;
    }

    private function buatPurchaseInvoice(float $total, ?string $dueDate = null, bool $post = true): PurchaseInvoice
    {
        $pi = PurchaseInvoice::create([
            'invoice_number'      => 'PI-T-' . uniqid(),
            'supplier_id'         => $this->supplier->id,
            'invoice_date'        => '2026-02-01',
            'due_date'            => $dueDate ?? '2026-12-31',
            'sub_total'           => $total,
            'tax_percentage'      => 0,
            'tax_amount'          => 0,
            'grand_total'         => $total,
            'debit_account_id'    => $this->persediaan->id,
            'status'              => 'UNPAID',
            'journal_status'      => 'UNPOSTED',
        ]);
        PurchaseInvoiceItem::create([
            'purchase_invoice_id' => $pi->id,
            'description' => 'Material',
            'qty' => 1,
            'unit' => 'PCS',
            'unit_price' => $total,
            'amount' => $total,
        ]);

        if ($post) {
            $this->postJson("/api/purchase-invoices/{$pi->id}/post")->assertOk();
            $pi->refresh();
        }

        return $pi;
    }

    private function terima(Invoice $inv, float $nominal, ?float $alokasi = null, ?string $key = null)
    {
        return $this->postJson('/api/accounting/receivables-payables/penerimaan', [
            'customer_id'  => $this->customer->id,
            'cash_bank_id' => $this->kas->id,
            'payment_date' => '2026-03-01',
            'amount'       => $nominal,
            'request_key'  => $key,
            'allocations'  => [['invoice_id' => $inv->id, 'amount' => $alokasi ?? $nominal]],
        ]);
    }

    private function bayar(PurchaseInvoice $pi, float $nominal, ?string $key = null)
    {
        return $this->postJson('/api/accounting/receivables-payables/pembayaran', [
            'supplier_id'  => $this->supplier->id,
            'cash_bank_id' => $this->kas->id,
            'payment_date' => '2026-03-01',
            'amount'       => $nominal,
            'request_key'  => $key,
            'allocations'  => [['purchase_invoice_id' => $pi->id, 'amount' => $nominal]],
        ]);
    }

    /* ---------------- 1. Posting invoice ---------------- */

    public function test_sales_invoice_posting_membuat_jurnal_piutang_dan_pendapatan(): void
    {
        $inv = $this->buatInvoice(1500000);

        $this->postJson("/api/invoices/{$inv->id}/post-jurnal")->assertOk();

        $inv->refresh();
        $this->assertNotNull($inv->journal_voucher_id);

        $v = JournalVoucher::with('lines')->find($inv->journal_voucher_id);
        $this->assertSame('POSTED', $v->status);
        $this->assertSame('Voucher Penjualan', $v->jenis);
        $this->assertEquals(1500000, $v->lines->firstWhere('account_id', $this->piutang->id)->debit);
        $this->assertEquals(1500000, $v->lines->firstWhere('account_id', $this->pendapatan->id)->kredit);

        // Idempoten
        $this->postJson("/api/invoices/{$inv->id}/post-jurnal")->assertStatus(422);
        $this->assertEquals(1, JournalVoucher::where('jenis', 'Voucher Penjualan')->count());
    }

    public function test_purchase_invoice_posting_debit_akun_tagihan_kredit_utang(): void
    {
        $pi = $this->buatPurchaseInvoice(800000, null, false);

        $this->postJson("/api/purchase-invoices/{$pi->id}/post")->assertOk();
        $pi->refresh();

        $this->assertSame('POSTED', $pi->journal_status);
        $v = JournalVoucher::with('lines')->find($pi->journal_voucher_id);
        $this->assertEquals(800000, $v->lines->firstWhere('account_id', $this->persediaan->id)->debit);
        $this->assertEquals(800000, $v->lines->firstWhere('account_id', $this->utang->id)->kredit);

        // Tidak boleh posting dua kali
        $this->postJson("/api/purchase-invoices/{$pi->id}/post")->assertStatus(422);
    }

    /* ---------------- 2. Piutang ---------------- */

    public function test_piutang_awal_unpaid_dan_daftar_dari_invoice_asli(): void
    {
        $inv = $this->buatInvoice(1000000);

        $res = $this->getJson('/api/accounting/receivables-payables/piutang')->assertOk()->json();
        $this->assertCount(1, $res['rows']);
        $this->assertSame($inv->invoice_number, $res['rows'][0]['invoice_number']);
        $this->assertSame('UNPAID', $res['rows'][0]['status']);
        $this->assertEquals(1000000, $res['rows'][0]['sisa']);
        $this->assertEquals(1000000, $res['ringkasan']['total_berjalan']);
    }

    public function test_penerimaan_sebagian_dan_pelunasan_mengubah_sisa_dan_status(): void
    {
        $inv = $this->buatInvoice(1000000);

        $this->terima($inv, 400000)->assertCreated();

        $rows = $this->getJson('/api/accounting/receivables-payables/piutang')->json()['rows'];
        $this->assertSame('PARTIALLY_PAID', $rows[0]['status']);
        $this->assertEquals(600000, $rows[0]['sisa']);

        $this->terima($inv, 600000)->assertCreated();

        $rows = $this->getJson('/api/accounting/receivables-payables/piutang')->json()['rows'];
        $this->assertSame('PAID', $rows[0]['status']);
        $this->assertEquals(0, $rows[0]['sisa']);
        $this->assertSame('Paid', $inv->fresh()->status, 'Status invoice existing ikut Paid');
    }

    public function test_overdue_adalah_status_turunan_dari_jatuh_tempo(): void
    {
        $this->buatInvoice(500000, '2020-01-01');

        $rows = $this->getJson('/api/accounting/receivables-payables/piutang')->json()['rows'];
        $this->assertSame('OVERDUE', $rows[0]['status']);
        $this->assertGreaterThan(0, $rows[0]['umur_hari']);
    }

    public function test_penerimaan_menghasilkan_debit_kas_dan_kredit_piutang_bukan_pendapatan(): void
    {
        $inv = $this->buatInvoice(1000000);
        $this->postJson("/api/invoices/{$inv->id}/post-jurnal")->assertOk();

        $res = $this->terima($inv, 350000)->assertCreated()->json();
        $v = JournalVoucher::with('lines')->find($res['data']['journal_voucher_id']);

        $this->assertEquals(350000, $v->lines->firstWhere('account_id', $this->kasAkun->id)->debit);
        $this->assertEquals(350000, $v->lines->firstWhere('account_id', $this->piutang->id)->kredit);
        $this->assertNull($v->lines->firstWhere('account_id', $this->pendapatan->id), 'Tidak boleh menyentuh pendapatan lagi');
    }

    public function test_penerimaan_multi_invoice_dengan_alokasi(): void
    {
        $a = $this->buatInvoice(300000);
        $b = $this->buatInvoice(700000);

        $this->postJson('/api/accounting/receivables-payables/penerimaan', [
            'customer_id'  => $this->customer->id,
            'cash_bank_id' => $this->kas->id,
            'payment_date' => '2026-03-05',
            'amount'       => 500000,
            'allocations'  => [
                ['invoice_id' => $a->id, 'amount' => 300000],
                ['invoice_id' => $b->id, 'amount' => 200000],
            ],
        ])->assertCreated();

        $rows = collect($this->getJson('/api/accounting/receivables-payables/piutang')->json()['rows'])->keyBy('id');
        $this->assertSame('PAID', $rows[$a->id]['status']);
        $this->assertSame('PARTIALLY_PAID', $rows[$b->id]['status']);
        $this->assertEquals(500000, $rows[$b->id]['sisa']);
    }

    /* ---------------- 3. Validasi pembayaran ---------------- */

    public function test_menolak_alokasi_melebihi_sisa_dan_alokasi_tidak_sama(): void
    {
        $inv = $this->buatInvoice(100000);

        $sebelum = DB::table('payment_receipts')->count();

        $this->terima($inv, 100000, 150000)->assertStatus(422);
        $this->terima($inv, 100000, 50000)->assertStatus(422);

        $this->assertEquals(
            $sebelum,
            DB::table('payment_receipts')->count(),
            'Tidak ada data tersimpan saat validasi gagal'
        );
    }

    public function test_menolak_invoice_lunas_dan_invoice_customer_lain(): void
    {
        $inv = $this->buatInvoice(100000);
        $this->terima($inv, 100000)->assertCreated();
        $this->terima($inv, 10000)->assertStatus(422);

        $customerLain = Customer::create([
            'customer_code' => 'CUST-X',
            'customer_name' => 'Customer Lain',
            'status' => 'AKTIF',
        ]);
        $invLain = $this->buatInvoice(50000);
        $invLain->update(['customer_id' => $customerLain->id]);

        $this->terima($invLain, 50000)->assertStatus(422);
    }

    public function test_menolak_kas_bank_nonaktif_dan_jumlah_nol(): void
    {
        $inv = $this->buatInvoice(100000);

        $this->postJson('/api/accounting/receivables-payables/penerimaan', [
            'customer_id' => $this->customer->id,
            'cash_bank_id' => $this->kas->id,
            'payment_date' => '2026-03-01',
            'amount' => 0,
            'allocations' => [['invoice_id' => $inv->id, 'amount' => 0]],
        ])->assertStatus(422);

        $this->kas->update(['is_active' => false]);
        $this->terima($inv, 100000)->assertStatus(422);
    }

    public function test_request_ganda_dengan_request_key_sama_tidak_menggandakan_pembayaran(): void
    {
        $inv = $this->buatInvoice(1000000);

        $this->terima($inv, 200000, 200000, 'KEY-1')->assertCreated();
        $this->terima($inv, 200000, 200000, 'KEY-1')->assertStatus(422);

        $this->assertEquals(1, DB::table('payment_receipts')->count());
        $this->assertEquals(200000, DB::table('payment_receipt_allocations')->sum('amount'));
    }

    /* ---------------- 4. Utang ---------------- */

    public function test_pembayaran_supplier_debit_utang_kredit_kas_dan_tidak_menyentuh_beban(): void
    {
        $pi = $this->buatPurchaseInvoice(1000000);

        $res = $this->bayar($pi, 400000)->assertCreated()->json();
        $v = JournalVoucher::with('lines')->find($res['data']['journal_voucher_id']);

        $this->assertEquals(400000, $v->lines->firstWhere('account_id', $this->utang->id)->debit);
        $this->assertEquals(400000, $v->lines->firstWhere('account_id', $this->kasAkun->id)->kredit);
        $this->assertNull($v->lines->firstWhere('account_id', $this->persediaan->id), 'Tidak mengulang debit persediaan');

        $rows = $this->getJson('/api/accounting/receivables-payables/utang')->json()['rows'];
        $this->assertSame('PARTIALLY_PAID', $rows[0]['status']);
        $this->assertEquals(600000, $rows[0]['sisa']);
    }

    public function test_menolak_pembayaran_tagihan_yang_belum_diposting(): void
    {
        $pi = $this->buatPurchaseInvoice(500000, null, false);

        $this->bayar($pi, 500000)->assertStatus(422);
        $this->assertEquals(0, DB::table('supplier_payments')->count());
    }

    public function test_menolak_tagihan_supplier_lain(): void
    {
        $pi = $this->buatPurchaseInvoice(300000);

        $supplierLain = Supplier::create([
            'supplier_code' => 'SUP-X',
            'supplier_name' => 'Supplier Lain',
            'status' => 'AKTIF',
        ]);
        $pi->update(['supplier_id' => $supplierLain->id]);

        $this->bayar($pi, 300000)->assertStatus(422);
    }

    public function test_status_draft_tidak_menghitung_pembayaran(): void
    {
        $inv = $this->buatInvoice(1000000);
        $this->terima($inv, 300000)->assertCreated();

        // Simulasikan header pembayaran yang gagal diposting (tidak dihitung).
        DB::table('payment_receipts')->update(['journal_status' => 'FAILED']);

        $rows = $this->getJson('/api/accounting/receivables-payables/piutang')->json()['rows'];
        $this->assertSame('UNPAID', $rows[0]['status']);
        $this->assertEquals(1000000, $rows[0]['sisa']);
    }

    /* ---------------- 5. Integrasi laporan & Kas ---------------- */

    public function test_penerimaan_muncul_di_mutasi_kas_bank_dan_buku_besar(): void
    {
        $inv = $this->buatInvoice(750000);
        $this->terima($inv, 750000)->assertCreated();

        $mutasi = $this->getJson('/api/accounting/cash-banks/mutasi?cash_bank_id=' . $this->kas->id)->assertOk()->json();
        $this->assertCount(1, $mutasi['rows']);
        $this->assertEquals(750000, $mutasi['rows'][0]['debit']);

        $bb = $this->getJson('/api/accounting/reports/buku-besar?account_id=' . $this->kasAkun->id)->assertOk()->json();
        $this->assertEquals(750000, $bb['saldo_akhir']);

        $bbPiutang = $this->getJson('/api/accounting/reports/buku-besar?account_id=' . $this->piutang->id)->assertOk()->json();
        $this->assertEquals(-750000, $bbPiutang['saldo_akhir'], 'Kredit piutang mengurangi saldo');
    }

    public function test_aging_dan_ringkasan_konsisten(): void
    {
        $this->buatInvoice(300000, '2026-12-31');            // belum jatuh tempo
        $this->buatInvoice(200000, '2020-01-01');            // > 90 hari

        $aging = $this->getJson('/api/accounting/receivables-payables/aging')->assertOk()->json();
        $this->assertEquals(300000, $aging['piutang']['belum_jatuh_tempo']);
        $this->assertEquals(200000, $aging['piutang']['lebih_90']);

        $ring = $this->getJson('/api/accounting/receivables-payables/ringkasan')->assertOk()->json();
        $this->assertEquals(500000, $ring['piutang']['ringkasan']['total_berjalan']);
        $this->assertEquals(200000, $ring['piutang']['ringkasan']['terlambat']);
        $this->assertSame('1-2100 — Piutang Usaha', $ring['konfigurasi']['piutang']['akun']);
    }

    /* ---------------- Master customer/supplier untuk form ---------------- */

    /**
     * Kontrak yang dipakai halaman Utang Piutang saat pertama dibuka:
     * array datar ({customers, suppliers}) berisi id + nama — bukan dibungkus `data`.
     */
    public function test_master_mengembalikan_customer_dan_supplier_tanpa_pembungkus_data(): void
    {
        $res = $this->getJson('/api/accounting/receivables-payables/master')->assertOk()->json();

        $this->assertArrayHasKey('customers', $res);
        $this->assertArrayHasKey('suppliers', $res);
        $this->assertArrayNotHasKey('data', $res);

        $this->assertSame($this->customer->id, $res['customers'][0]['id']);
        $this->assertSame('PT Pelanggan AR', $res['customers'][0]['customer_name']);
        $this->assertSame($this->supplier->id, $res['suppliers'][0]['id']);
        $this->assertSame('PT Supplier AP', $res['suppliers'][0]['supplier_name']);
    }

    /** Master kosong adalah data valid (200 + array kosong), bukan error. */
    public function test_master_kosong_tetap_sukses_bukan_error(): void
    {
        $this->customer->delete();
        $this->supplier->delete();

        $this->getJson('/api/accounting/receivables-payables/master')
            ->assertOk()
            ->assertExactJson(['customers' => [], 'suppliers' => []]);
    }

    /** `only=` memisahkan muat customer & supplier agar satu gagal tidak menutup yang lain. */
    public function test_master_dapat_dimuat_per_bagian(): void
    {
        $cust = $this->getJson('/api/accounting/receivables-payables/master?only=customers')->assertOk()->json();
        $this->assertArrayHasKey('customers', $cust);
        $this->assertArrayNotHasKey('suppliers', $cust);

        $supp = $this->getJson('/api/accounting/receivables-payables/master?only=suppliers')->assertOk()->json();
        $this->assertArrayHasKey('suppliers', $supp);
        $this->assertArrayNotHasKey('customers', $supp);
    }

    public function test_user_tanpa_autentikasi_ditolak(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withHeaders(['Authorization' => ''])->getJson('/api/accounting/receivables-payables/piutang')->assertUnauthorized();
        $this->withHeaders(['Authorization' => ''])->postJson('/api/accounting/receivables-payables/penerimaan', [])->assertUnauthorized();
        $this->withHeaders(['Authorization' => ''])->postJson('/api/purchase-invoices', [])->assertUnauthorized();
    }
}
