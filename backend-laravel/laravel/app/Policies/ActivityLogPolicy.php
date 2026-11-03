<?php

namespace App\Policies;

use App\Models\ActivityLog;
use App\Models\User;

/**
 * Activity log bersifat append-only: tidak ada ability update/delete.
 */
class ActivityLogPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission('security.activity_logs.view');
    }

    public function view(User $actor, ActivityLog $log): bool
    {
        return $this->viewAny($actor);
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermission('security.activity_logs.view');
    }

    public function update(User $actor, ActivityLog $log): bool
    {
        return false;
    }

    public function delete(User $actor, ActivityLog $log): bool
    {
        return false;
    }
}
