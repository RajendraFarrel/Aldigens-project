<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('receive_items')) Schema::create('receive_items', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique();
            $table->date('receive_date');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->string('status')->default('COMPLETED');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        if (!Schema::hasTable('receive_item_items')) Schema::create('receive_item_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receive_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->string('unit', 50);
            $table->timestamps();
        });
        if (!Schema::hasTable('supplier_returns')) Schema::create('supplier_returns', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique();
            $table->date('return_date');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('receive_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        if (!Schema::hasTable('supplier_return_items')) Schema::create('supplier_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->string('unit', 50);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('supplier_return_items');
        Schema::dropIfExists('supplier_returns');
        Schema::dropIfExists('receive_item_items');
        Schema::dropIfExists('receive_items');
    }
};
