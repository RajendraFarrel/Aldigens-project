<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sales_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('form_no')->unique(); // Nomor struk/penerimaan
            $table->date('payment_date');
            $table->string('bill_to_no')->nullable(); // ID/Nomor Pelanggan
            $table->string('name'); // Nama Pelanggan
            $table->string('cheque_no')->nullable(); // Nomor Cek/Giro
            $table->date('cheque_date')->nullable(); // Tanggal Cek/Giro
            $table->decimal('amount', 15, 2)->default(0);
            $table->boolean('reconciled')->default(false); // Status verifikasi bank
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('sales_receipts');
    }
};
