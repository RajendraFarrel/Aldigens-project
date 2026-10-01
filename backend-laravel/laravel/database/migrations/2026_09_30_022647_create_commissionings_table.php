<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissionings', function (Blueprint $table) {
            $table->id();
            $table->string('commissioning_code')->unique(); // Contoh: COM-2026-001
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('project_name')->nullable();
            $table->date('commissioning_date');
            $table->string('technician_name'); // Nama teknisi yang bertugas
            $table->enum('status', ['DRAFT', 'PROSES_PENGUJIAN', 'SELESAI_LOLOS', 'REVISI'])->default('DRAFT');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissionings');
    }
};