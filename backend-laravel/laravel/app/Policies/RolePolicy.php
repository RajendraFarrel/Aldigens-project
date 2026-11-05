<?php

namespace App\Policies;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

/**
 * Aturan pengelolaan role & mapping permission.
 *
 * Tahap 1.1 (hardening):
 *  - Hanya System Administrator yang boleh mengubah pemetaan permission role.
 *  - `security.roles.manage` / `security.permissions.manage` saja TIDAK cukup,
 *    karena permission tersebut dapat dimiliki role turunan (mis. "Security Admin")
 *    yang dengan sendirinya bisa memberi seluruh katalog ke role miliknya
 *    (privilege escalation).
 *  - Status Administrator SELALU dibaca dari database (role milik user + baris
 *    tabel roles), tidak pernah dari input frontend (`is_admin`, `role_id`, dst).
 *  - View tetap boleh dipakai pemegang security.roles.view/manage.
 */
class RolePolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission('security.roles.view') || $actor->hasPermission('security.roles.manage');
    }

    public function view(User $actor, Role $role): bool
    {
        return $this->viewAny($actor);
    }

    public function create(User $actor): bool
    {
        return $this->managesRoles($actor);
    }

    public function update(User $actor, Role $role): bool
    {
        if (!$this->managesRoles($actor)) {
            return false;
        }

        // Role sistem Administrator hanya boleh diubah Administrator.
        if ($role->isAdministrator() && !$actor->isAdministrator()) {
            return false;
        }

        return true;
    }

    public function delete(User $actor, Role $role): bool
    {
        if ($role->is_system || $role->isAdministrator()) {
            return false;
        }

        return $this->managesRoles($actor);
    }

    /**
     * Mengubah mapping role -> permission.
     *
     * HANYA Administrator (role tersimpan di DB). Pemegang
     * security.roles.manage / security.permissions.manage tanpa role
     * Administrator tetap ditolak — inilah penutup celah privilege escalation.
     */
    public function managePermissions(User $actor, Role $role): bool
    {
        if (!$actor->isAdministrator()) {
            return false;
        }

        // Administrator tetap harus memegang permission pengelolaan (dijaga
        // konsisten oleh AdminUserSeeder/PermissionCatalog::adminPermissions()).
        if (
            !$actor->hasPermission('security.permissions.manage')
            && !$actor->hasPermission('security.roles.manage')
        ) {
            return false;
        }

        return true;
    }

    /**
     * Melihat daftar permission katalog (dipakai endpoint /permissions).
     * Read-only, tidak memberi kemampuan mengubah apa pun.
     */
    public function viewPermissions(User $actor): bool
    {
        return $actor->hasPermission('security.roles.view')
            || $actor->hasPermission('security.roles.manage')
            || $actor->hasPermission('security.permissions.manage');
    }

    /** Pengelolaan role pada level administratif: hanya Administrator. */
    private function managesRoles(User $actor): bool
    {
        return $actor->isAdministrator() && $actor->hasPermission('security.roles.manage');
    }

    /** True bila tabel permissions sudah tersedia (dipakai untuk pesan/diagnostik). */
    public static function permissionsTableReady(): bool
    {
        return Permission::tableReady();
    }
}
