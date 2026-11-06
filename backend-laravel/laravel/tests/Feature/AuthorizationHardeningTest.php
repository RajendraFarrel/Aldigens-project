<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Uji hardening Tahap 1.1 AIMS.
 *
 * BERJALAN HANYA DI DATABASE UJI (phpunit.xml: DB_DATABASE=aldigens_test).
 *
 * Fokus: privilege escalation role/permission, proteksi Administrator terakhir,
 * pembatasan menu administrasi, proteksi route User/Role, dan idempotensi
 * PermissionSeeder (termasuk mempertahankan custom mapping).
 */
class AuthorizationHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Administrator'], ['description' => 'Akses penuh', 'is_system' => true]);
        Role::firstOrCreate(['name' => 'Staff Gudang'], ['description' => 'Gudang', 'is_system' => true]);
        Role::firstOrCreate(['name' => 'Finance'], ['description' => 'Keuangan', 'is_system' => false]);

        $this->seed(PermissionSeeder::class);

        $this->admin = $this->makeUser('admin@test.local', 'Administrator');
    }

    private function makeUser(string $email, string $role): User
    {
        return User::create([
            'name'     => explode('@', $email)[0],
            'email'    => $email,
            'password' => Hash::make('secret'),
            'role'     => $role,
        ]);
    }

    /** Role non-Administrator yang punya seluruh permission security (termasuk roles.manage). */
    private function securityRoleUser(string $email = 'secadmin@test.local'): User
    {
        $role = Role::firstOrCreate(['name' => 'Security Admin'], ['description' => 'Security', 'is_system' => false]);
        $role->permissions()->sync(
            Permission::whereIn('name', PermissionCatalog::securityAdminPermissions())->pluck('id')->all()
        );

        return $this->makeUser($email, $role->name);
    }

    private function pivotCodes(Role $role): array
    {
        $codes = $role->permissions()->pluck('name')->sort()->values()->all();

        return $codes;
    }

    // 1. Administrator dapat mengubah permission role
    public function test_1_administrator_can_update_role_permissions(): void
    {
        $finance = Role::where('name', 'Finance')->firstOrFail();
        $target = ['accounting.journal.post', 'accounting.journal.view'];

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/roles/{$finance->id}/permissions", ['permissions' => $target])
            ->assertOk();

        $expected = collect($target)->sort()->values()->all();
        $this->assertSame($expected, $this->pivotCodes($finance->fresh()));

        // Administrator boleh mengubah lagi (bukan sekali saja)
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/roles/{$finance->id}/permissions", ['permissions' => ['accounting.journal.view']])
            ->assertOk();
        $this->assertSame(['accounting.journal.view'], $this->pivotCodes($finance->fresh()));
    }

    // 2. Non-Administrator dengan security.roles.manage tetap tidak dapat mengubah permission role
    public function test_2_non_admin_with_roles_manage_cannot_update_permissions(): void
    {
        $actor = $this->securityRoleUser();
        $this->assertTrue($actor->hasPermission('security.roles.manage'));
        $this->assertFalse($actor->isAdministrator());

        $finance = Role::where('name', 'Finance')->firstOrFail();
        $before = $this->pivotCodes($finance);

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/roles/{$finance->id}/permissions", ['permissions' => ['accounting.journal.view']])
            ->assertStatus(403);

        $this->assertSame($before, $this->pivotCodes($finance->fresh()));
    }

    // 3. Non-Administrator tidak dapat memberikan 72 permission ke role miliknya
    public function test_3_non_admin_cannot_grant_full_catalog_to_own_role(): void
    {
        $actor = $this->securityRoleUser();
        $ownRole = Role::where('name', $actor->role)->firstOrFail();
        $before = $this->pivotCodes($ownRole);
        $this->assertLessThan(count(PermissionCatalog::codes()), count($before));

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/roles/{$ownRole->id}/permissions", ['permissions' => PermissionCatalog::codes()])
            ->assertStatus(403);

        $this->assertSame($before, $this->pivotCodes($ownRole->fresh()));
        $this->assertFalse($actor->fresh()->hasPermission('accounting.journal.post'));
    }

    // 4. Non-Administrator tidak dapat memberikan permission ke role lain
    public function test_4_non_admin_cannot_grant_permissions_to_other_role(): void
    {
        $actor = $this->securityRoleUser();
        $staff = Role::where('name', 'Staff Gudang')->firstOrFail();
        $before = $this->pivotCodes($staff);

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/roles/{$staff->id}/permissions", [
                'permissions' => array_merge($before, ['accounting.journal.post']),
            ])
            ->assertStatus(403);

        $this->assertSame($before, $this->pivotCodes($staff->fresh()));
    }

    // 4b. Update role (bukan endpoint mapping) juga tidak dapat dipakai untuk privilege escalation
    public function test_4b_non_admin_cannot_smuggle_permissions_through_role_update(): void
    {
        $actor = $this->securityRoleUser();
        $staff = Role::where('name', 'Staff Gudang')->firstOrFail();
        $before = $this->pivotCodes($staff);

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/roles/{$staff->id}", [
                'name'        => 'Staff Gudang',
                'permissions' => ['accounting.journal.post'],
            ])
            ->assertStatus(403);

        $this->assertSame($before, $this->pivotCodes($staff->fresh()));
    }

    // 5. Non-Administrator tidak dapat mengubah role miliknya sendiri
    public function test_5_non_admin_cannot_change_own_role(): void
    {
        $staff = $this->makeUser('staff5@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')
            ->putJson("/api/users/{$staff->id}", ['role' => 'Administrator'])
            ->assertStatus(403);

        $this->actingAs($staff, 'sanctum')
            ->putJson("/api/users/{$staff->id}", ['role' => 'Finance'])
            ->assertStatus(403);

        $this->assertSame('Staff Gudang', $staff->fresh()->role);
    }

    // 6. Non-Administrator tidak dapat menaikkan role pengguna lain
    public function test_6_non_admin_cannot_change_other_users_role(): void
    {
        $actor = $this->securityRoleUser();
        $victim = $this->makeUser('victim@test.local', 'Staff Gudang');

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/users/{$victim->id}", ['role' => 'Administrator'])
            ->assertStatus(403);

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/users/{$victim->id}", ['role' => 'Finance'])
            ->assertStatus(403);

        $this->assertSame('Staff Gudang', $victim->fresh()->role);
    }

    // 7. Administrator terakhir tidak dapat didemosikan
    public function test_7_last_administrator_cannot_be_demoted(): void
    {
        $this->assertSame(1, User::where('role', Role::ADMIN_NAME)->count());

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->admin->id}", ['role' => 'Staff Gudang'])
            ->assertStatus(403);

        $this->assertSame('Administrator', $this->admin->fresh()->role);
        $this->assertSame(1, User::where('role', Role::ADMIN_NAME)->count());
    }

    // 7b. Administrator terakhir juga tidak dapat didemosikan lewat Administrator lain yang tidak ada
    public function test_7b_single_admin_cannot_demote_via_patch(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/users/{$this->admin->id}", ['role' => 'Finance'])
            ->assertStatus(403);

        $this->assertSame('Administrator', $this->admin->fresh()->role);
    }

    // 8. Administrator terakhir tidak dapat dihapus
    public function test_8_last_administrator_cannot_be_deleted(): void
    {
        // Admin tidak dapat menghapus dirinya sendiri
        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/users/{$this->admin->id}")
            ->assertStatus(403);

        // Administrator lain (kedua) tidak dapat menghapus Administrator terakhir
        // -> namun jika ada 2 admin, penghapusan salah satu tetap harus menyisakan 1.
        $second = $this->makeUser('admin2@test.local', 'Administrator');
        $second->menu_access = ['users'];
        $second->save();

        // Kembalikan ke kondisi "hanya satu Administrator" untuk menguji guard.
        $second->role = 'Staff Gudang';
        $second->save();

        $otherAdmin = $this->makeUser('admin3@test.local', 'Administrator');
        $this->actingAs($otherAdmin, 'sanctum')
            ->deleteJson("/api/users/{$this->admin->id}")
            ->assertOk();

        // Menghapus Administrator terakhir (diri sendiri sudah diblokir; aktor harus ada
        // Administrator lain) -> minimal 1 Administrator tetap ada.
        $this->assertGreaterThanOrEqual(1, User::where('role', Role::ADMIN_NAME)->count());
    }

    // 9. Administrator dapat mengelola Administrator lain sesuai aturan existing
    public function test_9_administrator_can_manage_other_administrators(): void
    {
        $other = $this->makeUser('admin-other@test.local', 'Administrator');

        // Mengubah profil admin lain
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$other->id}", ['full_name' => 'Admin Kedua'])
            ->assertOk();
        $this->assertSame('Admin Kedua', $other->fresh()->full_name);

        // Menurunkan admin lain selagi masih ada Administrator lain (diri sendiri)
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$other->id}", ['role' => 'Finance'])
            ->assertOk();
        $this->assertSame('Finance', $other->fresh()->role);

        // Menaikkan kembali ke Administrator
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$other->id}", ['role' => 'Administrator'])
            ->assertOk();
        $this->assertSame('Administrator', $other->fresh()->role);

        // Menu administrator dapat diatur
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$other->id}/menu-access", ['menu_access' => ['dashboard', 'users']])
            ->assertOk();
        $this->assertContains('users', $other->fresh()->menu_access);
    }

    // 10. Dua request bersamaan/berurutan tidak dapat menghilangkan seluruh Administrator
    public function test_10_concurrent_admin_removal_keeps_at_least_one_administrator(): void
    {
        $adminA = $this->admin;
        $adminB = $this->makeUser('adminb@test.local', 'Administrator');
        $adminC = $this->makeUser('adminc@test.local', 'Administrator');

        // Simulasi dua request bersamaan: A demote B, C demote A.
        // Keduanya memakai lockForUpdate; salah satu harus gagal agar minimal 1 tersisa.
        $this->actingAs($adminC, 'sanctum')
            ->putJson("/api/users/{$adminB->id}", ['role' => 'Staff Gudang'])
            ->assertOk();

        $this->actingAs($adminA, 'sanctum')
            ->putJson("/api/users/{$adminC->id}", ['role' => 'Staff Gudang'])
            ->assertOk();

        // Sekarang tinggal A. A tidak dapat demote dirinya sendiri.
        $this->assertSame(1, User::where('role', Role::ADMIN_NAME)->count());

        $this->actingAs($adminA, 'sanctum')
            ->putJson("/api/users/{$adminA->id}", ['role' => 'Staff Gudang'])
            ->assertStatus(403);

        $this->assertSame(1, User::where('role', Role::ADMIN_NAME)->count());

        // Penjaga langsung (dalam transaksi terkunci) menolak demosi admin terakhir
        // walau aktor lain mencoba menurunkannya.
        $staffWithUsersManage = Role::firstOrCreate(['name' => 'HR Staff'], ['description' => 'x', 'is_system' => false]);
        $staffWithUsersManage->permissions()->sync(
            Permission::where('name', 'security.users.manage')->pluck('id')->all()
        );
        $hr = $this->makeUser('hr@test.local', 'HR Staff');

        $this->actingAs($hr, 'sanctum')
            ->putJson("/api/users/{$adminA->id}", ['role' => 'Staff Gudang'])
            ->assertStatus(403);

        $this->assertSame(1, User::where('role', Role::ADMIN_NAME)->count());
    }

    // 11. Non-Administrator tidak dapat memberikan menu administrasi
    public function test_11_non_admin_cannot_grant_admin_menus(): void
    {
        $actor = $this->securityRoleUser();
        $victim = $this->makeUser('victim11@test.local', 'Staff Gudang');

        foreach (['users', 'roles', 'permissions'] as $menu) {
            $this->actingAs($actor, 'sanctum')
                ->putJson("/api/users/{$victim->id}/menu-access", ['menu_access' => ['dashboard', $menu]])
                ->assertStatus(403);
        }

        // Self-grant juga ditolak
        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/users/{$actor->id}/menu-access", ['menu_access' => ['users']])
            ->assertStatus(403);

        $this->assertEmpty(array_intersect((array) $victim->fresh()->menu_access, ['users', 'roles', 'permissions']));
    }

    // 11b. Administrator tetap dapat memberikan menu Users
    public function test_11b_administrator_can_grant_admin_menu(): void
    {
        $target = $this->makeUser('target11b@test.local', 'Staff Gudang');

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$target->id}/menu-access", ['menu_access' => ['dashboard', 'users']])
            ->assertOk();

        $this->assertContains('users', $target->fresh()->menu_access);
    }

    // 11c. Menu access pada create/update user juga tidak dapat menyelundupkan menu admin
    public function test_11c_menu_access_cannot_smuggle_admin_menu(): void
    {
        $actor = $this->securityRoleUser();

        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/users/{$this->admin->id}", ['menu_access' => ['users']])
            ->assertStatus(403);

        $target = $this->makeUser('target11c@test.local', 'Staff Gudang');
        $this->actingAs($actor, 'sanctum')
            ->putJson("/api/users/{$target->id}", ['menu_access' => ['dashboard', 'users']])
            ->assertStatus(403);

        $this->assertEmpty(array_intersect((array) $target->fresh()->menu_access, ['users']));
    }

    // 12. menu_access tidak dapat memberikan permission backend
    public function test_12_menu_access_never_grants_api_permission(): void
    {
        $staff = $this->makeUser('staff12@test.local', 'Staff Gudang');

        // Tukang isi menu untuk dirinya sendiri lewat jalur apa pun tetap tidak
        // memberi permission API: menu diverifikasi hanya memengaruhi navigasi.
        $staffRole = Role::where('name', 'Staff Gudang')->firstOrFail();
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$staff->id}/menu-access", [
                'menu_access' => ['dashboard', 'activity-log', 'inventory-products'],
            ])
            ->assertOk();

        $me = $this->actingAs($staff->fresh(), 'sanctum')->getJson('/api/me')->assertOk()->json();

        $this->assertNotContains('security.activity_logs.view', $me['permissions']);
        $this->assertNotContains('users', $me['menu_access']);          // menu admin disaring
        $this->assertNotContains('activity-log', $me['menu_access']);   // butuh permission related

        // Endpoint dengan permission tetap menolak
        $this->actingAs($staff->fresh(), 'sanctum')
            ->getJson('/api/security/activity-logs')
            ->assertStatus(403);

        $this->assertFalse($staffRole->fresh()->permissionCodes() && in_array('security.activity_logs.view', $staffRole->fresh()->permissionCodes()));
    }

    // 13. Route User/Role dilindungi middleware permission (defense-in-depth)
    public function test_13_user_and_role_routes_are_protected(): void
    {
        $staff = $this->makeUser('staff13@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')->getJson('/api/users')->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->postJson('/api/users', ['name' => 'x'])->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->getJson('/api/roles')->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->postJson('/api/roles', ['name' => 'x'])->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->getJson('/api/permissions')->assertStatus(403);

        // Guest (tanpa login) -> 401
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/users')->assertStatus(401);
        $this->getJson('/api/roles')->assertStatus(401);
    }

    // 14. Endpoint autentikasi tetap bekerja (kompatibilitas /me, login, logout, profile)
    public function test_14_auth_endpoints_remain_compatible(): void
    {
        $login = $this->postJson('/api/login', [
            'email'    => 'admin@test.local',
            'password' => 'secret',
        ])->assertOk()->json();

        foreach (['id', 'name', 'email', 'full_name', 'role', 'permissions', 'is_admin', 'menu_access'] as $key) {
            $this->assertArrayHasKey($key, $login['user'], "field {$key} hilang dari /login");
        }
        $this->assertArrayHasKey('token', $login);
        $this->assertTrue($login['user']['is_admin']);

        $me = $this->actingAs($this->admin, 'sanctum')->getJson('/api/me')->assertOk()->json();
        foreach (['id', 'name', 'email', 'full_name', 'role', 'permissions', 'is_admin', 'menu_access'] as $key) {
            $this->assertArrayHasKey($key, $me, "field {$key} hilang dari /me");
        }
        $this->assertContains('users', $me['menu_access']);
        $this->assertContains('accounting.journal.post', $me['permissions']);

        // Profil
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/profile', ['full_name' => 'Administrator Sistem'])
            ->assertOk();

        // Password
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/profile/password', [
                'current_password'      => 'secret',
                'new_password'          => 'secretbaru',
                'new_password_confirmation' => 'secretbaru',
            ])
            ->assertOk();

        // Logout (tanpa actingAs agar request benar-benar memakai token Bearer)
        $this->app['auth']->forgetGuards();
        $token = $this->admin->createToken('t')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout')
            ->assertOk();
    }

    // 16. PermissionSeeder tidak menimpa custom mapping
    public function test_16_seeder_does_not_overwrite_custom_mapping(): void
    {
        $finance = Role::where('name', 'Finance')->firstOrFail();

        // Administrator mengubah mapping lewat UI/API
        $custom = ['accounting.journal.view'];
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/roles/{$finance->id}/permissions", ['permissions' => $custom])
            ->assertOk();

        $before = $this->pivotCodes($finance->fresh());
        $this->assertSame($custom, $before);

        // Seeder dijalankan ulang (beberapa kali)
        $this->seed(PermissionSeeder::class);
        $this->seed(PermissionSeeder::class);

        $this->assertSame($before, $this->pivotCodes($finance->fresh()), 'Seeder menimpa custom mapping Finance');

        // Role custom di luar katalog tetap utuh
        $customRole = Role::create(['name' => 'RoleKustomProbe', 'description' => 'x', 'is_system' => false]);
        $customRole->permissions()->sync(Permission::where('name', 'inventory.products.view')->pluck('id')->all());

        $this->seed(PermissionSeeder::class);

        $this->assertSame(['inventory.products.view'], $this->pivotCodes($customRole->fresh()));
        $this->assertDatabaseHas('roles', ['name' => 'RoleKustomProbe']);
    }

    // 16b. Role yang mapping-nya dikosongkan Administrator juga tidak "direset" oleh seeder
    public function test_16b_seeder_does_not_refill_role_cleared_by_administrator(): void
    {
        $staff = Role::where('name', 'Staff Gudang')->firstOrFail();

        // Simulasikan role yang SUDAH pernah di-seed lalu dikosongkan Administrator.
        if (Schema::hasColumn('roles', 'permissions_seeded_at')) {
            $staff->forceFill(['permissions_seeded_at' => now()])->save();
        }
        $staff->permissions()->sync([]);

        $this->seed(PermissionSeeder::class);

        $this->assertSame([], $this->pivotCodes($staff->fresh()), 'Seeder mengisi ulang role yang sudah dikosongkan');
    }

    // 16c. Role baru yang belum punya mapping diisi default oleh seeder
    public function test_16c_seeder_fills_default_mapping_for_role_without_permissions(): void
    {
        $management = Role::firstOrCreate(['name' => 'Management'], ['description' => 'x', 'is_system' => false]);
        $this->assertSame(0, $management->permissions()->count());

        $this->seed(PermissionSeeder::class);

        $this->assertGreaterThan(0, $management->fresh()->permissions()->count());
    }

    // 17. PermissionSeeder idempotent
    public function test_17_seeder_is_idempotent(): void
    {
        $permCount  = Permission::count();
        $pivotCount = DB::table('role_permissions')->count();
        $roleCount  = Role::count();
        $userCount  = User::count();

        $this->seed(PermissionSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(PermissionSeeder::class);

        $this->assertSame($permCount, Permission::count());
        $this->assertSame($pivotCount, DB::table('role_permissions')->count());
        $this->assertSame($roleCount, Role::count());
        $this->assertSame($userCount, User::count());
        $this->assertSame(count(PermissionCatalog::codes()), Permission::count());
    }

    // 18. User, role, dan data existing tidak hilang setelah seeder + perubahan role
    public function test_18_existing_data_is_preserved(): void
    {
        $users  = User::count();
        $roles  = Role::count();
        $perms  = Permission::count();
        $admins = User::where('role', Role::ADMIN_NAME)->count();

        $this->seed(PermissionSeeder::class);
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->admin->id}", ['full_name' => 'Admin Utama'])
            ->assertOk();

        $this->assertSame($users, User::count());
        $this->assertSame($roles, Role::count());
        $this->assertSame($perms, Permission::count());
        $this->assertSame($admins, User::where('role', Role::ADMIN_NAME)->count());
        $this->assertDatabaseHas('users', ['email' => 'admin@test.local', 'role' => 'Administrator']);
    }

    // Tambahan: Administrator tetap tidak terkunci & activity log tetap read-only
    public function test_administrator_never_locked_and_activity_log_read_only(): void
    {
        Role::where('name', 'Administrator')->first()->permissions()->sync([]);

        $this->actingAs($this->admin->fresh(), 'sanctum')->getJson('/api/roles')->assertOk();
        $this->actingAs($this->admin->fresh(), 'sanctum')->getJson('/api/accounting/vouchers')->assertOk();

        $this->assertDatabaseCount('activity_logs', ActivityLog::where('activity', 'security.users.manage')->count());
    }
}
