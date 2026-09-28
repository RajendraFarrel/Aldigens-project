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
        Schema::create('purchase_payments', function (Blueprint $table) {
    $table->id();
    $table->string('payment_no')->unique();    // No. Pembayaran (PP)
    $table->date('date');                      // Tanggal Bayar
    $table->string('vendor_name');             // Vendor Penerima
    $table->string('payment_method');          // Metode (Transfer BCA, Kas Kecil, dll)
    $table->decimal('amount', 15, 2);          // Total Dibayar
    $table->text('notes')->nullable();         // Keterangan / Ref Faktur
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_payments');
    }
};
