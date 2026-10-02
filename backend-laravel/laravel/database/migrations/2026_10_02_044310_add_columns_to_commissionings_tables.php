<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commissionings', function (Blueprint $table) {
            if (!Schema::hasColumn('commissionings', 'do_number')) {
                $table->string('do_number')->nullable();
            }
            if (!Schema::hasColumn('commissionings', 'so_number')) {
                $table->string('so_number')->nullable();
            }
            if (!Schema::hasColumn('commissionings', 'ref_po')) {
                $table->string('ref_po')->nullable();
            }
            if (!Schema::hasColumn('commissionings', 'unit_model')) {
                $table->string('unit_model')->nullable();
            }
            if (!Schema::hasColumn('commissionings', 'serial_no')) {
                $table->string('serial_no')->nullable();
            }
            if (!Schema::hasColumn('commissionings', 'installation_date')) {
                $table->date('installation_date')->nullable();
            }
        });

        Schema::table('commissioning_items', function (Blueprint $table) {
            if (!Schema::hasColumn('commissioning_items', 'no')) {
                $table->string('no')->nullable();
            }
            if (!Schema::hasColumn('commissioning_items', 'physical')) {
                $table->string('physical')->nullable();
            }
            if (!Schema::hasColumn('commissioning_items', 'function')) {
                $table->string('function')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('commissionings', function (Blueprint $table) {
            $table->dropColumn(['do_number', 'so_number', 'ref_po', 'unit_model', 'serial_no', 'installation_date']);
        });

        Schema::table('commissioning_items', function (Blueprint $table) {
            $table->dropColumn(['no', 'physical', 'function']);
        });
    }
};