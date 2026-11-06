<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * HOTFIX: GET /api/inventory/products (regresi pasca commit 4df4490).
 *
 * Berjalan HANYA pada database uji (phpunit.xml: DB_DATABASE=aldigens_test);
 * tests/bootstrap_guard.php menghentikan test bila DB_DATABASE = aldigens.
 */
class InventoryProductsRouteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['Administrator', 'Staff Gudang'] as $name) {
            Role::firstOrCreate(['name' => $name], ['is_system' => true]);
        }
        $this->seed(PermissionSeeder::class);

        $this->admin = User::create([
            'name'     => 'admin',
            'email'    => 'admin@test.local',
            'password' => Hash::make('secret'),
            'role'     => 'Administrator',
        ]);
    }

    private function makeUser(string $email, string $role, array $permissions = []): User
    {
        $user = User::create([
            'name'     => explode('@', $email)[0],
            'email'    => $email,
            'password' => Hash::make('secret'),
            'role'     => $role,
        ]);

        if ($permissions) {
            $roleModel = Role::firstOrCreate(['name' => $role], ['is_system' => false]);
            $roleModel->permissions()->sync(
                \App\Models\Permission::whereIn('name', $permissions)->pluck('id')->all()
            );
        }

        return $user;
    }

    // 1. Tanpa token -> 401
    public function test_get_products_without_token_returns_401(): void
    {
        $this->getJson('/api/inventory/products')->assertStatus(401);
    }

    // 2. Login tanpa permission -> 403
    public function test_get_products_without_permission_returns_403(): void
    {
        $role = Role::create(['name' => 'TanpaAkses', 'is_system' => false]);
        $role->permissions()->sync([]);

        $user = $this->makeUser('noaccess@test.local', 'TanpaAkses');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    // 3. Administrator -> 200
    public function test_get_products_with_administrator_returns_200(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    // 4. Struktur produk & stok sesuai (kompatibel frontend)
    public function test_get_products_returns_product_and_stock_fields(): void
    {
        $supplier = \App\Models\Supplier::create([
            'supplier_code' => 'SUP-T1',
            'supplier_name' => 'Supplier Uji',
            'status'        => 'AKTIF',
        ]);

        $product = Product::create([
            'product_code'  => 'PRD-T1',
            'part_number'   => 'PART-T1',
            'name'          => 'Produk Uji',
            'unit'          => 'PCS',
            'stock'         => 7,
            'minimum_stock' => 1,
            'status'        => 'AKTIF',
            'supplier_id'   => $supplier->id,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(200);

        $rows = $res->json('data');
        $this->assertIsArray($rows);
        $this->assertNotEmpty($rows);

        $row = collect($rows)->firstWhere('id', $product->id);
        $this->assertNotNull($row, 'Produk hasil create tidak muncul di GET index');
        $this->assertSame('PART-T1', $row['part_number']);
        $this->assertSame('Produk Uji', $row['name']);
        $this->assertSame(7, (int) $row['stock']);
        $this->assertArrayHasKey('customer', $row);
        $this->assertArrayHasKey('supplier', $row);

        // Filter ?search= tetap bekerja (dipakai InventoryProducts.jsx)
        $search = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products?search=PART-T1')
            ->assertStatus(200)
            ->json('data');
        $this->assertCount(1, $search);
    }

    // 5. Staff Gudang (punya inventory.products.view) -> 200
    public function test_warehouse_staff_with_view_permission_returns_200(): void
    {
        $staff = $this->makeUser('gudang@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(200);
    }

    // 6. POST & endpoint Inventory lain tetap bekerja
    public function test_post_and_other_inventory_endpoints_still_work(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inventory/products', [
                'part_number'    => 'PART-NEW',
                'name'           => 'Produk Baru',
                'unit'           => 'PCS',
                'stock'          => 3,
            ])->assertStatus(201);

        $this->assertDatabaseHas('products', ['part_number' => 'PART-NEW']);

        // Endpoint lain tidak terkena dampak
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/stocks')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/warehouses')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/stock-opnames')->assertOk();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/transactions')->assertOk();
        $created = Product::where('part_number', 'PART-NEW')->firstOrFail();
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products/search?code=' . $created->product_code)
            ->assertStatus(200);
        // Kode yang tidak ada -> 404 by design (bukan regresi route)
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/products/search?code=TIDAK-ADA')
            ->assertStatus(404);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/products/import-template')
            ->assertStatus(200);

        // Path literal tidak tertangkap oleh /{inventory_product}
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/products/search')
            ->assertStatus(400);
    }

    // 7. Detail produk tetap dapat diakses
    public function test_show_product_still_works(): void
    {
        $product = Product::create([
            'product_code' => 'PRD-T2',
            'part_number'  => 'PART-T2',
            'name'         => 'Detail Uji',
            'stock'        => 0,
            'status'       => 'AKTIF',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$product->id}")
            ->assertStatus(200);
    }

    // 8. Data produk & stok tidak berubah hanya karena GET
    public function test_get_does_not_change_stock_or_data(): void
    {
        $product = Product::create([
            'product_code' => 'PRD-T3',
            'part_number'  => 'PART-T3',
            'name'         => 'Readonly Uji',
            'stock'        => 12,
            'status'       => 'AKTIF',
        ]);

        $before = Product::find($product->id)->only(['stock', 'name', 'part_number']);

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/products')->assertOk();

        $after = Product::find($product->id)->only(['stock', 'name', 'part_number']);
        $this->assertSame($before, $after);
        $this->assertSame(12, (int) $product->fresh()->stock);
    }
}
