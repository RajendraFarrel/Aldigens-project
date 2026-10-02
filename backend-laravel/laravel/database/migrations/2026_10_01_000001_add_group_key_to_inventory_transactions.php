<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_transactions', 'group_key')) {
                $table->string('group_key', 50)->nullable()->after('id')->index();
            }
            if (!Schema::hasColumn('inventory_transactions', 'transfer_direction')) {
                $table->string('transfer_direction', 10)->nullable()->after('transaction_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropColumn(['group_key', 'transfer_direction']);
        });
    }
};