<?php

/*
|--------------------------------------------------------------------------
| Konfigurasi Akun Kunci Modul Akuntansi
|--------------------------------------------------------------------------
|
| Nilai di bawah adalah NOMOR AKUN di Chart of Account (bukan ID).
| Kosongkan bila perusahaan belum menetapkan; sistem akan mencari akun
| berdasarkan nama ("Piutang Usaha" / "Utang Usaha") dan bila ambigu akan
| berhenti dengan pesan konfigurasi — tidak pernah menebak sendiri.
|
| Isi melalui .env:
|   ACCOUNTING_PIUTANG_KODE=1-2100
|   ACCOUNTING_UTANG_KODE=2-1100
|   ACCOUNTING_PAJAK_KELUARAN_KODE=2-1300
|   ACCOUNTING_PAJAK_MASUKAN_KODE=1-1400
|
*/

return [
    'piutang_kode'          => env('ACCOUNTING_PIUTANG_KODE', ''),
    'utang_kode'            => env('ACCOUNTING_UTANG_KODE', ''),
    'pendapatan_kode'       => env('ACCOUNTING_PENDAPATAN_KODE', ''),
    'pajak_keluaran_kode'   => env('ACCOUNTING_PAJAK_KELUARAN_KODE', ''),
    'pajak_masukan_kode'    => env('ACCOUNTING_PAJAK_MASUKAN_KODE', ''),
];
