<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventories', function (Blueprint $table) {
    $table->id();
    $table->string('part_number')->unique();     // Kode unik barang / part number
    $table->string('item_name');                 // Nama barang / deskripsi
    $table->string('category')->nullable();      // Kategori barang (misal: Sparepart, Alat Berat, dll)
    $table->integer('stock_quantity')->default(0); // Jumlah stok saat ini
    $table->string('unit')->default('PCS');      // Satuan (PCS, SET, UNIT, dll)
    $table->decimal('purchase_price', 15, 2)->default(0); // Harga beli modal
    $table->decimal('selling_price', 15, 2)->default(0);  // Harga jual standar
    $table->string('warehouse_location')->nullable();     // Lokasi rak/gudang penyimpanan
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
