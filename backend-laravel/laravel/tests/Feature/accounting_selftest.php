<?php

/**
 * Uji skenario modul Akuntansi (Tahap 13) langsung terhadap database.
 * Jalankan: php artisan accounting:selftest
 *
 * Skenario:
 *  1. COA tambah / edit / nonaktifkan + validasi unik
 *  2. Nama akun terisi otomatis dari Nomor Akun
 *  3. Voucher 10.000.000 / 10.000.000 -> BALANCE
 *  4. Voucher 10.000.000 / 8.000.000  -> selisih 2.000.000, tidak bisa posting
 *  5. Draft tidak memengaruhi Buku Besar & Neraca Saldo
 *  6. Posted masuk Rekap Jurnal tepat satu kali
 *  7. Buku Besar & Neraca Saldo berubah
 *  8. Jurnal Penyesuaian mengikuti alur sama
 *  9. Voucher Posted tidak dapat diedit/dihapus
 */

use App\Models\Account;
use App\Models\JournalLine;
use App\Models\JournalVoucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\JournalVoucherController;
use App\Http\Controllers\AccountingReportController;

$GLOBALS['pass'] = 0;
$GLOBALS['fail'] = 0;
function cek(string $label, bool $ok, string $info = '') {
    if ($ok) { $GLOBALS['pass']++; echo "  [PASS] {$label}\n"; }
    else { $GLOBALS['fail']++; echo "  [FAIL] {$label} {$info}\n"; }
}

echo "=== UJI MODUL AKUNTANSI ===\n";

// Bersihkan data uji.
DB::table('journal_lines')->delete();
DB::table('journal_vouchers')->delete();
DB::table('accounts')->whereIn('nomor_akun', ['1-1000', '1-1010', '4-1000', '5-2000', 'T-0001'])->delete();

$akunCtrl = new AccountController();
$jakun = new JournalVoucherController();
$laporan = new AccountingReportController();
$req = Request::create('/', 'POST');

// --- 1 & 2: COA ---
echo "\n[1-2] Chart of Account\n";
$r = $akunCtrl->store($req, [
    'nomor_akun' => '1-1000',
    'nama_akun' => 'Kas',
    'tipe_akun' => 'Aset',
    'saldo_normal' => 'Debit',
    'keterangan' => 'Kas Tunai',
    'saldo_awal' => 50000000,
    'saldo_awal_tanggal' => '2026-01-01',
]);
$kas = Account::where('nomor_akun', '1-1000')->first();
cek('COA tersimpan ke database', (bool) $kas, '-');

foreach (
    [
        ['1-1010', 'Bank BCA', 'Aset', 'Debit'],
        ['4-1000', 'Pendapatan Penjualan', 'Pendapatan', 'Kredit'],
        ['5-2000', 'Beban Gaji', 'Beban', 'Debit'],
    ] as [$no, $nm, $tipe, $sn]
) {
    $akunCtrl->store($req, [
        'nomor_akun' => $no,
        'nama_akun' => $nm,
        'tipe_akun' => $tipe,
        'saldo_normal' => $sn,
    ]);
}

$duplikat = $akunCtrl->store($req, [
    'nomor_akun' => '1-1000',
    'nama_akun' => 'Kas Ganda',
    'tipe_akun' => 'Aset',
    'saldo_normal' => 'Debit',
]);
cek('Nomor Akun duplikat ditolak', $duplikat->getStatusCode() === 422, '-');

$akunCtrl->update($req, $kas, ['nomor_akun' => '1-1000', 'nama_akun' => 'Kas Buku Besar', 'tipe_akun' => 'Aset', 'saldo_normal' => 'Debit']);
cek('Edit COA berhasil', Account::where('nomor_akun', '1-1000')->first()->nama_akun === 'Kas Buku Besar');

$bank = Account::where('nomor_akun', '1-1010')->first();
$akunCtrl->toggleStatus($req, $bank);
cek('Nonaktifkan akun (tidak menghapus)', !$bank->fresh()->is_active && Account::count() >= 4);

// --- 3: voucher seimbang ---
echo "\n[3] Voucher BALANCE 10jt / 10jt\n";
$kas = Account::where('nomor_akun', '1-1000')->first();
$bank->update(['is_active' => true]);
$bank = $bank->fresh();
$pendapatan = Account::where('nomor_akun', '4-1000')->first();

$vResp = $jakun->store($req, [
    'tanggal' => '2026-01-10',
    'jenis' => 'Voucher Penjualan',
    'keterangan' => 'Uji penjualan',
    'lines' => [
        ['account_id' => $kas->id, 'debit' => 10000000, 'kredit' => 0],
        ['account_id' => $pendapatan->id, 'debit' => 0, 'kredit' => 10000000],
    ],
]);
$v = JournalVoucher::findOrFail($vResp->getData(true)['id']);
cek('Nomor voucher otomatis & unik (format <JENIS>-<TAHUN>-<URUT>)', preg_match('/^[A-Z]{2,3}-2026-\d{4}$/', (string) $v->no_voucher) === 1, (string) $v->no_voucher);
cek('Nama akun otomatis dari Nomor Akun', $v->lines[0]->nama_akun === 'Kas Buku Besar');
cek('Total debit = total kredit', $v->total_debit == 10000000 && $v->total_kredit == 10000000);
cek('Selisih nol / BALANCE', abs($v->selisih()) < 0.009);

// --- 4: voucher tidak seimbang ---
echo "\n[4] Voucher TIDAK BALANCE 10jt / 8jt\n";
$v2Resp = $jakun->store($req, [
    'tanggal' => '2026-01-11',
    'jenis' => 'Jurnal Umum',
    'keterangan' => 'Uji tidak seimbang',
    'lines' => [
        ['account_id' => $kas->id, 'debit' => 10000000, 'kredit' => 0],
        ['account_id' => $pendapatan->id, 'debit' => 0, 'kredit' => 8000000],
    ],
]);
$v2 = JournalVoucher::findOrFail($v2Resp->getData(true)['id']);
cek('Draft tidak seimbang tetap tersimpan (untuk dilanjutkan)', $v2->status === 'DRAFT');
$res = $jakun->post($req, $v2);
cek('Posting ditolak karena tidak seimbang', $res->getStatusCode() === 422);
cek('Selisih reported Rp2.000.000', ($res->getData(true)['selisih'] ?? null) === 2000000, json_encode($res->getData(true)));

// --- 5: draft tidak memengaruhi laporan ---
echo "\n[5] Draft tidak memengaruhi Buku Besar & Neraca Saldo\n";
$kasAwal = $laporan->bukuBesar(Request::create('/', 'GET', ['account_id' => $kas->id]));
$nsAwal = $laporan->neracaSaldo(Request::create('/', 'GET'));
cek('Buku Besar belum berubah', $kasAwal->getData(true)['total_debit'] == 0);
cek('Saldo awal terbaca dari COA', $kasAwal->getData(true)['saldo_awal'] == 50000000);
cek('Neraca Saldo hanya saldo awal', $nsAwal->getData(true)['total_debit'] == 50000000.0);

// --- 6 & 7: posting ---
echo "\n[6-7] Posting, rekap, buku besar, neraca saldo\n";
$res = $jakun->post($req, $v);
cek('Posting berhasil', $res->getStatusCode() === 200 && $v->fresh()->status === 'POSTED');

$res2 = $jakun->post($req, $v);
cek('Cegah posting ganda', $res2->getStatusCode() === 422);

$rekap = $laporan->journalUmum(Request::create('/', 'GET'))->getData(true);
cek('Masuk rekap tepat 1 kali', $rekap['jumlah_voucher'] === 1);
cek('Semua baris jurnal ikut (2 baris)', count($rekap['rows']) === 2);
cek('Rekap BALANCE', $rekap['balanced'] === true);

$bb = $laporan->bukuBesar(Request::create('/', 'GET', ['account_id' => $kas->id]))->getData(true);
cek('Buku Besar berubah', $bb['total_debit'] == 10000000);
cek('Saldo akhir = awal + mutasi', $bb['saldo_akhir'] == 60000000);

$ns = $laporan->neracaSaldo(Request::create('/', 'GET'))->getData(true);
cek('Neraca Saldo berubah', $ns['total_debit'] == 60000000.0);
cek('Neraca Saldo BALANCE', $ns['balanced'] === true);

// --- 9: posted terkunci ---
echo "\n[9] Voucher Posted terkunci\n";
$edit = $jakun->update($req, $v->fresh(), [
    'tanggal' => '2026-01-10',
    'jenis' => 'Voucher Penjualan',
    'lines' => [['account_id' => $kas->id, 'debit' => 1, 'kredit' => 0], ['account_id' => $pendapatan->id, 'debit' => 0, 'kredit' => 1]],
]);
cek('Edit voucher posted ditolak', $edit->getStatusCode() === 422);
cek('Hapus voucher posted ditolak', $jakun->destroy($v->fresh())->getStatusCode() === 422);

// --- 8: jurnal penyesuaian ---
echo "\n[8] Jurnal Penyesuaian\n";
$beban = Account::where('nomor_akun', '5-2000')->first();
$jpResp = $jakun->store($req, [
    'tanggal' => '2026-01-31',
    'jenis' => 'Jurnal Penyesuaian',
    'keterangan' => 'Uji penyesuaian',
    'lines' => [
        ['account_id' => $beban->id, 'debit' => 5000000, 'kredit' => 0],
        ['account_id' => $kas->id, 'debit' => 0, 'kredit' => 5000000]
    ],
]);
$jp = JournalVoucher::findOrFail($jpResp->getData(true)['id']);
cek('Tipe tersimpan PENYESUAIAN', $jp->tipe === 'PENYESUAIAN');
$jakun->post($req, $jp);
$rekap2 = $laporan->journalUmum(Request::create('/', 'GET'))->getData(true);
cek('Penyesuaian masuk rekap yang sama', $rekap2['jumlah_voucher'] === 2 && $rekap2['balanced'] === true);

// --- Reversal ---
echo "\n[Tambahan] Reversal untuk koreksi\n";
$rev = $jakun->reverse($req, $v->fresh(), ['alasan' => 'Uji koreksi']);
cek('Reversal membuat voucher baru', $rev->getStatusCode() === 200);
cek('Voucher asli jadi VOID (histori utuh)', $v->fresh()->status === 'VOID');
cek('Reversal tidak bisa dua kali', $jakun->reverse($req, $v->fresh(), ['alasan' => 'x'])->getStatusCode() === 422);

// --- Laporan keuangan & peringatan konfigurasi ---
echo "\n[Tambahan] Laporan Keuangan\n";
$lr = $laporan->labaRugi(Request::create('/', 'GET'))->getData(true);
cek('Laba Rugi terhitung', isset($lr['laba_bersih']));
cek('Peringatan konfigurasi muncul (COA belum lengkap)', is_array($lr['peringatan']) && count($lr['peringatan']) > 0);
$nr = $laporan->neraca(Request::create('/', 'GET'))->getData(true);
cek('Neraca terhitung', isset($nr['total_aset']));

echo "\n=== HASIL: {$GLOBALS['pass']} PASS, {$GLOBALS['fail']} FAIL ===\n";

// Bersihkan data uji.
DB::table('journal_lines')->delete();
DB::table('journal_vouchers')->delete();
DB::table('accounts')->whereIn('nomor_akun', ['1-1000', '1-1010', '4-1000', '5-2000'])->delete();
