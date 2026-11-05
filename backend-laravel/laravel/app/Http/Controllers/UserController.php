<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\MenuCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
 *
 * Tahap 1.1 (hardening):
 *  - Perubahan role pengguna HANYA oleh Administrator; role milik sendiri tidak
 *    dapat diubah siapa pun (termasuk Administrator) untuk mencegah kehilangan
 *    Administrator terakhir.
 *  - Penghapusan/demosi selalu dihitung ulang di dalam transaksi dengan row
 *    locking, sehingga dua request bersamaan tidak dapat menghapus semua
 *    Administrator.
 *  - Menu administrasi (users/roles/permissions) hanya untuk Administrator.
 */
class UserController extends Controller
{
    /** Role super administrator (nama existing di tabel roles). */
    private const ADMIN_ROLE = Role::ADMIN_NAME;

    /** Menu yang bersifat administrasi — hanya boleh dimiliki Administrator. */
    private const ADMIN_MENUS = ['users', 'roles', 'permissions'];
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
        // key menu valid dan untuk non-admin tidak boleh berisi menu administrasi.
        $user->menu_access = $this->sanitizeMenus(
            $validated['menu_access'] ?? null,
            $roleName,
            $request->user()->isAdministrator()
        );
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

        // Validation (dilakukan di luar transaksi agar 422 tidak membuka transaction)
        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'full_name'     => 'nullable|string|max:255',
            'email'         => ["sometimes", "required", "email", Rule::unique('users', 'email')->ignore($user->id)],
            'password'      => 'nullable|string|min:6',
            'role'          => ['nullable', 'string', 'max:100', Rule::exists('roles', 'name')],
            'menu_access'   => 'nullable|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $actor = $request->user();
        $wantsRoleChange = array_key_exists('role', $validated)
            && $validated['role'] !== null
            && $validated['role'] !== $user->role;

        if ($wantsRoleChange) {
            // Hanya Administrator yang boleh menetapkan/mengubah role pengguna.
            if (!$actor->isAdministrator()) {
                return response()->json([
                    'message' => 'Hanya Administrator yang dapat mengubah role pengguna.',
                ], 403);
            }

            // Role milik sendiri tidak dapat diubah (mencegah demosi diri sendiri
            // dan hilangnya Administrator terakhir).
            if ($actor->id === $user->id) {
                return response()->json([
                    'message' => 'Anda tidak dapat mengubah role akun yang sedang digunakan.',
                ], 403);
            }

            // Gate policy (lapisan tambahan).
            if (!$actor->can('assignRole', $user)) {
                return response()->json(['message' => 'This action is unauthorized.'], 403);
            }
        }

        // Akun Administrator tidak dapat diturunkan oleh non-Administrator.
        if ($user->isAdministrator() && !$actor->isAdministrator()) {
            return response()->json([
                'message' => 'Akun Administrator hanya dapat diubah oleh Administrator.',
            ], 403);
        }

        // Menu administrasi hanya boleh diberikan Administrator.
        if (
            array_key_exists('menu_access', $validated)
            && is_array($validated['menu_access'])
            && !$actor->isAdministrator()
            && count(array_intersect($validated['menu_access'], self::ADMIN_MENUS)) > 0
        ) {
            return response()->json([
                'message' => 'Menu administrasi hanya dapat diberikan oleh Administrator.',
            ], 403);
        }

        DB::transaction(function () use ($validated, $user, $wantsRoleChange, $actor) {
            // Kunci baris target agar perubahan role/penghapusan tidak balapan.
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (!$locked) {
                abort(404);
            }

            if ($wantsRoleChange) {
                self::assertAdministratorRemains(
                    removingAdmin: $locked->isAdministrator(),
                    addingAdmin: strcasecmp($validated['role'], self::ADMIN_ROLE) === 0,
                    exceptUserId: $locked->id
                );
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
                $locked->update($data);
            }

            if ($wantsRoleChange) {
                $locked->role = $validated['role'];
            }

            if (array_key_exists('menu_access', $validated)) {
                $locked->menu_access = $this->sanitizeMenus(
                    $validated['menu_access'],
                    $locked->role,
                    $actor->isAdministrator()
                );
            }

            $locked->save();

            // Samakan instance yang dikembalikan controller.
            $user->setRawAttributes($locked->getAttributes(), true);
        });

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

        $actor = $request->user();

        // Menu administrasi hanya dapat diberikan Administrator.
        if (!$actor->isAdministrator() && count(array_intersect($validated['menu_access'], self::ADMIN_MENUS)) > 0) {
            return response()->json([
                'message' => 'Menu administrasi hanya dapat diberikan oleh Administrator.',
            ], 403);
        }

        $menus = $this->sanitizeMenus($validated['menu_access'], $user->role, $actor->isAdministrator());

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

        $email = $user->email;

        DB::transaction(function () use ($user) {
            // Kunci baris target lalu hitung ulang Administrator yang tersisa.
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (!$locked) {
                abort(404);
            }

            if ($locked->isAdministrator()) {
                self::assertAdministratorRemains(
                    removingAdmin: true,
                    addingAdmin: false,
                    exceptUserId: $locked->id
                );
            }

            $locked->delete();
        });

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
     *  - menu administrasi (users/roles/permissions) hanya untuk Administrator,
     *  - null dipertahankan sebagai "belum diatur".
     *
     * Catatan: menu_access TIDAK memberi permission API apa pun; permission tetap
     * dihitung dari role di database.
     */
    private function sanitizeMenus(?array $menus, ?string $roleName, ?bool $actorIsAdmin = null): ?array
    {
        if ($menus === null) {
            return null;
        }

        $isAdmin = $actorIsAdmin ?? (strcasecmp((string) $roleName, self::ADMIN_ROLE) === 0);

        $valid = array_values(array_unique(array_intersect($menus, self::MENU_KEYS)));

        // Key di luar katalog tetap dipertahankan agar kompatibilitas lama tidak
        // hilang, tapi hanya bila benar-benar berupa string pendek.
        foreach ($menus as $menu) {
            if (is_string($menu) && !MenuCatalog::isValid($menu) && !in_array($menu, $valid, true)) {
                $valid[] = $menu;
            }
        }

        if (!$isAdmin) {
            $valid = array_values(array_diff($valid, self::ADMIN_MENUS));
        } elseif (!in_array('users', $valid, true)) {
            $valid[] = 'users';
        }

        return $valid;
    }

    /**
     * Penjaga Administrator terakhir.
     *
     * Dipanggil DI DALAM transaksi dengan baris target terkunci. Menghitung
     * ulang Administrator lain secara langsung dari database (bukan cache/model
     * yang mungkin basi) sehingga dua request bersamaan tidak dapat sama-sama
     * menghapus/demosikan dua Administrator terakhir.
     *
     * "Aktif" = ada di tabel users dengan role Administrator (tabel users tidak
     * memiliki kolom status/nonaktif).
     */
    private static function assertAdministratorRemains(
        bool $removingAdmin,
        bool $addingAdmin,
        ?int $exceptUserId = null
    ): void {
        if (!$removingAdmin || $addingAdmin) {
            return;
        }

        $otherAdmins = User::query()
            ->where('role', self::ADMIN_ROLE)
            ->when($exceptUserId !== null, fn($q) => $q->where('id', '!=', $exceptUserId))
            ->lockForUpdate()
            ->count();

        if ($otherAdmins < 1) {
            abort(response()->json([
                'message' => 'Sistem harus memiliki minimal satu Administrator. Aksi dibatalkan.',
            ], 422));
        }
    }
}
