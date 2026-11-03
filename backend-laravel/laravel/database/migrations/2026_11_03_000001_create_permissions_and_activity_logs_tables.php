<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADDITIVE migration — Tahap 1 AIMS (Permission, Role-Permission, Audit Log).
 *
 * Tidak mengubah/menghapus tabel users, roles, atau tabel transaksi apa pun.
 * Hanya membuat 3 tabel baru:
 *   - permissions          : daftar permission granular (kode, modul, aksi).
 *   - role_permissions     : pivot role -> permission.
 *   - activity_logs        : jejak aktivitas penting (append-only untuk non-admin).
 *
 * Catatan: migration ini TIDAK dijalankan otomatis. Jalankan manual
 * setelah backup database:  php artisan migrate --path=database/migrations/<file ini>
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120)->unique();   // mis. accounting.journal.post
                $table->string('module', 50)->index();   // accounting | inventory | master | operational | security
                $table->string('action', 50);            // view | create | update | post | reverse | ...
                $table->string('description')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('role_permissions')) {
            Schema::create('role_permissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('role_id');
                $table->unsignedBigInteger('permission_id');
                $table->timestamps();

                $table->unique(['role_id', 'permission_id']);
                $table->index('permission_id');
                // ON DELETE CASCADE aman: hanya menghapus baris pivot milik role/permission
                // yang dihapus, bukan data pengguna.
                $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
                $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            });
        }

        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('user_email')->nullable();
                $table->string('activity', 120)->index();     // permission code / jenis aksi
                $table->string('module', 50)->nullable()->index();
                $table->string('action', 50)->nullable();
                $table->string('reference_type', 100)->nullable();
                $table->string('reference_id', 100)->nullable();
                $table->string('result', 20)->default('success'); // success | failed
                $table->string('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->json('meta')->nullable();
                $table->timestamp('created_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        // Sengaja konservatif: tidak menghapus data audit/permission secara otomatis.
        // Bila perlu rollback, lakukan manual setelah backup.
    }
};
