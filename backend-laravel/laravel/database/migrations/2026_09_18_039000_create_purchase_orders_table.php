<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            // Dibuat nullable karena sekarang kita bisa buat PO langsung tanpa Quotation
            $table->foreignId('quotation_id')->nullable()->constrained()->cascadeOnDelete(); 
            
            $table->string('po_number')->unique(); // Nomor PO yang di-generate sistem
            $table->string('customer_po_number')->nullable(); // Nomor dokumen dari klien (opsional)
            $table->date('po_date');
            
            // Kolom tambahan untuk menyesuaikan dengan Form React
            $table->string('customer_name')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('subject')->nullable();
            $table->string('terms')->nullable();
            $table->string('ship_via')->nullable();
            
            // Kolom untuk perhitungan Total dan Pajak
            $table->decimal('sub_total', 15, 2)->default(0);
            $table->decimal('tax_percentage', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            
            $table->enum('status', ['pending', 'confirmed', 'processed_to_so'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};