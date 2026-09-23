<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Hapus kolom lama jika ada (sesuaikan dengan yang sudah ada)
            if (Schema::hasColumn('products', 'kode_barang')) {
                $table->dropUnique(['kode_barang']);
                $table->dropColumn('kode_barang');
            }
            if (Schema::hasColumn('products', 'nama_barang')) {
                $table->dropColumn('nama_barang');
            }
            if (Schema::hasColumn('products', 'harga')) {
                $table->dropColumn('harga');
            }
            if (Schema::hasColumn('products', 'stok')) {
                $table->dropColumn('stok');
            }

            // Tambah kolom baru
            if (!Schema::hasColumn('products', 'product_code')) {
                $table->string('product_code')->unique()->after('id');
            }
            if (!Schema::hasColumn('products', 'barcode')) {
                $table->string('barcode')->unique()->nullable()->after('product_code');
            }
            if (!Schema::hasColumn('products', 'part_number')) {
                $table->string('part_number')->nullable()->after('barcode');
            }
            if (!Schema::hasColumn('products', 'name')) {
                $table->string('name')->after('part_number');
            }
            if (!Schema::hasColumn('products', 'category')) {
                $table->string('category')->nullable()->after('name');
            }
            if (!Schema::hasColumn('products', 'unit')) {
                $table->string('unit')->default('Unit')->after('category');
            }
            if (!Schema::hasColumn('products', 'stock')) {
                $table->integer('stock')->default(0)->after('unit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['product_code', 'barcode', 'part_number', 'name', 'category', 'unit', 'stock']);
        });
    }
};
