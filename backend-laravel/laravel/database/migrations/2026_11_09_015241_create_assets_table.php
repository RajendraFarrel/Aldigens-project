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
        Schema::create('assets', function (Blueprint $table) {
    $table->id();
    $table->string('code')->unique();
    $table->string('name');
    $table->enum('category', ['movable', 'immovable']);
    $table->string('type')->nullable();
    $table->date('acquisition_date');
    $table->decimal('acquisition_cost', 18, 2);
    $table->decimal('current_value', 18, 2)->nullable();
    $table->unsignedBigInteger('cash_bank_id')->nullable();
    $table->enum('status', ['active', 'sold', 'disposed'])->default('active');
    $table->text('notes')->nullable();
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
