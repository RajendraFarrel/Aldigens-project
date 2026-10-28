<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            
            // Kolom tambahan untuk menyesuaikan dengan Form React
            $table->string('part_number')->nullable();
            $table->string('description');
            $table->integer('quantity');
            $table->string('unit')->default('PCS');
            
            $table->decimal('unit_price', 15, 2);
            $table->decimal('total_price', 15, 2); // Subtotal per item
            $table->decimal('amount', 15, 2)->nullable(); // Alternatif penamaan dari Controller
            
            // INI FITUR PAJAKNYA:
            $table->string('tax_code', 5)->nullable(); // Untuk menyimpan huruf "T"
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};