<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Jejak aktivitas keamanan (append-only untuk pengguna biasa).
 * Tidak pernah menyimpan password, token, atau nomor rekening lengkap.
 */
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_email',
        'activity',
        'module',
        'action',
        'reference_type',
        'reference_id',
        'result',
        'description',
        'ip_address',
        'meta',
    ];

    protected $casts = [
        'meta'       => 'array',
        'created_at' => 'datetime',
    ];

    public static function tableReady(): bool
    {
        try {
            return \Illuminate\Support\Facades\Schema::hasTable('activity_logs');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
