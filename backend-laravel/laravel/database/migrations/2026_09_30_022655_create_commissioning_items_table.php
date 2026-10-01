<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissioning_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commissioning_id')->constrained('commissionings')->cascadeOnDelete();
            $table->string('check_item'); // Contoh: Pengujian Tekanan Hidrolik / Kelistrikan
            $table->enum('result', ['LOLOS', 'TIDAK_LOLOS', 'NA'])->default('NA');
            $table->text('remarks')->nullable(); // Catatan spesifik per item
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissioning_items');
    }
};