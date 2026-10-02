<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fondasi Modul Akuntansi.
 *
 * - accounts        : Chart of Account (sumber tunggal semua jurnal)
 * - journal_vouchers: header voucher / jurnal penyesuaian
 * - journal_lines   : detail akun debit & kredit per voucher
 *
 * Catatan: tidak ada data awal (saldo awal / COA) yang di-seed di sini.
 * Saldo awal & daftar akun harus diisi perusahaan, bukan dikarang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_akun', 50)->unique();       // Nomor Akun (dulu "Kode Akun")
            $table->string('nama_akun', 191);                  // Nama Akun
            $table->enum('tipe_akun', ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban']);
            $table->enum('saldo_normal', ['Debit', 'Kredit']);
            $table->text('keterangan')->nullable();           // Keterangan / uraian akun
            $table->boolean('is_active')->default(true);      // Nonaktif = tidak boleh dipakai transaksi baru
            $table->boolean('is_header')->default(false);      // Akun induk (tidak bisa dipilih di jurnal)
            $table->string('parent_nomor_akun', 50)->nullable();

            // Saldo awal periode buku (diisi manual oleh perusahaan, bukan dihitung)
            $table->decimal('saldo_awal', 20, 2)->default(0);
            $table->date('saldo_awal_tanggal')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['tipe_akun', 'is_active']);
        });

        Schema::create('journal_vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('no_voucher', 50)->unique();       // Nomor voucher otomatis & unik
            $table->date('tanggal');
            $table->string('jenis');                          // Voucher Pembelian, Bank Keluar, Jurnal Umum, ...
            $table->string('keterangan')->nullable();

            // Referensi dokumen sumber (PO, Invoice, Supplier, dll)
            $table->string('no_referensi')->nullable();
            $table->string('pihak_terkait')->nullable();
            $table->string('kas_bank')->nullable();

            $table->enum('status', ['DRAFT', 'POSTED', 'VOID'])->default('DRAFT');
            $table->enum('tipe', ['VOUCHER', 'PENYESUAIAN'])->default('VOUCHER');

            // Total hasil hitungan baris (disimpan agar cepat difilter/diverifikasi)
            $table->decimal('total_debit', 20, 2)->default(0);
            $table->decimal('total_kredit', 20, 2)->default(0);

            // Reversal: voucher koreksi tidak menghapus histori
            $table->unsignedBigInteger('reversal_of_id')->nullable();
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_alasan')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'tanggal']);
            $table->index('jenis');
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_voucher_id')->constrained('journal_vouchers')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete();
            $table->string('nomor_akun', 50);                  // disalin agar histori tetap terbaca
            $table->string('nama_akun', 191);
            $table->decimal('debit', 20, 2)->default(0);
            $table->decimal('kredit', 20, 2)->default(0);
            $table->string('memo')->nullable();
            $table->unsignedSmallInteger('line_order')->default(0);
            $table->timestamps();

            $table->index(['account_id', 'journal_voucher_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_vouchers');
        Schema::dropIfExists('accounts');
    }
};
