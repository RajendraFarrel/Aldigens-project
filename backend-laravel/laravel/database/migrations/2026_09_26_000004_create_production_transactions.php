<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('productions')) Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique();
            $table->foreignId('bom_id')->constrained('boms')->restrictOnDelete();
            $table->date('production_date');
            $table->decimal('quantity', 15, 3);
            $table->string('status')->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        if (!Schema::hasTable('production_items')) Schema::create('production_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('direction');
            $table->decimal('quantity', 15, 3);
            $table->string('unit', 50);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('production_items');
        Schema::dropIfExists('productions');
    }
};
