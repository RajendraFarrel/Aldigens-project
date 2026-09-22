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
        Schema::create('sales_orders', function (Blueprint $table) {
    $table->id();
    $table->foreignId('purchase_order_id')->nullable()->constrained()->cascadeOnDelete(); // Tambahkan ini agar nyambung ke PO
    $table->unsignedBigInteger('quotation_id')->nullable();

    $table->string('so_number')->unique();         
    $table->string('client_po_number');            
    $table->date('so_date');                         
    $table->string('customer_name');               
    $table->text('customer_address')->nullable();  
    $table->string('model_unit')->nullable();      

    $table->string('status')->default('Pending');  

    $table->decimal('sub_total', 15, 2)->default(0);
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
        Schema::dropIfExists('sales_orders');
    }
};
