<?php

namespace App\Models;

use App\Support\PermissionCatalog;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['name', 'module', 'action', 'description'];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }

    /** Apakah tabel permissions sudah ada? (fallback ke katalog bila belum dimigrasi) */
    public static function tableReady(): bool
    {
        try {
            return \Illuminate\Support\Facades\Schema::hasTable('permissions');
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Daftar kode permission aktif. Menggabungkan katalog kode dengan isi tabel
     * (agar permission custom di DB tetap terpakai).
     *
     * @return string[]
     */
    public static function allCodes(): array
    {
        $codes = PermissionCatalog::codes();

        if (self::tableReady()) {
            $codes = array_values(array_unique(array_merge($codes, self::query()->pluck('name')->all())));
        }

        sort($codes);

        return $codes;
    }
}
