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
        Schema::create('delivery_orders', function (Blueprint $table) {
    $table->id();
    // Relasi ke Sales Order
    $table->foreignId('sales_order_id')->constrained('sales_orders')->onDelete('cascade');

    $table->string('do_number')->unique();         // Nomor Surat Jalan / Delivery Order
    $table->date('do_date');                       // Tanggal pengiriman
    $table->string('customer_name');               // Nama penerima / customer
    $table->text('delivery_address');              // Alamat pengiriman barang
    $table->string('vehicle_number')->nullable();  // Nomor plat kendaraan / kurir
    $table->string('driver_name')->nullable();     // Nama pengemudi
    $table->string('status')->default('Shipped');  // Shipped, Delivered, Cancelled
    $table->text('notes')->nullable();             // Catatan pengiriman

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
