<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('invoices', function (Blueprint $table) {
        $table->id();
        $table->string('invoice_number')->unique();
        $table->date('date');
        $table->date('due_date');
        $table->string('do_reference')->nullable();
        $table->string('customer_name');
        $table->text('customer_address');
        $table->text('notes')->nullable();
        $table->string('status')->default('Unpaid');
        $table->decimal('sub_total', 15, 2)->default(0);
        $table->decimal('tax_percentage', 5, 2)->default(11);
        $table->decimal('tax_amount', 15, 2)->default(0);
        $table->decimal('grand_total', 15, 2)->default(0);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
