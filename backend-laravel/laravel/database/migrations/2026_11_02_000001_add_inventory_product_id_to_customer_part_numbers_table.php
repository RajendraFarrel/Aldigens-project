<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap A — Hubungkan record Part Number Customer ke satu produk Inventory.
 *
 * Migration ini murni ADDITIVE:
 * - hanya menambah kolom nullable `inventory_product_id` bila belum ada;
 * - tidak mengubah `status`, `selling_price`, `part_number`, `customer_id`;
 * - tidak mengubah/menghapus data lama (nilai lama tetap NULL / "Belum Terhubung");
 * - tidak membuat unique constraint global, karena produk internal yang sama
 *   boleh dipakai oleh beberapa customer.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('customer_part_numbers', 'inventory_product_id')) {
            return;
        }

        Schema::table('customer_part_numbers', function (Blueprint $table) {
            $table->unsignedBigInteger('inventory_product_id')->nullable()->after('status');
            $table->index('inventory_product_id', 'cpn_inventory_product_id_index');
        });

        // Foreign key ditambahkan terpisah agar aman bila driver membatasi
        // perubahan skema dalam satu statement.
        Schema::table('customer_part_numbers', function (Blueprint $table) {
            $table->foreign('inventory_product_id', 'cpn_inventory_product_id_foreign')
                ->references('id')->on('products')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Non-destruktif: kolom relasi dibiarkan agar data mapping tidak hilang
        // bila migration di-rollback pada database operasional.
    }
};
