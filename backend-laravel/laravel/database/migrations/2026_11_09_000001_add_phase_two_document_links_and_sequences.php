<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('sales_order_items', 'product_id')) {
            Schema::table('sales_order_items', function (Blueprint $table) {
                $table->foreignId('product_id')->nullable()->after('sales_order_id')
                    ->constrained('products')->nullOnDelete();
            });
        }

        foreach (['so_number', 'ref_po'] as $column) {
            if (!Schema::hasColumn('delivery_orders', $column)) {
                Schema::table('delivery_orders', function (Blueprint $table) use ($column) {
                    $table->string($column)->nullable();
                });
            }
        }

        Schema::table('delivery_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_order_items', 'product_id')) {
                $table->foreignId('product_id')->nullable()->after('delivery_order_id')
                    ->constrained('products')->nullOnDelete();
            }
            if (!Schema::hasColumn('delivery_order_items', 'sales_order_item_id')) {
                $table->foreignId('sales_order_item_id')->nullable()->after('product_id')
                    ->constrained('sales_order_items')->nullOnDelete();
            }
        });

        if (!Schema::hasTable('document_number_sequences')) {
            Schema::create('document_number_sequences', function (Blueprint $table) {
                $table->id();
                $table->string('sequence_type', 32);
                $table->string('sequence_key', 32);
                $table->unsignedInteger('last_value')->default(0);
                $table->timestamps();
                $table->unique(['sequence_type', 'sequence_key'], 'document_number_sequences_type_key_unique');
            });
        }

        DB::table('document_number_sequences')->insertOrIgnore([
            'sequence_type' => 'customer',
            'sequence_key' => now()->format('ym'),
            'last_value' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $customerPrefix = 'CUST-' . now()->format('ym') . '-';
        $existingCustomerCodes = DB::table('customers')
            ->where('customer_code', 'like', $customerPrefix . '%')
            ->pluck('customer_code');
        $highestCustomerSequence = $existingCustomerCodes->map(function ($code) use ($customerPrefix) {
            $suffix = substr($code, strlen($customerPrefix));
            return ctype_digit($suffix) ? (int) $suffix : 0;
        })->max() ?? 0;
        DB::table('document_number_sequences')
            ->where('sequence_type', 'customer')
            ->where('sequence_key', now()->format('ym'))
            ->update(['last_value' => $highestCustomerSequence, 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('document_number_sequences');

        foreach (['so_number', 'ref_po'] as $column) {
            if (Schema::hasColumn('delivery_orders', $column)) {
                Schema::table('delivery_orders', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }

        if (Schema::hasColumn('delivery_order_items', 'sales_order_item_id')) {
            Schema::table('delivery_order_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('sales_order_item_id');
            });
        }
        if (Schema::hasColumn('delivery_order_items', 'product_id')) {
            Schema::table('delivery_order_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('product_id');
            });
        }
        if (Schema::hasColumn('sales_order_items', 'product_id')) {
            Schema::table('sales_order_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('product_id');
            });
        }
    }
};
