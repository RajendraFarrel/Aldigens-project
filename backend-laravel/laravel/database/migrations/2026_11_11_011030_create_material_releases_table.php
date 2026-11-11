<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('material_releases', function (Blueprint $table) {
        $table->id();
        $table->string('mr_no')->unique();
        $table->string('ref_wo');
        $table->date('date');
        $table->string('pic')->nullable();
        $table->string('status')->default('Dikeluarkan');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_releases');
    }
};
