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
    Schema::table('quotation_items', function (Blueprint $table) {
        $table->string('internal_code')->nullable()->after('part_number');
    });
}

public function down(): void
{
    Schema::table('quotation_items', function (Blueprint $table) {
        $table->dropColumn('internal_code');
    });
}
};
