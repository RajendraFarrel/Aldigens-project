<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

/**
 * Aturan pengelolaan role & mapping permission.
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
        return $actor->hasPermission('security.roles.manage');
    }

    public function update(User $actor, Role $role): bool
    {
        if (!$actor->hasPermission('security.roles.manage')) {
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

        return $actor->hasPermission('security.roles.manage');
    }

    /**
     * Mengubah mapping role -> permission.
     * Non-administrator tidak boleh menyentuh role Administrator sama sekali.
     */
    public function managePermissions(User $actor, Role $role): bool
    {
        if (
            !$actor->hasPermission('security.permissions.manage')
            && !$actor->hasPermission('security.roles.manage')
        ) {
            return false;
        }

        if ($role->isAdministrator()) {
            return $actor->isAdministrator();
        }

        return true;
    }
}
