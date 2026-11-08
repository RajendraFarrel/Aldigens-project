<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADDITIVE migration — Tahap 1.1 AIMS.
 *
 * Menambahkan kolom `permissions_seeded_at` pada tabel `roles` agar
 * PermissionSeeder dapat membedakan:
 *   - role yang BELUM PERNAH mendapat default mapping  -> boleh diisi default,
 *   - role yang SUDAH pernah di-seed lalu diubah/dikosongkan Administrator
 *     -> tidak boleh diisi ulang (konfigurasi Administrator dihormati).
 *
 * Mengapa di tabel `roles`, bukan pivot: penanda yang disimpan pada baris
 * role_permissions ikut terhapus saat Administrator mengosongkan mapping,
 * sehingga seeder akan mengisi ulang. Kolom di `roles` bertahan.
 *
 * Kolom ini OPSIONAL: tanpa migration ini PermissionSeeder berperilaku
 * "isi bila kosong". Migration TIDAK dijalankan otomatis dan TIDAK
 * mengubah/menghapus data — hanya menambah kolom nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('roles')) {
            return;
        }

        if (!Schema::hasColumn('roles', 'permissions_seeded_at')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->timestamp('permissions_seeded_at')->nullable()->after('is_system');
            });
        }
    }

    public function down(): void
    {
        // Sengaja konservatif: penanda seeder tidak dihapus otomatis.
        // Bila perlu rollback, lakukan manual setelah backup.
    }
};
