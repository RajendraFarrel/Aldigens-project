<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Policies\ActivityLogPolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class        => UserPolicy::class,
        Role::class        => RolePolicy::class,
        ActivityLog::class => ActivityLogPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        // Gate generik: @can('permission.code') / $user->can('permission.code')
        Gate::define('permission', function (User $user, string $permission) {
            return $user->hasPermission($permission);
        });

        // Gate "admin" untuk fungsi administrasi sistem.
        Gate::define('admin', function (User $user) {
            return $user->isAdministrator();
        });

        // Super admin bypass hanya untuk role Administrator yang ada di DB.
        Gate::before(function (User $user, string $ability) {
            return $user->isAdministrator() ? true : null;
        });
    }
}
