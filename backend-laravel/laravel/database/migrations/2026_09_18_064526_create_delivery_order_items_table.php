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
        Schema::create('delivery_order_items', function (Blueprint $table) {
    $table->id();
    // Relasi ke tabel delivery_orders
    $table->foreignId('delivery_order_id')->constrained('delivery_orders')->onDelete('cascade');

    $table->string('part_number')->nullable();
    $table->text('description');
    $table->integer('qty_sent');                   // Jumlah barang yang dikirim pada DO ini
    $table->string('unit')->default('SET');

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_order_items');
    }
};
