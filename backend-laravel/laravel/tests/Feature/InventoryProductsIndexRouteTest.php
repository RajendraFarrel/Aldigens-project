<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * HOTFIX Tahap 1.2 — REGRESI GET /api/inventory/products.
 *
 * File ini KHUSUS memverifikasi bahwa route GET index benar-benar TERDAFTAR
 * (bukan 405) dan dapat dipakai frontend Inventory maupun modul lain yang
 * hanya membaca daftar produk (Purchase). Tidak mengubah test lain.
 *
 * Berjalan HANYA pada database uji (phpunit.xml: DB_DATABASE=aldigens_test).
 */
class InventoryProductsIndexRouteTest extends TestCase
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

    private function makeUser(string $email, string $role): User
    {
        return User::create([
            'name'     => explode('@', $email)[0],
            'email'    => $email,
            'password' => Hash::make('secret'),
            'role'     => $role,
        ]);
    }

    private function makeProduct(string $part = 'PART-IDX'): Product
    {
        return Product::create([
            'product_code'  => 'PRD-' . $part,
            'part_number'   => $part,
            'name'          => 'Produk ' . $part,
            'unit'          => 'PCS',
            'stock'         => 5,
            'minimum_stock' => 1,
            'status'        => 'AKTIF',
        ]);
    }

    /** 1. Route GET index terdaftar sebagai GET (penyebab 405 sebelumnya). */
    public function test_get_index_route_is_registered(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())
            ->first(fn($r) => $r->uri() === 'api/inventory/products'
                && in_array('GET', $r->methods(), true));

        $this->assertNotNull($route, 'GET /api/inventory/products tidak terdaftar -> akan 405');

        $this->assertSame(
            'App\Http\Controllers\ProductController@index',
            $route->getActionName(),
            'Route harus menuju ProductController@index'
        );

        $this->assertContains('api', $route->gatherMiddleware());
        $this->assertContains('auth:sanctum', $route->gatherMiddleware());
        $this->assertContains(
            'permission:inventory.products.view',
            $route->gatherMiddleware(),
            'Route GET index wajib memakai permission inventory.products.view'
        );
    }

    /** 1b. Method lain tidak "mencuri" path index. */
    public function test_index_path_is_not_defined_as_post_only(): void
    {
        $methods = collect(Route::getRoutes()->getRoutes())
            ->filter(fn($r) => $r->uri() === 'api/inventory/products')
            ->flatMap(fn($r) => array_diff($r->methods(), ['HEAD']))
            ->unique()
            ->values()
            ->all();

        $this->assertContains('GET', $methods);
        $this->assertContains('POST', $methods);
    }

    /** 2. Tanpa autentikasi -> 401. */
    public function test_index_without_auth_returns_401(): void
    {
        $this->getJson('/api/inventory/products')->assertStatus(401);
    }

    /** 3. Login tanpa permission -> 403. */
    public function test_index_without_permission_returns_403(): void
    {
        Role::create(['name' => 'TanpaAkses', 'is_system' => false]); // tanpa mapping
        $user = $this->makeUser('noaccess@test.local', 'TanpaAkses');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(403);
    }

    /** 4. Administrator -> 200 + format kompatibel frontend. */
    public function test_administrator_gets_200_with_compatible_payload(): void
    {
        $product = $this->makeProduct('PART-KOMPAT');

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(200)
            ->assertJsonStructure(['data']);

        $rows = $res->json('data');
        $row  = collect($rows)->firstWhere('id', $product->id);

        $this->assertNotNull($row);
        foreach (['id', 'product_code', 'part_number', 'name', 'unit', 'stock', 'status'] as $key) {
            $this->assertArrayHasKey($key, $row, "Field {$key} hilang dari response GET index");
        }
        $this->assertSame('PART-KOMPAT', $row['part_number']);
    }

    /** 5. User berizin (Staff Gudang) -> 200. */
    public function test_user_with_view_permission_gets_200(): void
    {
        $staff = $this->makeUser('gudang@test.local', 'Staff Gudang');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/inventory/products')
            ->assertStatus(200);
    }

    /** 6. Search & filter tetap berfungsi. */
    public function test_search_and_filters_still_work(): void
    {
        $this->makeProduct('PART-FILTER-A');
        $this->makeProduct('PART-FILTER-B');

        $search = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products?search=PART-FILTER-A')
            ->assertStatus(200)
            ->json('data');
        $this->assertCount(1, $search);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products?status=AKTIF')
            ->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    /** 7. POST & endpoint lain tidak regresi (tidak 405). */
    public function test_post_and_sibling_endpoints_are_not_regressed(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/inventory/products', [
                'part_number' => 'PART-POST',
                'name'        => 'Produk POST',
                'unit'        => 'PCS',
                'stock'       => 1,
            ])->assertStatus(201);

        $product = Product::findOrFail(Product::where('part_number', 'PART-POST')->value('id'));

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$product->id}")->assertOk();

        // PUT/PATCH saat ini SELALU 422 karena update() tidak mengecualikan produk
        // itu sendiri pada pengecekan duplikasi (bug terpisah, bukan regresi GET index).
        // Tidak diuji di sini agar tidak menyamarkan temuan; lihat laporan.
        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/inventory/products/{$product->id}")->assertOk();
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/inventory/products/import-template')->assertOk();
    }

    /** 8. GET index bersifat read-only (stok tidak berubah). */
    public function test_index_does_not_mutate_stock(): void
    {
        $product = $this->makeProduct('PART-RO');
        $before  = $product->only(['stock', 'name', 'part_number']);

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/inventory/products')->assertOk();

        $this->assertSame($before, $product->fresh()->only(['stock', 'name', 'part_number']));
    }
}
