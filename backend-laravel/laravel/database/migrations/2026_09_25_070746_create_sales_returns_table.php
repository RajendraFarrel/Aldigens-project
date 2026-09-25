<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_no')->unique(); // Contoh: SR-202609-001
            $table->date('date');
            
            // Relasi ke tabel master
            $table->string('customer_name');
            $table->string('invoice_no')->nullable();
            
            $table->decimal('amount', 15, 2)->default(0);
            $table->text('description')->nullable();
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('sales_returns');
    }
};
