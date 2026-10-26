<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Purchase Invoice (tagihan dari supplier).
 *
 * Sebelumnya project BELUM memiliki tabel tagihan pembelian
 * (hanya purchase_orders, receive_items, purchase_payments).
 * Tabel ini menjadi sumber tunggal utang supplier.
 *
 * Aman di-rollback dan tidak menyentuh tabel yang sudah ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('purchase_invoices')) {
            Schema::create('purchase_invoices', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number', 64)->unique();   // nomor internal PI-YYYY-0001
                $table->string('supplier_invoice_number', 191)->nullable(); // nomor faktur dari supplier
                $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
                $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
                $table->foreignId('receive_item_id')->nullable()->constrained('receive_items')->nullOnDelete();

                $table->date('invoice_date');
                $table->date('due_date')->nullable();

                $table->decimal('sub_total', 20, 2)->default(0);
                $table->decimal('tax_percentage', 5, 2)->default(0);
                $table->decimal('tax_amount', 20, 2)->default(0);
                $table->decimal('grand_total', 20, 2)->default(0);

                // Akun debit tagihan (persediaan / aset / beban) — wajib dipilih,
                // tidak dikarang oleh sistem.
                $table->foreignId('debit_account_id')->nullable()->constrained('accounts')->restrictOnDelete();

                $table->enum('status', ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])->default('UNPAID');
                $table->enum('journal_status', ['UNPOSTED', 'POSTED', 'FAILED'])->default('UNPOSTED');
                $table->foreignId('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();

                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();

                $table->index(['supplier_id', 'status']);
                $table->index('invoice_date');
            });
        }

        if (! Schema::hasTable('purchase_invoice_items')) {
            Schema::create('purchase_invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->cascadeOnDelete();
                $table->string('part_number', 191)->nullable();
                $table->string('description', 255);
                $table->decimal('qty', 15, 3)->default(0);
                $table->string('unit', 50)->default('PCS');
                $table->decimal('unit_price', 20, 2)->default(0);
                $table->decimal('amount', 20, 2)->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_items');
        Schema::dropIfExists('purchase_invoices');
    }
};
