<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $table) {
                $table->id();
                $table->string('customer_code')->unique();
                $table->string('customer_name');
                $table->text('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('status')->default('AKTIF');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->string('supplier_code')->unique();
                $table->string('supplier_name');
                $table->text('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('status')->default('AKTIF');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('inventory_stocks')) {
            Schema::create('inventory_stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
                $table->foreignId('warehouse_location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
                $table->integer('quantity')->default(0);
                $table->timestamps();
                $table->unique(['product_id', 'warehouse_id', 'warehouse_location_id'], 'inventory_stock_location_unique');
            });
        }

        if (!Schema::hasTable('stock_opnames')) {
            Schema::create('stock_opnames', function (Blueprint $table) {
                $table->id();
                $table->string('document_number')->unique();
                $table->date('opname_date');
                $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
                $table->string('status')->default('DRAFT');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('stock_opname_items')) {
            Schema::create('stock_opname_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
                $table->integer('system_quantity')->default(0);
                $table->integer('physical_quantity')->default(0);
                $table->integer('difference')->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // Backfill stok existing ke Warehouse Utama tanpa menghapus products.stock.
        $mainWarehouse = DB::table('warehouses')->where('code', 'MAIN')->first();
        $mainWarehouseId = $mainWarehouse?->id;
        if (!$mainWarehouseId) {
            $mainWarehouseId = DB::table('warehouses')->insertGetId([
                'code' => 'MAIN',
                'name' => 'Warehouse Utama',
                'status' => 'AKTIF',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        foreach (DB::table('products')->select('id', 'stock')->get() as $product) {
            $exists = DB::table('inventory_stocks')
                ->where('product_id', $product->id)
                ->where('warehouse_id', $mainWarehouseId)
                ->whereNull('warehouse_location_id')
                ->exists();
            if (!$exists) {
                DB::table('inventory_stocks')->insert([
                    'product_id' => $product->id,
                    'warehouse_id' => $mainWarehouseId,
                    'warehouse_location_id' => null,
                    'quantity' => max(0, (int) $product->stock),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if (!Schema::hasTable('deletion_histories')) {
            Schema::create('deletion_histories', function (Blueprint $table) {
                $table->id();
                $table->string('document_type');
                $table->unsignedBigInteger('document_id')->nullable();
                $table->string('document_number')->nullable();
                $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('reason');
                $table->json('snapshot')->nullable();
                $table->timestamp('deleted_at');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('deletion_histories');
        Schema::dropIfExists('stock_opname_items');
        Schema::dropIfExists('stock_opnames');
        Schema::dropIfExists('inventory_stocks');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customers');
    }
};
