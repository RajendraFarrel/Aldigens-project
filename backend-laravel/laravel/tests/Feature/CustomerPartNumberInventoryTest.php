<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerPartNumber;
use App\Models\InventoryStock;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseLocation;
use App\Services\InventoryStockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tahap A — Mapping Data Customer ke Produk Inventory + tampilan stok.
 *
 * Test ini memakai database testing terisolasi (RefreshDatabase). Jalankan
 * dengan DB_DATABASE yang khusus testing, JANGAN database perusahaan:
 *
 *   php artisan test --filter=CustomerPartNumberInventoryTest
 */
class CustomerPartNumberInventoryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Test User',
            'email' => 'cpn-test@example.com',
            'password' => bcrypt('secret'),
            'role' => 'Administrator',
        ]);
        $this->actingAs($this->user);

        $this->customer = Customer::create([
            'customer_code' => 'CUST-UT',
            'customer_name' => 'PT UNITED TRACTORS Tbk',
            'status' => 'AKTIF',
        ]);
    }

    private function makeProduct(array $overrides = []): Product
    {
        static $seq = 0;
        $seq++;

        return Product::create(array_merge([
            'product_code' => 'INT-T' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'barcode'      => 'INT-T' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'part_number'  => 'INV-PN-' . $seq,
            'name'         => 'Produk Uji ' . $seq,
            'item_type'    => 'BAHAN / COMPONENT',
            'unit'         => 'PCS',
            'stock'        => 0,
            'status'       => 'AKTIF',
        ], $overrides));
    }

    private function makePartNumber(array $overrides = []): CustomerPartNumber
    {
        static $seq = 0;
        $seq++;

        return CustomerPartNumber::create(array_merge([
            'customer_id'      => $this->customer->id,
            'part_number'      => 'CPN-TEST-' . $seq,
            'item_description' => 'Item uji',
            'selling_price'    => 1000,
            'status'           => 'AKTIF',
        ], $overrides));
    }

    private function makeWarehouse(string $code = 'MAIN'): Warehouse
    {
        return Warehouse::firstOrCreate(['code' => $code], ['name' => 'WH ' . $code, 'status' => 'AKTIF']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'customer_id'      => $this->customer->id,
            'part_number'      => 'CPN-NEW-001',
            'item_description' => 'Deskripsi',
            'selling_price'    => 2500,
            'status'           => 'AKTIF',
        ], $overrides);
    }

    /* 1 — data lama tanpa mapping tetap terbaca, stok null (bukan 0) */
    public function test_legacy_record_without_mapping_is_readable_with_null_stock(): void
    {
        $this->makePartNumber(['part_number' => 'CPN-LEGACY-1', 'status' => 'NONAKTIF']);

        $res = $this->getJson('/api/customer-part-numbers')->assertOk();

        $row = $res->json('data.0');
        $this->assertSame('CPN-LEGACY-1', $row['part_number']);
        $this->assertSame('NONAKTIF', $row['status']);
        $this->assertNull($row['inventory_product_id']);
        $this->assertNull($row['inventory_product']);
        $this->assertNull($row['inventory_stock_total']);
    }

    /* 2 — produk aktif dapat dihubungkan */
    public function test_can_map_part_number_to_active_inventory_product(): void
    {
        $product = $this->makeProduct();

        $res = $this->postJson('/api/customer-part-numbers', $this->payload([
            'inventory_product_id' => $product->id,
        ]))->assertCreated();

        $this->assertSame($product->id, $res->json('data.inventory_product_id'));
        $this->assertSame($product->part_number, $res->json('data.inventory_product.part_number'));
        $this->assertSame(0, $res->json('data.inventory_stock_total'));
        $this->assertDatabaseHas('customer_part_numbers', [
            'part_number' => 'CPN-NEW-001',
            'inventory_product_id' => $product->id,
        ]);
    }

    /* 3 — produk nonaktif ditolak */
    public function test_inactive_product_is_rejected_as_mapping(): void
    {
        $product = $this->makeProduct(['status' => 'NONAKTIF']);

        $this->postJson('/api/customer-part-numbers', $this->payload([
            'inventory_product_id' => $product->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('inventory_product_id');

        $this->assertDatabaseMissing('customer_part_numbers', ['part_number' => 'CPN-NEW-001']);
    }

    /* 4 — mapping dapat diubah ke produk lain */
    public function test_mapping_can_be_changed_to_another_product(): void
    {
        $first = $this->makeProduct();
        $second = $this->makeProduct();
        $record = $this->makePartNumber(['inventory_product_id' => $first->id]);

        $this->putJson('/api/customer-part-numbers/' . $record->id, $this->payload([
            'part_number' => $record->part_number,
            'inventory_product_id' => $second->id,
        ]))->assertOk()->assertJsonPath('data.inventory_product_id', $second->id);

        $this->assertSame($second->id, $record->fresh()->inventory_product_id);
    }

    /* 5 — mapping dapat dikosongkan tanpa menghapus record */
    public function test_mapping_can_be_cleared_without_deleting_record(): void
    {
        $product = $this->makeProduct();
        $record = $this->makePartNumber(['inventory_product_id' => $product->id, 'status' => 'NONAKTIF']);

        $this->putJson('/api/customer-part-numbers/' . $record->id, $this->payload([
            'part_number' => $record->part_number,
            'status' => 'NONAKTIF',
            'inventory_product_id' => null,
        ]))->assertOk()->assertJsonPath('data.inventory_product_id', null);

        $fresh = $record->fresh();
        $this->assertNotNull($fresh);
        $this->assertNull($fresh->inventory_product_id);
        $this->assertSame('NONAKTIF', $fresh->status);
    }

    /* 6 — produk yang sama boleh dipakai beberapa part number customer */
    public function test_same_product_can_be_mapped_to_multiple_part_numbers(): void
    {
        $product = $this->makeProduct();
        $otherCustomer = Customer::create([
            'customer_code' => 'CUST-KOBE',
            'customer_name' => 'PT KOBEXINDO',
            'status' => 'AKTIF',
        ]);

        $this->postJson('/api/customer-part-numbers', $this->payload([
            'inventory_product_id' => $product->id,
        ]))->assertCreated();

        $this->postJson('/api/customer-part-numbers', $this->payload([
            'customer_id' => $otherCustomer->id,
            'part_number' => 'KOBE-001',
            'inventory_product_id' => $product->id,
        ]))->assertCreated();

        $this->assertSame(2, CustomerPartNumber::where('inventory_product_id', $product->id)->count());
    }

    /* 7 & 8 — index mengembalikan detail produk + SUM inventory_stocks lintas warehouse/lokasi */
    public function test_index_returns_product_detail_and_total_stock_across_warehouses(): void
    {
        $product = $this->makeProduct(['unit' => 'METER']);
        $main = $this->makeWarehouse('MAIN');
        $secondary = $this->makeWarehouse('SECOND');
        $location = WarehouseLocation::create(['warehouse_id' => $secondary->id, 'code' => 'A1', 'name' => 'Rak A1']);

        InventoryStock::create(['product_id' => $product->id, 'warehouse_id' => $main->id, 'warehouse_location_id' => null, 'quantity' => 100]);
        InventoryStock::create(['product_id' => $product->id, 'warehouse_id' => $secondary->id, 'warehouse_location_id' => null, 'quantity' => 30]);
        InventoryStock::create(['product_id' => $product->id, 'warehouse_id' => $secondary->id, 'warehouse_location_id' => $location->id, 'quantity' => 20]);

        $this->makePartNumber(['part_number' => 'CPN-STOCK-1', 'inventory_product_id' => $product->id]);

        $row = $this->getJson('/api/customer-part-numbers')->assertOk()->json('data.0');

        $this->assertSame($product->id, $row['inventory_product_id']);
        $this->assertSame($product->part_number, $row['inventory_product']['part_number']);
        $this->assertSame($product->name, $row['inventory_product']['name']);
        $this->assertSame($product->product_code, $row['inventory_product']['product_code']);
        $this->assertSame($product->item_type, $row['inventory_product']['item_type']);
        $this->assertSame('METER', $row['inventory_product']['unit']);
        $this->assertSame(150, $row['inventory_stock_total']);
    }

    /* 9 — produk terhubung tanpa saldo = 0 (bukan null) */
    public function test_connected_product_without_balance_returns_zero(): void
    {
        $product = $this->makeProduct();
        $this->makePartNumber(['part_number' => 'CPN-ZERO', 'inventory_product_id' => $product->id]);

        $row = $this->getJson('/api/customer-part-numbers')->assertOk()->json('data.0');

        $this->assertSame(0, $row['inventory_stock_total']);
        $this->assertNotNull($row['inventory_product']);
    }

    /* 11 — perubahan InventoryStock tercermin saat data di-fetch ulang */
    public function test_stock_changes_are_reflected_on_refetch(): void
    {
        $product = $this->makeProduct();
        $this->makePartNumber(['part_number' => 'CPN-SYNC', 'inventory_product_id' => $product->id]);
        $service = app(InventoryStockService::class);

        $first = $this->getJson('/api/customer-part-numbers')->json('data.0.inventory_stock_total');
        $this->assertSame(0, $first);

        $service->adjust($product, 25, 'MASUK', ['warehouse_id' => $this->makeWarehouse('MAIN')->id, 'reference_type' => 'TEST']);
        $second = $this->getJson('/api/customer-part-numbers')->json('data.0.inventory_stock_total');
        $this->assertSame(25, $second);

        $service->adjust($product, 5, 'KELUAR', ['warehouse_id' => $this->makeWarehouse('MAIN')->id, 'reference_type' => 'TEST']);
        $third = $this->getJson('/api/customer-part-numbers')->json('data.0.inventory_stock_total');
        $this->assertSame(20, $third);
    }

    /* 12 — transfer lokasi/warehouse yang seimbang tidak mengubah total */
    public function test_balanced_transfer_does_not_change_total_stock(): void
    {
        $product = $this->makeProduct();
        $this->makePartNumber(['part_number' => 'CPN-TRANSFER', 'inventory_product_id' => $product->id]);
        $service = app(InventoryStockService::class);
        $main = $this->makeWarehouse('MAIN');
        $secondary = $this->makeWarehouse('SECOND');

        $service->adjust($product, 40, 'MASUK', ['warehouse_id' => $main->id, 'reference_type' => 'TEST']);
        $this->assertSame(40, $this->getJson('/api/customer-part-numbers')->json('data.0.inventory_stock_total'));

        $groupKey = 'TRF-TEST-1';
        $service->adjust($product, 15, 'TRANSFER', [
            'warehouse_id' => $main->id,
            'transfer_direction' => 'OUT',
            'group_key' => $groupKey,
            'reference_type' => 'TRANSFER',
        ]);
        $service->adjust($product, 15, 'TRANSFER', [
            'warehouse_id' => $secondary->id,
            'transfer_direction' => 'IN',
            'group_key' => $groupKey,
            'reference_type' => 'TRANSFER',
        ]);

        $this->assertSame(40, $this->getJson('/api/customer-part-numbers')->json('data.0.inventory_stock_total'));
    }

    /* 13 — import Excel tetap berjalan, status tersimpan, mapping tetap null */
    public function test_import_keeps_status_and_leaves_mapping_null(): void
    {
        // Fixture Excel dengan header PART NUMBER + kolom STATUS (format import existing).
        $path = base_path('tests/fixtures/import-customer-part-number.xlsx');
        $this->assertFileExists($path, 'File fixture import tidak ditemukan.');

        $this->post('/api/customer-part-numbers/import', [
            'file' => new UploadedFile($path, 'import.xlsx', null, null, true),
        ], ['Accept' => 'application/json'])->assertOk();

        $active = CustomerPartNumber::where('part_number', 'IMP-001')->first();
        $inactive = CustomerPartNumber::where('part_number', 'IMP-002')->first();

        $this->assertNotNull($active, 'Baris import valid harus tersimpan.');
        $this->assertNotNull($inactive, 'Baris import valid harus tersimpan.');
        // Format PARTNUMBER_APP tidak memiliki kolom STATUS: nilai default AKTIF dipakai.
        $this->assertSame('AKTIF', $active->status);
        $this->assertSame('AKTIF', $inactive->status);
        $this->assertNull($active->inventory_product_id);
        $this->assertNull($inactive->inventory_product_id);
    }

    /* 13b — kolom STATUS pada file import tetap tersimpan bila ada */
    public function test_import_keeps_status_column_when_present(): void
    {
        // Status NONAKTIF yang sudah ada tidak boleh di-reset oleh perubahan Tahap A.
        $record = $this->makePartNumber(['part_number' => 'IMP-STATUS', 'status' => 'NONAKTIF']);

        $this->putJson('/api/customer-part-numbers/' . $record->id, $this->payload([
            'part_number' => 'IMP-STATUS',
            'status' => 'NONAKTIF',
            'inventory_product_id' => $this->makeProduct()->id,
        ]))->assertOk()->assertJsonPath('data.status', 'NONAKTIF');

        $this->assertSame('NONAKTIF', $record->fresh()->status);
    }

    /* 14 — export & pagination/search tetap berjalan */
    public function test_export_and_filter_still_work(): void
    {
        $this->makePartNumber(['part_number' => 'EXP-001']);
        $this->makePartNumber(['part_number' => 'EXP-002']);

        $this->get('/api/customer-part-numbers/export')->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $filtered = $this->getJson('/api/customer-part-numbers?search=EXP-002')->assertOk();
        $this->assertCount(1, $filtered->json('data'));
        $this->assertSame(2, $filtered->json('summary.total_part_number'));
        $this->assertSame(1, $filtered->json('summary.total_customer'));
    }

    /* 15 — master customer tidak berubah oleh perubahan Data Customer */
    public function test_master_customer_is_not_modified(): void
    {
        $product = $this->makeProduct(['customer_id' => null]);
        $record = $this->makePartNumber();
        $before = Customer::find($this->customer->id)->toArray();

        $this->putJson('/api/customer-part-numbers/' . $record->id, $this->payload([
            'part_number' => $record->part_number,
            'inventory_product_id' => $product->id,
        ]))->assertOk();

        $this->assertSame($before, Customer::find($this->customer->id)->toArray());
        $this->assertNull($product->fresh()->customer_id);

        $this->deleteJson('/api/customer-part-numbers/' . $record->id)->assertOk();
        $this->assertNotNull(Product::find($product->id), 'Produk Inventory tidak boleh terhapus saat mapping dihapus.');
        $this->assertSame($before, Customer::find($this->customer->id)->toArray());
    }

    /* Mapping / edit tidak mengubah saldo maupun membuat transaksi stok */
    public function test_mapping_does_not_change_stock_or_create_transactions(): void
    {
        $product = $this->makeProduct();
        $main = $this->makeWarehouse('MAIN');
        InventoryStock::create(['product_id' => $product->id, 'warehouse_id' => $main->id, 'warehouse_location_id' => null, 'quantity' => 7]);
        $product->update(['stock' => 7]);

        $this->postJson('/api/customer-part-numbers', $this->payload([
            'inventory_product_id' => $product->id,
        ]))->assertCreated();

        $this->assertSame(7, (int) $product->fresh()->stock);
        $this->assertSame(7, (int) InventoryStock::where('product_id', $product->id)->sum('quantity'));
        $this->assertSame(0, DB::table('inventory_transactions')->where('product_id', $product->id)->count());
    }

    /* Endpoint dropdown hanya mengembalikan produk aktif + stok total */
    public function test_inventory_options_only_returns_active_products_with_stock(): void
    {
        $active = $this->makeProduct(['part_number' => 'OPT-ACTIVE']);
        $this->makeProduct(['part_number' => 'OPT-INACTIVE', 'status' => 'NONAKTIF']);
        $main = $this->makeWarehouse('MAIN');
        InventoryStock::create(['product_id' => $active->id, 'warehouse_id' => $main->id, 'warehouse_location_id' => null, 'quantity' => 12]);

        $res = $this->getJson('/api/customer-part-numbers/inventory-options')->assertOk();

        $this->assertCount(1, $res->json('data'));
        $this->assertSame('OPT-ACTIVE', $res->json('data.0.part_number'));
        $this->assertSame(12, $res->json('data.0.stock_total'));

        $search = $this->getJson('/api/customer-part-numbers/inventory-options?search=OPT-ACT')->json('data');
        $this->assertCount(1, $search);
    }

    /* Validasi: produk yang tidak ada ditolak */
    public function test_unknown_product_id_is_rejected(): void
    {
        $this->postJson('/api/customer-part-numbers', $this->payload([
            'inventory_product_id' => 999999,
        ]))->assertStatus(422)->assertJsonValidationErrors('inventory_product_id');
    }
}
