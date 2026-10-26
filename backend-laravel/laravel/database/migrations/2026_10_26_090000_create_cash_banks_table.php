<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Master Kas & Bank.
 *
 * Hanya menyimpan METADATA (jenis, nama tampilan, data rekening).
 * Saldo TIDAK disimpan di sini — saldo & mutasi tetap dihitung dari
 * accounts.saldo_awal + journal_lines POSTED, supaya tidak ada ledger kedua.
 *
 * Satu akun COA hanya boleh dipasangkan ke satu master (unique account_id).
 * Aman di-rollback: tabel ini terpisah dan tidak mengubah COA/jurnal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete();
            $table->enum('jenis', ['KAS', 'BANK']);
            $table->string('nama_tampilan', 191);            // contoh: "Kas Utama"
            $table->string('nama_bank', 191)->nullable();     // khusus BANK
            $table->string('cabang', 191)->nullable();        // khusus BANK
            $table->string('nomor_rekening', 64)->nullable(); // khusus BANK
            $table->string('nama_pemilik', 191)->nullable();  // khusus BANK
            $table->boolean('is_active')->default(true);
            $table->text('keterangan')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->unique('account_id');
            $table->index(['jenis', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_banks');
    }
};
