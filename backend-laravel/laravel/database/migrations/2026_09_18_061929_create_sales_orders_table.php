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
        Schema::create('sales_orders', function (Blueprint $table) {
    $table->id();
    // Relasi ke tabel quotations (karena SO berasal dari Quotation yang disetujui)
    $table->unsignedBigInteger('quotation_id')->nullable();

    $table->string('so_number')->unique();         // Nomor Sales Order (Contoh: SO-26090001)
    $table->string('client_po_number');            // Nomor PO / SPK dari Klien
    $table->date('so_date');                       // Tanggal SO dibuat
    $table->string('customer_name');               // Nama Customer (PT Sany Perkasa, dll)
    $table->text('customer_address')->nullable();  // Alamat customer
    $table->string('model_unit')->nullable();      // Model Unit (Contoh: SY215H)

    // Status alur kerja SO
    $table->string('status')->default('Pending');  // Pending, Process, Completed, Cancelled

    $table->decimal('sub_total', 15, 2)->default(0);
    $table->decimal('tax_amount', 15, 2)->default(0);
    $table->decimal('grand_total', 15, 2)->default(0);

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
