<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Pencatat aktivitas keamanan.
 *
 * Desain: pencatatan TIDAK PERNAH menggagalkan aksi bisnis. Bila tabel
 * activity_logs belum dimigrasi atau terjadi error, kegagalan hanya
 * dilaporkan ke log aplikasi.
 *
 * Data yang TIDAK pernah dicatat: password, token, nomor rekening lengkap.
 */
class AuditLogService
{
    /** Kunci yang disensor bila muncul di payload meta. */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'token',
        'access_token',
        'remember_token',
        'secret',
        'account_number',
        'nomor_rekening',
        'rekening',
        'no_rekening',
        'card_number',
    ];

    /**
     * @param Request|null $request Request asal (untuk user & IP)
     * @param string       $activity kode permission / jenis aksi
     */
    public static function record(
        ?Request $request,
        string $activity,
        ?string $module = null,
        string $result = 'success',
        ?string $description = null,
        ?string $referenceType = null,
        $referenceId = null,
        array $meta = []
    ): void {
        try {
            if (!ActivityLog::tableReady()) {
                return;
            }

            $user = $request ? $request->user() : null;

            ActivityLog::create([
                'user_id'        => $user?->id,
                'user_email'     => $user?->email,
                'activity'       => $activity,
                'module'         => $module ?? self::moduleOf($activity),
                'action'         => self::actionOf($activity),
                'reference_type' => $referenceType,
                'reference_id'   => $referenceId !== null ? (string) $referenceId : null,
                'result'         => $result,
                'description'    => $description,
                'ip_address'     => $request?->ip(),
                'meta'           => self::sanitize($meta) ?: null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log gagal ditulis: ' . $e->getMessage());
        }
    }

    public static function moduleOf(string $activity): ?string
    {
        $parts = explode('.', $activity);
        return $parts[0] ?? null;
    }

    public static function actionOf(string $activity): ?string
    {
        $parts = explode('.', $activity);
        return count($parts) > 1 ? end($parts) : null;
    }

    /** Hapus data sensitif dari meta sebelum disimpan. */
    public static function sanitize(array $meta): array
    {
        $clean = [];
        foreach ($meta as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), self::SENSITIVE_KEYS, true)) {
                $clean[$key] = '[REDACTED]';
                continue;
            }
            $clean[$key] = is_array($value) ? self::sanitize($value) : $value;
        }
        return $clean;
    }
}
