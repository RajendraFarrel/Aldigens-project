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
        Schema::create('purchase_returns', function (Blueprint $table) {
    $table->id();
    $table->string('return_no')->unique(); // No. Retur (PR)
    $table->date('date');                  // Tanggal Retur
    $table->string('vendor_name');         // Nama Vendor
    $table->string('invoice_ref')->nullable(); // Ref Faktur (PI)
    $table->decimal('amount', 15, 2);      // Total Nilai Retur
    $table->text('description')->nullable(); // Alasan / Keterangan
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_returns');
    }
};
