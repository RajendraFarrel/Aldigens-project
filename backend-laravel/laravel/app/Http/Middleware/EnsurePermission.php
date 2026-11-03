<?php

namespace App\Http\Middleware;

use App\Support\PermissionCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware otorisasi API berbasis permission.
 *
 * Penggunaan di route:
 *   ->middleware('permission:inventory.products.view')
 *   ->middleware('permission:inventory.products.manage|inventory.products.view')
 *
 * Aturan:
 *  - Belum login            -> 401 (ditangani auth:sanctum)
 *  - Role tidak valid       -> 403
 *  - Permission tidak dikenal -> 403 (fail-closed)
 *  - Tidak punya permission -> 403
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        // Laravel memecah parameter middleware dengan koma, sedangkan route di
        // project ini memakai 'a|b' untuk "salah satu". Normalisasi keduanya.
        $permissions = array_values(array_filter(array_map('trim', explode('|', implode(',', $permissions)))));

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Role yang tersimpan di DB harus valid (tidak sekadar string bebas).
        $roleExists = \App\Models\Role::query()->where('name', $user->role)->exists();
        if (!$roleExists) {
            return response()->json([
                'status'       => 'error',
                'message'      => 'Role pengguna tidak valid. Hubungi Administrator.',
                'permission'   => null,
            ], 403);
        }

        // Permission yang tidak dikenal selalu ditolak (tanpa mengeksekusi aksi).
        foreach ($permissions as $permission) {
            if (!PermissionCatalog::exists($permission)) {
                return response()->json([
                    'status'     => 'error',
                    'message'    => 'Permission tidak dikenal: ' . $permission,
                    'permission' => $permission,
                ], 403);
            }
        }

        // Administrator (role tersimpan di DB) selalu memiliki seluruh permission
        // sehingga tidak mungkin terkunci, walau pivot role_permissions kosong.
        if ($user->isAdministrator()) {
            return $next($request);
        }

        if (!$user->hasAnyPermission($permissions)) {
            return response()->json([
                'status'     => 'error',
                'message'    => 'Anda tidak memiliki hak akses untuk tindakan ini.',
                'permission' => $permissions[0] ?? null,
            ], 403);
        }

        return $next($request);
    }
}
