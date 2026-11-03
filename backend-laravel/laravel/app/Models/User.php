<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\PermissionCatalog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Catatan keamanan (Tahap 1 AIMS):
 * `role` dan `menu_access` dipertahankan fillable agar seeder & tooling lama tetap
 * berjalan, TETAPI tidak pernah diisi langsung dari request. UserController
 * memakai whitelist field + policy; field lain (is_admin, permissions, dll)
 * diabaikan sepenuhnya.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /** @var array<int, string> */
    protected $fillable = [
        'name',
        'full_name',
        'email',
        'password',
        // Field sensitif tetap fillable di level model, TETAPI controller
        // memakai whitelist eksplisit + policy sehingga tidak bisa di-inject
        // lewat mass assignment dari request. Lihat UserController.
        'role',
        'menu_access',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'menu_access' => 'array',
    ];

    public function roleModel()
    {
        return $this->belongsTo(Role::class, 'role', 'name');
    }

    /** Role Administrator ditentukan dari tabel roles, bukan dari input frontend. */
    public function isAdministrator(): bool
    {
        return $this->role === Role::ADMIN_NAME;
    }

    /**
     * Kode permission efektif user (union semua role yang dimiliki).
     * Admin selalu mendapat seluruh katalog.
     *
     * @return string[]
     */
    public function getPermissionCodes(): array
    {
        if ($this->isAdministrator()) {
            return PermissionCatalog::adminPermissions();
        }

        try {
            $role = Role::query()->where('name', $this->role)->first();
            return $role ? $role->permissionCodes() : [];
        } catch (\Throwable $e) {
            report($e);
            return [];
        }
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->getPermissionCodes(), true);
    }

    /** True bila user memiliki SEMUA permission yang diberikan. */
    public function hasAnyPermission(array $permissions): bool
    {
        $codes = $this->getPermissionCodes();
        foreach ($permissions as $p) {
            if (in_array($p, $codes, true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Menu efektif user. Dihitung DI SERVER (sumber kebenaran) dari
     * menu_access yang tersimpan + operator penuh untuk Administrator.
     *
     * @return string[]
     */
    public function allowedMenus(): array
    {
        $all = \App\Support\MenuCatalog::keys();
        if ($this->isAdministrator()) {
            return $all;
        }

        $access = is_array($this->menu_access) ? $this->menu_access : [];
        $allowed = array_values(array_intersect($all, $access));

        // Menu lintas modul hanya tampil bila user punya permission terkait.
        $allowed = array_values(array_filter($allowed, function ($key) {
            $required = \App\Support\MenuCatalog::permissionFor($key);
            return $required === null || $this->hasPermission($required);
        }));

        return array_values(array_unique(array_merge(['dashboard'], $allowed)));
    }

    public function allowedPermissions(): array
    {
        return $this->getPermissionCodes();
    }
}
