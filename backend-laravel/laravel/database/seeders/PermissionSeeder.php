<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

/**
 * Mengisi tabel permissions & role_permissions — ADDITIVE dan IDEMPOTENT.
 *
 * Aman dijalankan berulang:
 *  - permission katalog hanya di-insert/update (updateOrCreate),
 *  - mapping role HANYA diisi bila role belum mempunyai mapping sama sekali;
 *    mapping yang sudah ada (termasuk hasil pengaturan Administrator via UI)
 *    TIDAK PERNAH ditimpa/dihapus (tanpa sync() pada mapping existing),
 *  - TIDAK menghapus user, role, atau data transaksi.
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

        // 1) Isi katalog permission (idempoten: tidak pernah menghapus)
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

        // Penanda "pernah di-seed" disimpan di tabel roles agar TIDAK hilang
        // ketika Administrator mengosongkan mapping (yang menghapus baris pivot).
        $versioned = Schema::hasColumn('roles', 'permissions_seeded_at');

        // 2) Default mapping — hanya untuk role yang belum punya mapping.
        foreach (PermissionCatalog::roleMapping() as $roleName => $codes) {
            if ($this->onlyRoles !== null && !in_array($roleName, $this->onlyRoles, true)) {
                continue;
            }

            $role = Role::query()->where('name', $roleName)->first();
            if (!$role) {
                $this->command?->line("Role '{$roleName}' tidak ada di database — dilewati.");
                continue;
            }

            // Jangan sentuh konfigurasi custom: role yang sudah memiliki mapping
            // (walau hanya 1 permission) dibiarkan apa adanya.
            if ($role->permissions()->exists()) {
                $this->command?->line("Role '{$roleName}': mapping sudah ada — dibiarkan (tidak ditimpa).");
                continue;
            }

            // Dengan penanda: role yang pernah di-seed (termasuk yang kemudian
            // dikosongkan Administrator) tidak diisi ulang. Hanya role yang
            // benar-benar belum pernah punya mapping default yang diisi.
            if ($versioned && $role->hasSeededDefaultMapping()) {
                $this->command?->line("Role '{$roleName}': mapping pernah di-seed & dikosongkan Administrator — dibiarkan.");
                continue;
            }

            // Hanya menambah (tanpa menghapus) agar aman walau ada perubahan paralel.
            $ids = collect($codes)
                ->map(fn($c) => $permissionIds[$c] ?? null)
                ->filter()
                ->values()
                ->all();

            $role->permissions()->syncWithoutDetaching($ids);

            if ($versioned) {
                // Tandai role ini sudah menerima default mapping. Penanda berada
                // di tabel roles sehingga bertahan walau pivot dikosongkan.
                $role->forceFill(['permissions_seeded_at' => now()])->save();
            }

            $this->command?->line("Role '{$roleName}': default mapping diisi " . count($ids) . ' permission.');
        }
    }
}
