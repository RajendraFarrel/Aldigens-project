<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Header & alokasi pembayaran piutang/utang.
 *
 * Mengapa tabel baru:
 * - `sales_receipts` (existing) hanya menyimpan struk/cheque tanpa relasi invoice.
 * - `purchase_payments` (existing) hanya menyimpan vendor_name teks + metode.
 * Keduanya tidak dapat mengalokasikan satu pembayaran ke beberapa invoice,
 * sehingga saldo piutang/utang tidak bisa dihitung dari alokasi yang sah.
 *
 * Tabel baru ini TIDAK menyimpan debit/kredit. Jurnal tetap di
 * journal_vouchers/journal_lines (sumber tunggal akuntansi).
 *
 * Aman di-rollback: tidak mengubah tabel existing mana pun.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------- Penerimaan dari customer (piutang) ----------
        if (! Schema::hasTable('payment_receipts')) {
            Schema::create('payment_receipts', function (Blueprint $table) {
                $table->id();
                $table->string('receipt_number', 64)->unique();
                $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
                $table->foreignId('cash_bank_id')->constrained('cash_banks')->restrictOnDelete();
                $table->date('payment_date');
                $table->decimal('amount', 20, 2);
                $table->string('reference_number', 191)->nullable();
                $table->text('notes')->nullable();

                // Referensi ID unik dari klien/permintaan untuk mencegah dobel simpan.
                $table->string('request_key', 100)->nullable()->unique();

                $table->enum('journal_status', ['POSTED', 'FAILED'])->default('POSTED');
                $table->foreignId('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();

                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index(['customer_id', 'payment_date']);
            });
        }

        if (! Schema::hasTable('payment_receipt_allocations')) {
            Schema::create('payment_receipt_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payment_receipt_id')->constrained('payment_receipts')->cascadeOnDelete();
                $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
                $table->decimal('amount', 20, 2);
                $table->timestamps();

                $table->index('invoice_id');
            });
        }

        // ---------- Pembayaran ke supplier (utang) ----------
        if (! Schema::hasTable('supplier_payments')) {
            Schema::create('supplier_payments', function (Blueprint $table) {
                $table->id();
                $table->string('payment_number', 64)->unique();
                $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
                $table->foreignId('cash_bank_id')->constrained('cash_banks')->restrictOnDelete();
                $table->date('payment_date');
                $table->decimal('amount', 20, 2);
                $table->string('reference_number', 191)->nullable();
                $table->text('notes')->nullable();
                $table->string('request_key', 100)->nullable()->unique();

                $table->enum('journal_status', ['POSTED', 'FAILED'])->default('POSTED');
                $table->foreignId('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();

                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index(['supplier_id', 'payment_date']);
            });
        }

        if (! Schema::hasTable('supplier_payment_allocations')) {
            Schema::create('supplier_payment_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('supplier_payment_id')->constrained('supplier_payments')->cascadeOnDelete();
                $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->restrictOnDelete();
                $table->decimal('amount', 20, 2);
                $table->timestamps();

                $table->index('purchase_invoice_id');
            });
        }

        /*
         * Relasi customer pada invoice penjualan.
         * Invoice existing menyimpan customer_name sebagai teks. `customer_id`
         * ditambahkan agar piutang dapat diagregasi per master customer tanpa
         * menebak dari nama. Data lama TIDAK diubah; diisi hanya saat invoice baru.
         */
        if (! Schema::hasColumn('invoices', 'customer_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->foreignId('customer_id')->nullable()->after('id')
                    ->constrained('customers')->nullOnDelete();
            });
        }

        // Jurnal untuk invoice penjualan (belum ada sebelumnya).
        if (! Schema::hasColumn('invoices', 'journal_voucher_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->foreignId('journal_voucher_id')->nullable()->after('status')
                    ->constrained('journal_vouchers')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoices', 'journal_voucher_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropConstrainedForeignId('journal_voucher_id');
            });
        }
        if (Schema::hasColumn('invoices', 'customer_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropConstrainedForeignId('customer_id');
            });
        }

        Schema::dropIfExists('supplier_payment_allocations');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('payment_receipt_allocations');
        Schema::dropIfExists('payment_receipts');
    }
};
