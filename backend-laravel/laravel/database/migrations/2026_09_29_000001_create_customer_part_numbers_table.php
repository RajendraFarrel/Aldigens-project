<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_part_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('part_number', 255);
            $table->string('item_description', 500)->nullable();
            $table->decimal('selling_price', 18, 2)->nullable();
            $table->string('status', 30)->default('AKTIF');
            $table->timestamps();
            $table->unique(['customer_id', 'part_number']);
            $table->index('part_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_part_numbers');
    }
};
