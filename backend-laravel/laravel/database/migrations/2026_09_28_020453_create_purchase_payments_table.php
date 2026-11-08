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
            $table->string('paymentNo')->unique();           // Sesuai dengan input frontend
            $table->date('date');
            $table->string('invoice_reference')->nullable(); // Wajib ditambahkan untuk menyimpan nomor faktur
            $table->string('vendorName');                    // Sesuai dengan input frontend
            $table->string('paymentMethod');                 // Sesuai dengan input frontend
            $table->decimal('amount', 15, 2);
            $table->text('notes')->nullable();
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