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
    Schema::table('commissionings', function (Blueprint $table) {
        $table->string('do_number')->nullable()->after('project_name');
        $table->string('so_number')->nullable()->after('do_number');
        $table->string('ref_po')->nullable()->after('so_number');
    });
}

public function down()
{
    Schema::table('commissionings', function (Blueprint $table) {
        $table->dropColumn(['do_number', 'so_number', 'ref_po']);
    });
}
};
