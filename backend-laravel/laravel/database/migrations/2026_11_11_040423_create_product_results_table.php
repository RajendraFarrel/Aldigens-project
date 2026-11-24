<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_results', function (Blueprint $table) {
            $table->id();
            $table->string('pr_no')->unique();
            $table->string('ref_wo');
            $table->date('date');
            $table->string('product'); // Nama barang jadi
            $table->decimal('qty_in', 10, 2);
            $table->string('unit')->nullable()->default('Unit');
            $table->string('status')->default('Disetujui');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_results');
    }
};