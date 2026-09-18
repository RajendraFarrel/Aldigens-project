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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number')->unique(); 
            $table->date('date');
            $table->integer('revision')->default(0);
            $table->string('admin_sales'); 
            
            // Data Customer
            $table->string('customer_name'); 
            $table->text('customer_address');
            $table->string('attention_person')->nullable(); 
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();
            
            // Informasi Proyek
            $table->string('model_unit')->nullable(); 
            $table->string('subject')->nullable(); 
            
            // Syarat & Ketentuan (T&C)
            $table->string('currency')->default('IDR (Rupiah)');
            $table->string('place_of_delivery')->nullable(); 
            $table->string('terms_of_payment')->nullable(); 
            $table->string('terms_of_delivery')->nullable(); 
            $table->string('terms_of_warranty')->nullable(); 
            
            // Kalkulasi Angka 
            $table->bigInteger('sub_total')->default(0);
            $table->integer('tax_percentage')->default(11);
            $table->bigInteger('tax_amount')->default(0);
            $table->bigInteger('grand_total')->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
