<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\MenuCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Pengelolaan pengguna — khusus pemegang security.users.manage.
 *
 * Pengamanan Tahap 1:
 *  - Hanya field whitelist yang bisa diubah (role_id / is_admin / permissions
 *    diabaikan walau dikirim dari frontend).
 *  - Role divalidasi terhadap tabel roles.
 *  - Non-administrator tidak dapat menugaskan role Administrator, mengubah
 *    akun Administrator, atau memberikan menu "users".
 */
class UserController extends Controller
{
    /** Daftar key menu yang valid (sinkron dengan config/menus.js di frontend). */
    private const MENU_KEYS = [
        'dashboard',
        // Pembelian
        'purchases-menu',
        'purchase-requisition',
        'purchase-order',
        'receive-item',
        'purchase-invoice',
        'purchase-return',
        'purchase-payment',
        // Penjualan
        'sales-menu',
        'quotation',
        'sales-order',
        'delivery-order',
        'invoice',
        'sales-return',
        'sales-receipt',
        // Manufaktur
        'manufactures-menu',
        'bill-of-materials',
        'work-order',
        'material-release',
        'production',
        'product-result',
        // Inventory
        'inventory-menu',
        'inventory-products',
        'inventory-warehouses',
        'inventory-receive',
        'inventory-issue',
        'inventory-transfer',
        'inventory-opname',
        'inventory-scan',
        'inventory-transactions',
        'inventory-reports',
        'commissioning',
        // Master Data
        'master-data-menu',
        'master-customers',
        'master-suppliers',
        // Network & Security
        'network-security-menu',
        'network-monitoring',
        'security-status',
        'activity-log',
        // Pengaturan
        'users',
    ];

    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $users = User::orderBy('id')->get([
            'id',
            'name',
            'full_name',
            'email',
            'role',
            'menu_access',
            'created_at',
        ]);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'full_name'     => 'nullable|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'role'          => ['nullable', 'string', 'max:100', Rule::exists('roles', 'name')],
            'menu_access'   => 'nullable|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $roleName = $validated['role'] ?? 'Staff Gudang';

        // Hanya Administrator yang boleh membuat akun Administrator.
        if (strcasecmp($roleName, Role::ADMIN_NAME) === 0 && !$request->user()->isAdministrator()) {
            return response()->json([
                'message' => 'Anda tidak berhak menetapkan role Administrator.',
            ], 403);
        }

        $payload = [
            'name'      => $validated['name'],
            'full_name' => $validated['full_name'] ?? null,
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'role'      => $roleName,
        ];

        $user = new User();
        $user->fill($payload);

        // menu_access = null berarti "default role". Daftar yang dikirim hanya
        // key menu valid dan untuk non-admin tidak boleh berisi 'users'.
        $user->menu_access = $this->sanitizeMenus($validated['menu_access'] ?? null, $roleName);
        $user->save();

        AuditLogService::record(
            $request,
            'security.users.manage',
            'security',
            'success',
            "Membuat pengguna {$user->email} dengan role {$roleName}",
            'user',
            $user->id
        );

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'User berhasil ditambahkan.'
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'full_name'     => 'nullable|string|max:255',
            'email'         => ["sometimes", "required", "email", Rule::unique('users', 'email')->ignore($user->id)],
            'password'      => 'nullable|string|min:6',
            'role'          => ['nullable', 'string', 'max:100', Rule::exists('roles', 'name')],
            'menu_access'   => 'nullable|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $newRole = $validated['role'] ?? $user->role;

        // Perubahan role hanya oleh pemegang security.users.manage (sudah dicek
        // policy) dan role Administrator hanya oleh Administrator.
        if (
            array_key_exists('role', $validated) && strcasecmp($newRole, Role::ADMIN_NAME) === 0
            && !$request->user()->isAdministrator()
        ) {
            return response()->json([
                'message' => 'Anda tidak berhak menetapkan role Administrator.',
            ], 403);
        }

        // Akun Administrator tidak dapat diturunkan oleh non-Administrator.
        if ($user->isAdministrator() && !$request->user()->isAdministrator()) {
            return response()->json([
                'message' => 'Akun Administrator hanya dapat diubah oleh Administrator.',
            ], 403);
        }

        $data = [];
        foreach (['name', 'full_name', 'email'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }
        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        if ($data) {
            $user->update($data);
        }

        if (array_key_exists('role', $validated) && $validated['role'] !== null) {
            $user->role = $newRole;
        }

        if (array_key_exists('menu_access', $validated)) {
            $user->menu_access = $this->sanitizeMenus($validated['menu_access'], $user->role);
        }

        $user->save();

        AuditLogService::record(
            $request,
            'security.users.manage',
            'security',
            'success',
            "Memperbarui pengguna {$user->email}",
            'user',
            $user->id,
            ['role' => $user->role]
        );

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'User berhasil diperbarui.'
        ]);
    }

    /**
     * Simpan khusus hak akses menu seorang user.
     */
    public function updateMenuAccess(Request $request, User $user)
    {
        $this->authorize('updateMenuAccess', $user);

        $validated = $request->validate([
            'menu_access'   => 'present|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $menus = $this->sanitizeMenus($validated['menu_access'], $user->role);

        $user->menu_access = $menus;
        $user->save();

        AuditLogService::record(
            $request,
            'security.users.manage',
            'security',
            'success',
            "Mengubah hak akses menu pengguna {$user->email}",
            'user',
            $user->id,
            ['menu_count' => is_array($menus) ? count($menus) : 0]
        );

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'Hak akses menu berhasil diperbarui.'
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorize('delete', $user);

        // Cegah hapus diri sendiri
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Tidak dapat menghapus akun yang sedang digunakan.'], 403);
        }

        // Akun Administrator terakhir tidak boleh dihapus.
        if ($user->isAdministrator() && User::where('role', Role::ADMIN_NAME)->count() <= 1) {
            return response()->json(['message' => 'Akun Administrator terakhir tidak dapat dihapus.'], 422);
        }

        $email = $user->email;
        $user->delete();

        AuditLogService::record(
            $request,
            'security.users.manage',
            'security',
            'success',
            "Menghapus pengguna {$email}",
            'user',
            $user->id
        );

        return response()->json(['message' => 'User berhasil dihapus.']);
    }

    public function permissions()
    {
        $this->authorize('viewAny', User::class);

        return response()->json([
            'data' => collect(\App\Support\PermissionCatalog::all())
                ->map(fn($description, $name) => [
                    'name'        => $name,
                    'module'      => explode('.', $name)[0],
                    'description' => $description,
                ])->values(),
        ]);
    }

    /**
     * Normalisasi menu_access:
     *  - hanya key menu yang dikenal sistem,
     *  - unik,
     *  - menu 'users' hanya untuk Administrator,
     *  - null dipertahankan sebagai "belum diatur".
     */
    private function sanitizeMenus(?array $menus, ?string $roleName): ?array
    {
        if ($menus === null) {
            return null;
        }

        $valid = array_values(array_unique(array_intersect($menus, self::MENU_KEYS)));

        // Key di luar katalog tetap dipertahankan agar kompatibilitas lama tidak
        // hilang, tapi hanya bila benar-benar berupa string pendek.
        foreach ($menus as $menu) {
            if (is_string($menu) && !MenuCatalog::isValid($menu) && !in_array($menu, $valid, true)) {
                $valid[] = $menu;
            }
        }

        if (strcasecmp((string) $roleName, Role::ADMIN_NAME) !== 0) {
            $valid = array_values(array_diff($valid, ['users']));
        } elseif (!in_array('users', $valid, true)) {
            $valid[] = 'users';
        }

        return $valid;
    }
}
