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
        Schema::create('sales_order_items', function (Blueprint $table) {
    $table->id();
    // Relasi ke tabel sales_orders
    $table->foreignId('sales_order_id')->constrained('sales_orders')->onDelete('cascade');

    $table->string('part_number')->nullable();
    $table->text('description');
    $table->integer('qty');
    $table->string('unit')->default('SET');
    $table->decimal('unit_price', 15, 2);
    $table->decimal('amount', 15, 2);

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_order_items');
    }
};
