<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

/**
 * Aturan pengelolaan akun pengguna (Privilege Escalation Guard).
 *
 * Tahap 1.1 (hardening):
 *  - Hanya Administrator yang boleh menetapkan/mengubah role pengguna lain.
 *  - Non-Administrator tidak boleh mengubah role miliknya sendiri.
 *  - Non-Administrator tidak boleh mengubah role user lain menjadi role yang
 *    lebih tinggi (semua perubahan role kini memerlukan Administrator).
 *  - Status Administrator SELALU dibaca dari database (users.role + tabel roles),
 *    tidak pernah dari input frontend (`is_admin`, `role_id`, `permissions`).
 */
class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission('security.users.view') || $actor->hasPermission('security.users.manage');
    }

    public function view(User $actor, User $target): bool
    {
        return $this->viewAny($actor);
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermission('security.users.manage');
    }

    public function update(User $actor, User $target): bool
    {
        if (!$actor->hasPermission('security.users.manage')) {
            return false;
        }

        // Administrator tidak dapat diturunkan/diubah oleh non-administrator.
        if ($target->isAdministrator() && !$actor->isAdministrator()) {
            return false;
        }

        return true;
    }

    /**
     * Mengubah role atau hak akses menu user lain.
     *
     * Role assignment kini HANYA untuk Administrator (backend sumber kebenaran),
     * dan tidak ada yang boleh mengubah role miliknya sendiri — termasuk
     * Administrator, agar tidak terjadi demosi Administrator terakhir.
     */
    public function assignRole(User $actor, User $target): bool
    {
        if (!$actor->hasPermission('security.users.manage')) {
            return false;
        }

        // Tanpa Administrator tidak ada yang boleh memindah role siapa pun.
        if (!$actor->isAdministrator()) {
            return false;
        }

        // Role milik sendiri tidak dapat diubah (mencegah demosi diri sendiri).
        if ($actor->id === $target->id) {
            return false;
        }

        return true;
    }

    /**
     * Mengubah menu_access sebuah akun.
     * Menu hanya memengaruhi navigasi; permission API tetap diatur role.
     * Pemberian menu administrasi dibatasi di UserController (butuh Administrator).
     */
    public function updateMenuAccess(User $actor, User $target): bool
    {
        if (!$actor->hasPermission('security.users.manage')) {
            return false;
        }

        // Akun Administrator hanya boleh diatur oleh Administrator.
        if ($target->isAdministrator() && !$actor->isAdministrator()) {
            return false;
        }

        return true;
    }

    public function delete(User $actor, User $target): bool
    {
        // Tidak boleh menghapus diri sendiri.
        if ($actor->id === $target->id) {
            return false;
        }

        return $this->update($actor, $target);
    }

    /** Hanya Administrator yang boleh membuat/menugaskan role Administrator. */
    public function assignAdministratorRole(User $actor): bool
    {
        return $actor->isAdministrator();
    }

    /**
     * Daftar nama role yang boleh dikelola aktor.
     * Non-Administrator: kosong (seluruh perubahan role memerlukan Administrator).
     *
     * @return string[]
     */
    public static function manageableRoleNames(User $actor): array
    {
        if (!$actor->isAdministrator()) {
            return [];
        }

        return Role::query()->orderBy('id')->pluck('name')->all();
    }
}
