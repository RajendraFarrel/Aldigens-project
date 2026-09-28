<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'customer_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('customer_id')->nullable()->after('part_number')->constrained('customers')->nullOnDelete();
            });
        }

        if (!Schema::hasTable('purchase_requests')) {
            Schema::create('purchase_requests', function (Blueprint $table) {
                $table->id();
                $table->string('document_number')->unique();
                $table->date('request_date');
                $table->foreignId('requester_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
                $table->string('request_type')->nullable();
                $table->text('notes')->nullable();
                $table->string('status')->default('DRAFT');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('purchase_request_items')) {
            Schema::create('purchase_request_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('purchase_request_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->restrictOnDelete();
                $table->decimal('quantity', 15, 3);
                $table->string('unit', 50);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('boms')) {
            Schema::create('boms', function (Blueprint $table) {
                $table->id();
                $table->string('document_number')->unique();
                $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
                $table->decimal('output_quantity', 15, 3)->default(1);
                $table->string('unit', 50)->default('PCS');
                $table->string('status')->default('AKTIF');
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('bom_items')) {
            Schema::create('bom_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bom_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
                $table->decimal('quantity', 15, 3);
                $table->string('unit', 50);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_items');
        Schema::dropIfExists('boms');
        Schema::dropIfExists('purchase_request_items');
        Schema::dropIfExists('purchase_requests');
    }
};
