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
        Schema::create('capital_entries', function (Blueprint $table) {
    $table->id();
    $table->date('entry_date');
    $table->enum('type', ['initial', 'addition', 'withdrawal']);
    $table->decimal('amount', 18, 2);
    $table->unsignedBigInteger('cash_bank_id')->nullable();
    $table->string('description')->nullable();
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('capital_entries');
    }
};
