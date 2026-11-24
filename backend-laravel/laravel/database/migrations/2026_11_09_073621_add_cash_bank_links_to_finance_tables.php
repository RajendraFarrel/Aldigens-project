<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sales_receipts', function (Blueprint $table) {
            $table->unsignedBigInteger('cash_bank_id')->nullable();
            $table->unsignedBigInteger('journal_voucher_id')->nullable();
        });

        Schema::table('purchase_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('cash_bank_id')->nullable();
            $table->unsignedBigInteger('journal_voucher_id')->nullable();
        });

        // assets & capital_entries sudah punya cash_bank_id
        Schema::table('assets', function (Blueprint $table) {
            $table->unsignedBigInteger('journal_voucher_id')->nullable();
        });

        Schema::table('capital_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('journal_voucher_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('sales_receipts', fn (Blueprint $t) => $t->dropColumn(['cash_bank_id', 'journal_voucher_id']));
        Schema::table('purchase_payments', fn (Blueprint $t) => $t->dropColumn(['cash_bank_id', 'journal_voucher_id']));
        Schema::table('assets', fn (Blueprint $t) => $t->dropColumn('journal_voucher_id'));
        Schema::table('capital_entries', fn (Blueprint $t) => $t->dropColumn('journal_voucher_id'));
    }
};