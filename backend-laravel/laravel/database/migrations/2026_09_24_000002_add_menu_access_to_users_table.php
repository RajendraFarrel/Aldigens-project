<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'menu_access')) {
                // Daftar key menu yang boleh diakses user (JSON array).
                // null = belum diatur (Admin default akses semua, staff pakai default).
                $table->json('menu_access')->nullable()->after('role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'menu_access')) {
                $table->dropColumn('menu_access');
            }
        });
    }
};
