<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\PermissionCatalog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Pengelolaan role & mapping permission — khusus pemegang
 * security.roles.manage / security.permissions.manage.
 */
class RoleController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::withCount('users')->orderBy('id')->get()->map(function (Role $role) {
            $role->permissions = $role->permissionCodes();
            return $role;
        });

        return response()->json(['data' => $roles]);
    }

    public function permissions()
    {
        $this->authorize('viewPermissions', Role::class);

        return response()->json([
            'data' => collect(PermissionCatalog::all())
                ->map(fn($description, $name) => [
                    'name'        => $name,
                    'module'      => explode('.', $name)[0],
                    'action'      => explode('.', $name)[1] ?? null,
                    'description' => $description,
                ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Role::class);

        $validated = $request->validate([
            'name'            => 'required|string|max:100|unique:roles,name',
            'description'     => 'nullable|string|max:255',
            'default_menus'   => 'nullable|array',
            'default_menus.*' => 'string',
            'permissions'     => 'nullable|array',
            'permissions.*'   => 'string',
        ]);

        // Hanya Administrator yang boleh membuat role baru bernama Administrator.
        if (strcasecmp(trim($validated['name']), Role::ADMIN_NAME) === 0 && !$request->user()->isAdministrator()) {
            return response()->json(['message' => 'Anda tidak berhak membuat role Administrator.'], 403);
        }

        $unknown = $this->unknownPermissions($validated['permissions'] ?? []);
        if ($unknown) {
            return response()->json([
                'message'     => 'Permission tidak dikenal ditolak.',
                'permissions' => $unknown,
            ], 422);
        }

        $role = Role::create([
            'name'          => trim($validated['name']),
            'description'   => $validated['description'] ?? null,
            'default_menus' => $validated['default_menus'] ?? null,
            'is_system'     => false,
        ]);

        if (array_key_exists('permissions', $validated) && $request->user()->isAdministrator()) {
            $this->syncPermissions($role, $validated['permissions'] ?? []);
        }

        AuditLogService::record(
            $request,
            'security.roles.manage',
            'security',
            'success',
            "Membuat role {$role->name}",
            'role',
            $role->id,
            ['permissions' => $validated['permissions'] ?? []]
        );

        return response()->json([
            'data'    => $role->fresh()->load('permissions'),
            'message' => "Role '{$role->name}' berhasil dibuat."
        ], 201);
    }

    public function update(Request $request, Role $role)
    {
        $this->authorize('update', $role);

        $validated = $request->validate([
            'name'            => ["required", "string", "max:100", Rule::unique('roles', 'name')->ignore($role->id)],
            'description'     => 'nullable|string|max:255',
            'default_menus'   => 'nullable|array',
            'default_menus.*' => 'string',
            'permissions'     => 'nullable|array',
            'permissions.*'   => 'string',
        ]);

        $oldName = $role->name;
        $newName = trim($validated['name']);

        // Cegah pengubahan nama Administrator jika role sistem
        if ($role->isAdministrator() && $newName !== Role::ADMIN_NAME) {
            return response()->json([
                'message' => 'Nama role sistem Administrator tidak dapat diubah.'
            ], 422);
        }

        $unknown = $this->unknownPermissions($validated['permissions'] ?? []);
        if ($unknown) {
            return response()->json([
                'message'     => 'Permission tidak dikenal ditolak.',
                'permissions' => $unknown,
            ], 422);
        }

        $role->update([
            'name'          => $newName,
            'description'   => $validated['description'] ?? null,
            'default_menus' => $validated['default_menus'] ?? null,
        ]);

        // Sinkronkan nama role pada tabel users (perilaku existing dipertahankan).
        if ($oldName !== $newName) {
            User::where('role', $oldName)->update(['role' => $newName]);
        }

        // Perubahan permission pada update role juga hanya untuk Administrator.
        if (
            array_key_exists('permissions', $validated)
            && !$role->isAdministrator()
            && $request->user()->isAdministrator()
        ) {
            $this->applyPermissions($request, $role, $validated['permissions'] ?? []);
        }

        AuditLogService::record(
            $request,
            'security.roles.manage',
            'security',
            'success',
            "Memperbarui role {$role->name}",
            'role',
            $role->id
        );

        return response()->json([
            'data'    => $role->fresh()->load('permissions'),
            'message' => 'Role berhasil diperbarui.'
        ]);
    }

    /**
     * Simpan mapping role -> permission.
     */
    public function syncRolePermissions(Request $request, Role $role)
    {
        $this->authorize('managePermissions', $role);

        // Lapisan kedua (defense-in-depth): hanya Administrator yang boleh
        // mengubah pemetaan permission. Policy sudah menolak, pemeriksaan ini
        // menjaga kontrak tetap benar walau policy berubah di masa depan.
        if (!$request->user()->isAdministrator()) {
            return response()->json([
                'message' => 'Hanya Administrator yang dapat mengubah pemetaan permission role.',
            ], 403);
        }

        $validated = $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => 'string',
        ]);

        $unknown = $this->unknownPermissions($validated['permissions']);
        if ($unknown) {
            return response()->json([
                'message'     => 'Permission tidak dikenal ditolak.',
                'permissions' => $unknown,
            ], 422);
        }

        if ($role->isAdministrator()) {
            // Administrator selalu memegang seluruh permission; mapping tidak
            // dapat dikurangi agar sistem tidak terkunci.
            return response()->json([
                'data'    => $role->fresh()->load('permissions'),
                'message' => 'Role Administrator selalu memiliki seluruh permission.',
            ]);
        }

        $this->applyPermissions($request, $role, $validated['permissions']);

        return response()->json([
            'data'    => $role->fresh()->load('permissions'),
            'message' => 'Permission role berhasil diperbarui.'
        ]);
    }

    public function destroy(Request $request, Role $role)
    {
        $this->authorize('delete', $role);

        if ($role->is_system || $role->isAdministrator() || $role->name === 'Staff Gudang') {
            return response()->json([
                'message' => "Role sistem '{$role->name}' tidak dapat dihapus."
            ], 422);
        }

        $userCount = User::where('role', $role->name)->count();
        if ($userCount > 0) {
            return response()->json([
                'message' => "Role '{$role->name}' sedang digunakan oleh {$userCount} pengguna dan tidak dapat dihapus."
            ], 422);
        }

        $name = $role->name;
        $role->delete();

        AuditLogService::record(
            $request,
            'security.roles.manage',
            'security',
            'success',
            "Menghapus role {$name}",
            'role',
            $role->id
        );

        return response()->json([
            'message' => "Role '{$name}' berhasil dihapus."
        ]);
    }

    /** @return string[] permission yang tidak dikenal katalog */
    private function unknownPermissions(array $permissions): array
    {
        return array_values(array_filter(
            array_map('strval', $permissions),
            fn($name) => !PermissionCatalog::exists($name)
        ));
    }

    /** Sinkronkan pivot role_permissions (tanpa menyentuh tabel users). */
    private function applyPermissions(Request $request, Role $role, array $permissions): void
    {
        if (!Permission::tableReady()) {
            return;
        }

        $ids = Permission::query()
            ->whereIn('name', array_values(array_unique(array_map('strval', $permissions))))
            ->pluck('id')
            ->all();

        $role->permissions()->sync($ids);

        AuditLogService::record(
            $request,
            'security.permissions.manage',
            'security',
            'success',
            "Mengubah permission role {$role->name}",
            'role',
            $role->id,
            ['permissions' => $permissions]
        );
    }

    private function syncPermissions(Role $role, array $permissions): void
    {
        if (!Permission::tableReady()) {
            return;
        }

        $ids = Permission::query()
            ->whereIn('name', array_values(array_unique(array_map('strval', $permissions))))
            ->pluck('id')
            ->all();

        $role->permissions()->sync($ids);
    }
}
