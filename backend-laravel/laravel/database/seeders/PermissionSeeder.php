<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;

/**
 * Mengisi tabel permissions & role_permissions — ADDITIVE dan IDEMPOTENT.
 *
 * Aman dijalankan berulang: hanya insert/update baris permission & pivot.
 * TIDAK menghapus user, role, atau data transaksi.
 *
 * Role yang tidak ada di database DILEWATI (tidak ada role baru otomatis).
 *
 * Jalankan manual setelah migration:
 *   php artisan db:seed --class=PermissionSeeder
 */
class PermissionSeeder extends Seeder
{
    /** @var string[]|null Batasi ke role tertentu (dipakai helper test). */
    public ?array $onlyRoles = null;

    public function run(): void
    {
        if (!Permission::tableReady()) {
            $this->command?->warn('Tabel permissions belum ada. Jalankan migration terlebih dahulu.');
            return;
        }

        // 1) Isi katalog permission
        foreach (PermissionCatalog::all() as $name => $description) {
            $parts = explode('.', $name);
            Permission::updateOrCreate(
                ['name' => $name],
                [
                    'module'      => $parts[0] ?? null,
                    'action'      => $parts[1] ?? null,
                    'description' => $description,
                ]
            );
        }

        $permissionIds = Permission::query()->pluck('id', 'name');

        // 2) Mapping role -> permission (hanya role yang benar-benar ada)
        foreach (PermissionCatalog::roleMapping() as $roleName => $codes) {
            if ($this->onlyRoles !== null && !in_array($roleName, $this->onlyRoles, true)) {
                continue;
            }

            $role = Role::query()->where('name', $roleName)->first();
            if (!$role) {
                $this->command?->line("Role '{$roleName}' tidak ada di database — dilewati.");
                continue;
            }

            $ids = collect($codes)->map(fn($c) => $permissionIds[$c] ?? null)->filter()->values()->all();
            $role->permissions()->sync($ids);

            $this->command?->line("Role '{$roleName}': " . count($ids) . ' permission.');
        }
    }
}
