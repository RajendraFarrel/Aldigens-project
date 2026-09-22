<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('purchase_orders', function (Blueprint $table) {
        $table->id();
        $table->foreignId('quotation_id')->constrained()->cascadeOnDelete(); // Relasi ke Quotation asal
        $table->string('customer_po_number')->unique(); // Nomor dokumen dari klien
        $table->date('po_date');
        $table->enum('status', ['pending', 'confirmed', 'processed_to_so'])->default('pending');
        $table->text('notes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
