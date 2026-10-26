<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\CashBank;
use App\Models\JournalVoucher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Uji modul Kas & Bank.
 *
 * Dijalankan pada database UJI (lihat phpunit.xml: DB_DATABASE=aldigens_test,
 * di-set lewat <env> dan RefreshDatabase). Tidak menyentuh database perusahaan.
 */
class CashBankTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Account $kas;
    private Account $bank;
    private Account $pendapatan;
    private Account $beban;
    private CashBank $masterKas;
    private CashBank $masterBank;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name'     => 'Tester Akuntansi',
            'email'    => 'kasbank-test@example.com',
            'password' => Hash::make('secret'),
            'role'     => 'Administrator',
        ]);
        $this->actingAs($this->user, 'sanctum');

        $this->kas = Account::create([
            'nomor_akun' => '1-1100',
            'nama_akun' => 'Kas Utama',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
            'saldo_awal' => 1000000,
            'saldo_awal_tanggal' => '2026-01-01',
        ]);
        $this->bank = Account::create([
            'nomor_akun' => '1-1200',
            'nama_akun' => 'Bank Operasional',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
            'saldo_awal' => 5000000,
            'saldo_awal_tanggal' => '2026-01-01',
        ]);
        $this->pendapatan = Account::create([
            'nomor_akun' => '4-1000',
            'nama_akun' => 'Pendapatan Jasa',
            'tipe_akun' => 'Pendapatan',
            'saldo_normal' => 'Kredit',
            'is_active' => true,
            'is_header' => false,
        ]);
        $this->beban = Account::create([
            'nomor_akun' => '5-1000',
            'nama_akun' => 'Beban Listrik',
            'tipe_akun' => 'Beban',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
        ]);

        $this->masterKas = CashBank::create([
            'account_id' => $this->kas->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Kas Utama',
            'is_active' => true,
        ]);
        $this->masterBank = CashBank::create([
            'account_id' => $this->bank->id,
            'jenis' => 'BANK',
            'nama_tampilan' => 'Bank Operasional',
            'nama_bank' => 'BCA',
            'nomor_rekening' => '1234567890',
            'is_active' => true,
        ]);
    }

    // -------------------------------------------------------------
    // 1-2. Master
    // -------------------------------------------------------------

    public function test_membuat_master_kas_dan_bank_dengan_akun_coa_valid(): void
    {
        $akunBaru = Account::create([
            'nomor_akun' => '1-1300',
            'nama_akun' => 'Bank Cadangan',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => false,
        ]);

        $this->postJson('/api/accounting/cash-banks', [
            'account_id' => $akunBaru->id,
            'jenis' => 'BANK',
            'nama_tampilan' => 'Bank Cadangan',
            'nama_bank' => 'Mandiri',
            'nomor_rekening' => '999888777',
        ])->assertCreated()
            ->assertJsonPath('jenis', 'BANK')
            ->assertJsonPath('kode_akun', '1-1300');

        $this->assertDatabaseHas('cash_banks', ['account_id' => $akunBaru->id]);
    }

    public function test_menolak_satu_akun_coa_dipasangkan_lebih_dari_sekali(): void
    {
        $this->postJson('/api/accounting/cash-banks', [
            'account_id' => $this->kas->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Kas Duplikat',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('account_id');
    }

    public function test_menolak_akun_yang_bukan_aset_detail_aktif(): void
    {
        // Bukan Aset
        $this->postJson('/api/accounting/cash-banks', [
            'account_id' => $this->pendapatan->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Salah Tipe',
        ])->assertStatus(422);

        // Akun header
        $header = Account::create([
            'nomor_akun' => '1-1000',
            'nama_akun' => 'Aset Lancar',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => true,
            'is_header' => true,
        ]);
        $this->postJson('/api/accounting/cash-banks', [
            'account_id' => $header->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Header',
        ])->assertStatus(422);

        // Nonaktif
        $nonaktif = Account::create([
            'nomor_akun' => '1-1400',
            'nama_akun' => 'Kas Lama',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'is_active' => false,
            'is_header' => false,
        ]);
        $this->postJson('/api/accounting/cash-banks', [
            'account_id' => $nonaktif->id,
            'jenis' => 'KAS',
            'nama_tampilan' => 'Nonaktif',
        ])->assertStatus(422);
    }

    public function test_akun_tersedia_hanya_aset_detail_aktif_belum_terpakai(): void
    {
        $res = $this->getJson('/api/accounting/cash-banks/akun-tersedia')->assertOk()->json();
        $nomor = array_column($res, 'nomor_akun');

        $this->assertNotContains('1-1100', $nomor, 'Akun yang sudah terpakai tidak boleh muncul');
        $this->assertNotContains('1-1200', $nomor, 'Akun yang sudah terpakai tidak boleh muncul');
        $this->assertNotContains('4-1000', $nomor, 'Akun non-Aset tidak boleh muncul');
    }

    // -------------------------------------------------------------
    // 4-5. Saldo awal
    // -------------------------------------------------------------

    public function test_saldo_awal_disimpan_di_kolom_coa_existing(): void
    {
        $this->putJson("/api/accounting/cash-banks/{$this->masterKas->id}/saldo-awal", [
            'saldo_awal' => 2500000,
            'saldo_awal_tanggal' => '2026-01-01',
        ])->assertOk();

        $this->assertEquals(2500000, (float) $this->kas->fresh()->saldo_awal);
        $this->assertSame('2026-01-01', optional($this->kas->fresh()->saldo_awal_tanggal)->toDateString());

        $data = $this->getJson('/api/accounting/cash-banks/saldo-awal')->assertOk()->json();
        $this->assertEquals(2500000 + 5000000, $data['total_saldo_awal']);
    }

    public function test_saldo_awal_ditolak_jika_sudah_ada_transaksi_posted(): void
    {
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-01',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 100000,
        ])->assertCreated()->assertJsonPath('status', 'POSTED');

        $this->putJson("/api/accounting/cash-banks/{$this->masterKas->id}/saldo-awal", [
            'saldo_awal' => 99000000,
            'saldo_awal_tanggal' => '2026-01-01',
        ])->assertStatus(422);

        $this->assertEquals(1000000, (float) $this->kas->fresh()->saldo_awal, 'Saldo awal tidak boleh berubah');
    }

    public function test_endpoint_coa_tidak_bisa_dipakai_jalan_pintas_mengubah_saldo_awal(): void
    {
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-01',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 50000,
        ])->assertCreated();

        $this->putJson("/api/accounting/accounts/{$this->kas->id}", [
            'nomor_akun' => '1-1100',
            'nama_akun' => 'Kas Utama',
            'tipe_akun' => 'Aset',
            'saldo_normal' => 'Debit',
            'saldo_awal' => 12345,
            'saldo_awal_tanggal' => '2026-01-01',
        ])->assertStatus(422);

        $this->assertEquals(1000000, (float) $this->kas->fresh()->saldo_awal);
    }

    // -------------------------------------------------------------
    // 6-8. Jurnal transaksi
    // -------------------------------------------------------------

    public function test_penerimaan_mendebit_kas_dan_mengkredit_akun_lawan(): void
    {
        $res = $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-05',
            'cash_bank_id' => $this->masterBank->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 750000,
            'pihak_terkait' => 'PT Pelanggan',
        ])->assertCreated()->assertJsonPath('status', 'POSTED');

        $voucher = JournalVoucher::with('lines')->findOrFail($res->json('voucher.id'));

        $this->assertSame('POSTED', $voucher->status);
        $this->assertSame('Voucher Bank Masuk', $voucher->jenis);
        $this->assertStringStartsWith('VBM-', $voucher->no_voucher);

        $debit = $voucher->lines->firstWhere('account_id', $this->bank->id);
        $kredit = $voucher->lines->firstWhere('account_id', $this->pendapatan->id);

        $this->assertEquals(750000, $debit->debit);
        $this->assertEquals(750000, $kredit->kredit);
        $this->assertEquals($voucher->total_debit, $voucher->total_kredit);
    }

    public function test_pengeluaran_mendebit_akun_lawan_dan_mengkredit_kas(): void
    {
        $res = $this->postJson('/api/accounting/cash-bank/pengeluaran', [
            'tanggal' => '2026-02-06',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->beban->id,
            'nominal' => 125000,
        ])->assertCreated()->assertJsonPath('status', 'POSTED');

        $voucher = JournalVoucher::with('lines')->findOrFail($res->json('voucher.id'));

        $this->assertSame('Voucher Kas', $voucher->jenis);
        $this->assertEquals(125000, $voucher->lines->firstWhere('account_id', $this->beban->id)->debit);
        $this->assertEquals(125000, $voucher->lines->firstWhere('account_id', $this->kas->id)->kredit);
    }

    public function test_transfer_mendebit_tujuan_dan_mengkredit_sumber_dengan_nominal_sama(): void
    {
        $res = $this->postJson('/api/accounting/cash-bank/transfer', [
            'tanggal' => '2026-02-07',
            'sumber_id' => $this->masterKas->id,
            'tujuan_id' => $this->masterBank->id,
            'nominal' => 300000,
        ])->assertCreated()->assertJsonPath('status', 'POSTED');

        $voucher = JournalVoucher::with('lines')->findOrFail($res->json('voucher.id'));

        $this->assertSame('Transfer Kas/Bank', $voucher->jenis);
        $this->assertStringStartsWith('TRF-', $voucher->no_voucher);
        $this->assertEquals(300000, $voucher->lines->firstWhere('account_id', $this->bank->id)->debit);
        $this->assertEquals(300000, $voucher->lines->firstWhere('account_id', $this->kas->id)->kredit);
        $this->assertEquals($voucher->total_debit, $voucher->total_kredit);
    }

    public function test_menolak_transfer_dengan_sumber_dan_tujuan_sama(): void
    {
        $this->postJson('/api/accounting/cash-bank/transfer', [
            'tanggal' => '2026-02-07',
            'sumber_id' => $this->masterKas->id,
            'tujuan_id' => $this->masterKas->id,
            'nominal' => 1000,
        ])->assertStatus(422)->assertJsonValidationErrors('tujuan_id');
    }

    public function test_menolak_akun_nonaktif_header_dan_nominal_tidak_valid(): void
    {
        // Nominal nol / negatif
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-08',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 0,
        ])->assertStatus(422);

        // Akun lawan header
        $header = Account::create([
            'nomor_akun' => '4-0000',
            'nama_akun' => 'Pendapatan',
            'tipe_akun' => 'Pendapatan',
            'saldo_normal' => 'Kredit',
            'is_active' => true,
            'is_header' => true,
        ]);
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-08',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $header->id,
            'nominal' => 10000,
        ])->assertStatus(422);

        // Master nonaktif
        $this->masterBank->update(['is_active' => false]);
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-02-08',
            'cash_bank_id' => $this->masterBank->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 10000,
        ])->assertStatus(422);

        // Akun COA master dinonaktifkan
        $this->kas->update(['is_active' => false]);
        $this->postJson('/api/accounting/cash-bank/pengeluaran', [
            'tanggal' => '2026-02-08',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->beban->id,
            'nominal' => 10000,
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------
    // 11-15. Laporan, saldo, idempotensi
    // -------------------------------------------------------------

    public function test_draft_dan_void_tidak_masuk_saldo_aktual(): void
    {
        // Draft (auto_post false)
        $draft = $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-03-01',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 999999,
            'auto_post' => false,
        ])->assertCreated()->json();
        $this->assertSame('DRAFT', $draft['status']);

        $ringkasan = $this->getJson('/api/accounting/cash-banks/ringkasan')->assertOk()->json();
        $kasRow = collect($ringkasan['rekening'])->firstWhere('id', $this->masterKas->id);
        $this->assertEquals(1000000, $kasRow['saldo_akhir'], 'Draft tidak boleh menambah saldo');
        $this->assertEquals(0, $kasRow['mutasi_debit'], 'Draft tidak boleh masuk mutasi');

        // Posted lalu reversal -> voucher asli VOID, saldo kembali
        $posted = $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-03-02',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 250000,
        ])->assertCreated()->json();

        $ringkasan2 = $this->getJson('/api/accounting/cash-banks/ringkasan')->assertOk()->json();
        $kasRow2 = collect($ringkasan2['rekening'])->firstWhere('id', $this->masterKas->id);
        $this->assertEquals(1250000, $kasRow2['saldo_akhir']);

        $this->postJson("/api/accounting/vouchers/{$posted['voucher']['id']}/reverse", ['alasan' => 'Uji koreksi'])
            ->assertOk();

        $this->assertSame('VOID', JournalVoucher::find($posted['voucher']['id'])->status);

        $ringkasan3 = $this->getJson('/api/accounting/cash-banks/ringkasan')->assertOk()->json();
        $kasRow3 = collect($ringkasan3['rekening'])->firstWhere('id', $this->masterKas->id);

        /*
         * Sesuai perilaku reversal jurnal existing: voucher asli jadi VOID sehingga
         * mutasi debitnya hilang, sedangkan voucher pembalik TETAP POSTED (kredit).
         * Jadi saldo = 1.000.000 - 250.000 = 750.000. Voucher VOID tidak dihitung.
         */
        $this->assertEquals(750000, $kasRow3['saldo_akhir']);
        $this->assertEquals(1000000, (float) $this->kas->fresh()->saldo_awal, 'Saldo awal COA tidak diubah oleh reversal');
    }

    public function test_voucher_posted_muncul_di_rekap_jurnal_dan_buku_besar(): void
    {
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-04-01',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 400000,
        ])->assertCreated();

        $rekap = $this->getJson('/api/accounting/reports/journal-umum')->assertOk()->json();
        $this->assertSame(1, $rekap['jumlah_voucher']);
        $this->assertTrue($rekap['balanced']);

        $bb = $this->getJson('/api/accounting/reports/buku-besar?account_id=' . $this->kas->id)->assertOk()->json();
        $this->assertEquals(400000, $bb['total_debit']);
        $this->assertEquals(1400000, $bb['saldo_akhir'], 'Saldo awal 1.000.000 + 400.000');
    }

    public function test_request_posting_ganda_tidak_menggandakan_saldo(): void
    {
        $posted = $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-05-01',
            'cash_bank_id' => $this->masterKas->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 600000,
        ])->assertCreated()->json();

        // Posting ulang voucher yang sama harus ditolak.
        $this->postJson("/api/accounting/vouchers/{$posted['voucher']['id']}/post")->assertStatus(422);

        $ringkasan = $this->getJson('/api/accounting/cash-banks/ringkasan')->assertOk()->json();
        $kasRow = collect($ringkasan['rekening'])->firstWhere('id', $this->masterKas->id);
        $this->assertEquals(1600000, $kasRow['saldo_akhir'], 'Saldo hanya bertambah sekali');
    }

    public function test_mutasi_dan_saldo_akhir_konsisten_dengan_buku_besar(): void
    {
        $this->postJson('/api/accounting/cash-bank/penerimaan', [
            'tanggal' => '2026-06-01',
            'cash_bank_id' => $this->masterBank->id,
            'lawan_account_id' => $this->pendapatan->id,
            'nominal' => 200000,
        ])->assertCreated();
        $this->postJson('/api/accounting/cash-bank/pengeluaran', [
            'tanggal' => '2026-06-02',
            'cash_bank_id' => $this->masterBank->id,
            'lawan_account_id' => $this->beban->id,
            'nominal' => 50000,
        ])->assertCreated();

        $mutasi = $this->getJson('/api/accounting/cash-banks/mutasi?cash_bank_id=' . $this->masterBank->id)
            ->assertOk()->json();

        $this->assertCount(2, $mutasi['rows']);
        $this->assertEquals(5150000, $mutasi['saldo_akhir'], '5.000.000 + 200.000 - 50.000');

        // Saldo berjalan baris terakhir = saldo akhir
        $last = end($mutasi['rows']);
        $this->assertEquals($mutasi['saldo_akhir'], $last['saldo_running']);

        $bb = $this->getJson('/api/accounting/reports/buku-besar?account_id=' . $this->bank->id)->assertOk()->json();
        $this->assertEquals(5150000, $bb['saldo_akhir'], 'Harus sama dengan Buku Besar akun COA');
    }

    public function test_user_tanpa_autentikasi_tidak_dapat_mengakses_endpoint(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withHeaders(['Authorization' => ''])->getJson('/api/accounting/cash-banks')->assertUnauthorized();
        $this->withHeaders(['Authorization' => ''])->getJson('/api/accounting/cash-banks/saldo-awal')->assertUnauthorized();
        $this->withHeaders(['Authorization' => ''])->postJson('/api/accounting/cash-bank/penerimaan', [])->assertUnauthorized();
    }
}
