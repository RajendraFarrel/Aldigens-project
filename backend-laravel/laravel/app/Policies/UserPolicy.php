<?php

namespace App\Policies;

use App\Models\User;

/**
 * Aturan pengelolaan akun pengguna (Privilege Escalation Guard).
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

    /** Mengubah role atau hak akses menu user lain. */
    public function assignRole(User $actor, User $target): bool
    {
        return $this->update($actor, $target);
    }

    public function updateMenuAccess(User $actor, User $target): bool
    {
        return $actor->hasPermission('security.users.manage');
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
}
