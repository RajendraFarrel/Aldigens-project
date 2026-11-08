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
    Schema::create('goods_receipt_items', function (Blueprint $table) {
        $table->id();
        $table->foreignId('goods_receipt_id')->constrained()->cascadeOnDelete();
        
        // Relasi ke master data inventory
        $table->unsignedBigInteger('inventory_product_id');
        $table->foreign('inventory_product_id')->references('id')->on('inventories')->cascadeOnDelete();
        
        $table->integer('qty');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goods_receipt_items');
    }
};
