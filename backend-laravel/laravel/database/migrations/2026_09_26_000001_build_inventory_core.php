<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'minimum_stock')) {
            Schema::table('products', fn(Blueprint $table) => $table->integer('minimum_stock')->default(0)->after('stock'));
        }
        if (!Schema::hasColumn('products', 'maximum_stock')) {
            Schema::table('products', fn(Blueprint $table) => $table->integer('maximum_stock')->nullable()->after('minimum_stock'));
        }
        if (!Schema::hasColumn('products', 'item_type')) {
            Schema::table('products', fn(Blueprint $table) => $table->string('item_type')->default('BAHAN / COMPONENT')->after('category'));
        }
        if (!Schema::hasColumn('products', 'status')) {
            Schema::table('products', fn(Blueprint $table) => $table->string('status')->default('AKTIF')->after('maximum_stock'));
        }

        if (!Schema::hasTable('warehouses')) {
            Schema::create('warehouses', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->string('address')->nullable();
                $table->string('status')->default('AKTIF');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('warehouse_locations')) {
            Schema::create('warehouse_locations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
                $table->string('code');
                $table->string('name')->nullable();
                $table->string('status')->default('AKTIF');
                $table->timestamps();
                $table->unique(['warehouse_id', 'code']);
            });
        }

        if (!Schema::hasColumn('inventory_transactions', 'user_id')) {
            Schema::table('inventory_transactions', fn(Blueprint $table) => $table->foreignId('user_id')->nullable()->after('product_id')->constrained('users')->nullOnDelete());
        }
        foreach (['warehouse_id', 'warehouse_location_id'] as $column) {
            if (!Schema::hasColumn('inventory_transactions', $column)) {
                Schema::table('inventory_transactions', function (Blueprint $table) use ($column) {
                    if ($column === 'warehouse_id') $table->foreignId($column)->nullable()->after('user_id')->constrained()->nullOnDelete();
                    else $table->foreignId($column)->nullable()->after('warehouse_id')->constrained()->nullOnDelete();
                });
            }
        }
        foreach (['reference_type', 'reference_number'] as $column) {
            if (!Schema::hasColumn('inventory_transactions', $column)) {
                Schema::table('inventory_transactions', fn(Blueprint $table) => $table->string($column)->nullable());
            }
        }
        if (!Schema::hasColumn('inventory_transactions', 'reference_id')) {
            Schema::table('inventory_transactions', fn(Blueprint $table) => $table->unsignedBigInteger('reference_id')->nullable());
        }
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE inventory_transactions MODIFY transaction_type VARCHAR(40) NOT NULL");
        }
    }

    public function down(): void
    {
        // Data-safe migration: schema rollback is intentionally non-destructive.
    }
};
