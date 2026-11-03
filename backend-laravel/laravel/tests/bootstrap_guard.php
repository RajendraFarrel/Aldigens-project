<?php

/**
 * Bootstrap khusus PHPUnit: MENOLAK berjalan bila database bukan database uji.
 *
 * Perlindungan wajib Tahap 1 AIMS — test memakai RefreshDatabase yang menghapus
 * seluruh tabel, sehingga TIDAK boleh menyentuh database perusahaan (`aldigens`).
 *
 * Jalankan test dengan:  $env:DB_DATABASE='aldigens_test'; php artisan test
 */

$testing = getenv('DB_DATABASE') ?: null;

if (!$testing || strcasecmp($testing, 'aldigens') === 0) {
    fwrite(STDERR, "\n[ABORT] Test dibatalkan: DB_DATABASE harus database uji (mis. aldigens_test), bukan database perusahaan.\n");
    exit(1);
}
