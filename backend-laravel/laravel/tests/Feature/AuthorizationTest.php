<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\JournalVoucher;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StockOpname;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\PermissionCatalog;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Uji otorisasi Tahap 1 AIMS.
 *
 * BERJALAN HANYA DI DATABASE UJI (phpunit.xml: DB_DATABASE=aldigens_test).
 * tests/bootstrap_guard.php menghentikan test bila DB_DATABASE = aldigens.
 */
class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Role sistem existing sudah dibuat oleh migration roles -> firstOrCreate
        // agar test idempotent dan tidak bergantung pada urutan migration.
        Role::firstOrCreate(['name' => 'Administrator'], ['description' => 'Akses penuh', 'is_system' => true]);
        Role::firstOrCreate(['name' => 'Staff Gudang'], ['description' => 'Gudang', 'is_system' => true]);
        Role::firstOrCreate(['name' => 'Finance'], ['description' => 'Keuangan', 'is_system' => false]);
        Role::firstOrCreate(['name' => 'Staff Operasional'], ['description' => 'Operasional', 'is_system' => false]);

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

    // 1. User tanpa login -> 401
    public function test_guest_gets_401(): void
    {
        $this->getJson('/api/users')->assertStatus(401);
        $this->getJson('/api/accounting/accounts')->assertStatus(401);
        $this->getJson('/api/security/activity-logs')->assertStatus(401);
    }

    // 2. Login tanpa permission -> 403
    public function test_user_without_permission_gets_403(): void
    {
        $staff = $this->makeUser('staff@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/accounting/vouchers')
            ->assertStatus(403);
    }

    // 3. Administrator dapat mengakses fitur yang diizinkan (tidak terkunci)
    public function test_administrator_can_access_all_modules(): void
    {
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/users')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/roles')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/accounting/accounts')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/accounting/vouchers')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/warehouses')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/customers')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/spks')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/security/activity-logs')->assertOk();

        // /me mengirim permission & menu dari server
        $me = $this->actingAs($this->admin, 'sanctum')->getJson('/api/me')->assertOk()->json();
        $this->assertTrue($me['is_admin']);
        $this->assertContains('accounting.journal.post', $me['permissions']);
        $this->assertContains('users', $me['menu_access']);
    }

    // 4. Staff gudang tidak dapat memposting jurnal
    public function test_warehouse_staff_cannot_post_journal(): void
    {
        $staff = $this->makeUser('gudang@test.local', 'Staff Gudang');

        // Route model binding ({journalVoucher}) tervalidasi sebelum middleware.
        // Agar yang diuji benar-benar otorisasi, voucher harus ada di DB.
        $voucher = JournalVoucher::create([
            'no_voucher' => 'JV-TEST-0001',
            'tanggal'    => now()->toDateString(),
            'jenis'      => 'Jurnal Umum',
            'status'     => 'DRAFT',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/accounting/vouchers/{$voucher->id}/post")
            ->assertStatus(403);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/accounting/vouchers/{$voucher->id}/reverse", ['alasan' => 'test'])
            ->assertStatus(403);
    }

    // 5. Staff finance tidak dapat menyelesaikan Stock Opname tanpa permission
    public function test_finance_staff_cannot_complete_stock_opname(): void
    {
        $finance = $this->makeUser('finance@test.local', 'Finance');

        // Stock opname harus ada agar yang diuji adalah otorisasi (403), bukan 404.
        $opname = StockOpname::create([
            'document_number' => 'SO-TEST-0001',
            'opname_date'     => now()->toDateString(),
            'warehouse_id'    => Warehouse::create(['name' => 'Gudang Uji', 'code' => 'WH-UJI'])->id,
            'status'          => 'DRAFT',
        ]);

        $this->actingAs($finance, 'sanctum')
            ->postJson("/api/inventory/stock-opnames/{$opname->id}/complete")
            ->assertStatus(403);

        // Finance tetap boleh membaca laporan keuangan.
        $this->actingAs($finance, 'sanctum')->getJson('/api/accounting/vouchers')->assertOk();
    }

    // 6. User biasa tidak dapat membuat administrator
    public function test_normal_user_cannot_create_administrator(): void
    {
        $staff = $this->makeUser('staff2@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')->postJson('/api/users', [
            'name'     => 'Hacker',
            'email'    => 'hacker@test.local',
            'password' => 'secret123',
            'role'     => 'Administrator',
        ])->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'hacker@test.local']);
    }

    // 7. User biasa tidak dapat memberikan permission/menu kepada dirinya sendiri
    public function test_normal_user_cannot_escalate_self(): void
    {
        $staff = $this->makeUser('staff3@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')
            ->putJson("/api/users/{$staff->id}/menu-access", ['menu_access' => ['users', 'activity-log']])
            ->assertStatus(403);

        $this->actingAs($staff, 'sanctum')
            ->putJson("/api/users/{$staff->id}", ['role' => 'Administrator'])
            ->assertStatus(403);

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/roles/' . Role::where('name', 'Staff Gudang')->value('id') . '/permissions', [
                'permissions' => PermissionCatalog::codes(),
            ])->assertStatus(403);

        $this->assertSame('Staff Gudang', $staff->fresh()->role);
    }

    // 8. Role tidak valid ditolak (login + pembuatan user)
    public function test_invalid_role_is_rejected(): void
    {
        $user = $this->makeUser('ghost@test.local', 'RoleKarangan');

        $this->postJson('/api/login', [
            'email'    => 'ghost@test.local',
            'password' => 'secret',
        ])->assertStatus(403);

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/users', [
            'name'     => 'Ghost',
            'email'    => 'ghost2@test.local',
            'password' => 'secret123',
            'role'     => 'RoleKarangan',
        ])->assertStatus(422);

        $this->assertSame($user->email, 'ghost@test.local');
    }

    // 9. Permission tidak dikenal ditolak
    public function test_unknown_permission_is_rejected(): void
    {
        $role = Role::where('name', 'Finance')->firstOrFail();

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/roles/{$role->id}/permissions", [
                'permissions' => ['accounting.journal.view', 'accounting.super.hack'],
            ])->assertStatus(422);

        $this->assertFalse(Permission::where('name', 'accounting.super.hack')->exists());
    }

    // 10. CRUD User terlindungi
    public function test_user_crud_is_protected(): void
    {
        $staff = $this->makeUser('staff4@test.local', 'Staff Gudang');
        $victim = $this->makeUser('victim@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')->getJson('/api/users')->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->deleteJson("/api/users/{$victim->id}")->assertStatus(403);

        $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/users/{$victim->id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $victim->id]);

        // Administrator tidak dapat menghapus dirinya sendiri.
        $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/users/{$this->admin->id}")->assertStatus(403);
    }

    // 11. CRUD Role terlindungi
    public function test_role_crud_is_protected(): void
    {
        $staff = $this->makeUser('staff5@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')->getJson('/api/roles')->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->postJson('/api/roles', ['name' => 'Role Baru'])->assertStatus(403);
        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/roles/' . Role::where('name', 'Finance')->value('id'))
            ->assertStatus(403);

        $this->assertDatabaseHas('roles', ['name' => 'Finance']);
    }

    // 12. Direct API call tanpa permission tetap 403 (frontend dimanipulasi)
    public function test_direct_api_call_without_permission_is_403(): void
    {
        $staff = $this->makeUser('staff6@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')->postJson('/api/accounting/accounts', [
            'nomor_akun' => '9-9999',
            'nama_akun'  => 'Manipulasi',
            'tipe_akun'  => 'Aset',
            'saldo_normal' => 'Debit',
        ])->assertStatus(403);

        // Manipulasi role di payload diabaikan (field tidak dikenal / ditolak 403).
        $this->actingAs($staff, 'sanctum')->putJson("/api/users/{$staff->id}", [
            'is_admin'    => true,
            'role_id'     => 1,
            'permissions' => PermissionCatalog::codes(),
        ])->assertStatus(403);

        $this->assertSame('Staff Gudang', $staff->fresh()->role);
    }

    // 13. Menu yang tidak diizinkan tidak diberikan backend
    public function test_menu_access_follows_permissions(): void
    {
        $staff = $this->makeUser('staff7@test.local', 'Staff Gudang');

        $me = $this->actingAs($staff, 'sanctum')->getJson('/api/me')->json();

        $this->assertNotContains('users', $me['menu_access']);
        $this->assertNotContains('activity-log', $me['menu_access']);
        $this->assertNotContains('accounting-journal', $me['menu_access']);
        $this->assertContains('dashboard', $me['menu_access']);
    }

    // 14. Administrator tidak terkunci meskipun mapping permission dikosongkan
    public function test_administrator_is_never_locked_out(): void
    {
        $role = Role::where('name', 'Administrator')->firstOrFail();
        $role->permissions()->sync([]);

        $this->assertTrue($this->admin->fresh()->isAdministrator());
        $this->assertContains('accounting.journal.post', $this->admin->fresh()->getPermissionCodes());

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/accounting/vouchers')->assertOk();

        // Mapping untuk Administrator tidak dapat dikurangi lewat API.
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/roles/{$role->id}/permissions", ['permissions' => []])
            ->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/accounting/vouchers')->assertOk();
    }

    // 15. Data user, role, permission existing tidak hilang setelah seeder
    public function test_existing_data_preserved_after_seeder(): void
    {
        $staff = $this->makeUser('staff7@test.local', 'Staff Gudang');

        $countUsers   = User::count();
        $countRoles   = Role::count();
        $financeRoles = Role::where('name', 'Finance')->count();
        $countPerms   = Permission::count();

        $this->seed(PermissionSeeder::class);

        $this->assertSame($countUsers, User::count());
        $this->assertSame($countRoles, Role::count());
        $this->assertSame($financeRoles, 1);
        $this->assertSame($countPerms, Permission::count());
        $this->assertDatabaseHas('users', ['email' => 'staff7@test.local']);
    }

    // Tambahan: activity log tercatat & read-only
    public function test_activity_log_is_recorded_and_read_only(): void
    {
        $this->postJson('/api/login', [
            'email'    => 'admin@test.local',
            'password' => 'secret',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', ['activity' => 'security.login', 'result' => 'success']);

        $staff = $this->makeUser('staff8@test.local', 'Staff Gudang');
        $this->actingAs($staff, 'sanctum')->getJson('/api/security/activity-logs')->assertStatus(403);

        $logs = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/security/activity-logs')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($logs);
        $this->assertArrayNotHasKey('token', $logs[0]);
        $this->assertArrayNotHasKey('password', $logs[0]);
        $this->assertTrue(ActivityLog::tableReady());
    }

    // Tambahan: password/token tidak masuk log
    public function test_sensitive_data_is_redacted_in_log(): void
    {
        $clean = \App\Services\AuditLogService::sanitize([
            'password' => 'rahasia',
            'nomor_rekening' => '0702243394',
            'nested' => ['token' => 'abc'],
            'tanggal' => '2026-11-03',
        ]);

        $this->assertSame('[REDACTED]', $clean['password']);
        $this->assertSame('[REDACTED]', $clean['nomor_rekening']);
        $this->assertSame('[REDACTED]', $clean['nested']['token']);
        $this->assertSame('2026-11-03', $clean['tanggal']);
    }
}
