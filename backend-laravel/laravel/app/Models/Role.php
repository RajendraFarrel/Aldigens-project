<?php

namespace App\Models;

use App\Support\PermissionCatalog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    /** Nama role super administrator (nilai existing di database). */
    public const ADMIN_NAME = 'Administrator';

    protected $fillable = [
        'name',
        'description',
        'default_menus',
        'is_system',
    ];

    protected $casts = [
        'default_menus' => 'array',
        'is_system'     => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'role', 'name');
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    /** Role Administrator (ditentukan dari DB, bukan dari input frontend). */
    public function isAdministrator(): bool
    {
        return strcasecmp($this->name, self::ADMIN_NAME) === 0;
    }

    /**
     * Daftar kode permission efektif role ini.
     * Administrator selalu memegang seluruh katalog (tidak bisa terkunci).
     *
     * @return string[]
     */
    public function permissionCodes(): array
    {
        if ($this->isAdministrator()) {
            return PermissionCatalog::adminPermissions();
        }

        try {
            if (!Permission::tableReady()) {
                return PermissionCatalog::roleMapping()[$this->name] ?? [];
            }

            return $this->permissions()->pluck('name')->all();
        } catch (\Throwable $e) {
            // Jangan sampai kegagalan baca permission membuat sistem tidak bisa dipakai.
            report($e);
            return PermissionCatalog::roleMapping()[$this->name] ?? [];
        }
    }
}
