<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Melengkapi tabel `invoices` yang sebelumnya masih berupa stub kosong.
     * Invoice menarik rincian harga dari Sales Order (SO) dan bukti
     * pengiriman riil dari Delivery Order (DO).
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'sales_order_id')) {
                $table->foreignId('sales_order_id')->nullable()->after('id')
                    ->constrained('sales_orders')->nullOnDelete();
            }
            if (!Schema::hasColumn('invoices', 'delivery_order_id')) {
                $table->foreignId('delivery_order_id')->nullable()->after('sales_order_id')
                    ->constrained('delivery_orders')->nullOnDelete();
            }
            if (!Schema::hasColumn('invoices', 'invoice_number')) {
                $table->string('invoice_number')->unique()->after('delivery_order_id');
            }
            if (!Schema::hasColumn('invoices', 'invoice_date')) {
                $table->date('invoice_date')->after('invoice_number');
            }
            if (!Schema::hasColumn('invoices', 'due_date')) {
                $table->date('due_date')->nullable()->after('invoice_date');
            }
            if (!Schema::hasColumn('invoices', 'customer_name')) {
                $table->string('customer_name')->after('due_date');
            }
            if (!Schema::hasColumn('invoices', 'customer_address')) {
                $table->text('customer_address')->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('invoices', 'do_number')) {
                $table->string('do_number')->nullable()->after('customer_address');
            }
            if (!Schema::hasColumn('invoices', 'so_number')) {
                $table->string('so_number')->nullable()->after('do_number');
            }
            if (!Schema::hasColumn('invoices', 'sub_total')) {
                $table->decimal('sub_total', 15, 2)->default(0)->after('so_number');
            }
            if (!Schema::hasColumn('invoices', 'tax_percentage')) {
                $table->decimal('tax_percentage', 5, 2)->default(0)->after('sub_total');
            }
            if (!Schema::hasColumn('invoices', 'tax_amount')) {
                $table->decimal('tax_amount', 15, 2)->default(0)->after('tax_percentage');
            }
            if (!Schema::hasColumn('invoices', 'grand_total')) {
                $table->decimal('grand_total', 15, 2)->default(0)->after('tax_amount');
            }
            if (!Schema::hasColumn('invoices', 'status')) {
                $table->string('status')->default('Unpaid')->after('grand_total'); // Unpaid, Paid, Cancelled
            }
            if (!Schema::hasColumn('invoices', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
        });

        // Tabel item invoice (rincian tagihan)
        if (!Schema::hasTable('invoice_items')) {
            Schema::create('invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
                $table->string('part_number')->nullable();
                $table->text('description');
                $table->integer('qty');
                $table->string('unit')->default('SET');
                $table->decimal('unit_price', 15, 2)->default(0);
                $table->decimal('amount', 15, 2)->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');

        Schema::table('invoices', function (Blueprint $table) {
            foreach ([
                'sales_order_id', 'delivery_order_id', 'invoice_number', 'invoice_date',
                'due_date', 'customer_name', 'customer_address', 'do_number', 'so_number',
                'sub_total', 'tax_percentage', 'tax_amount', 'grand_total', 'status', 'notes',
            ] as $column) {
                if (Schema::hasColumn('invoices', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
