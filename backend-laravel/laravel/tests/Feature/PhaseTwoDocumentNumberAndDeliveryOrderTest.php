<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DeliveryOrder;
use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PhaseTwoDocumentNumberAndDeliveryOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureRoles(['Administrator']);
        $user = User::create([
            'name' => 'Phase Two Tester',
            'email' => 'phase-two@example.test',
            'password' => bcrypt('secret'),
            'role' => 'Administrator',
        ]);
        $this->actingAs($user, 'sanctum');
    }

    public function test_customer_code_is_generated_monthly_and_increments(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 14:30:00'));

        $first = Customer::create(['customer_name' => 'Customer One', 'status' => 'AKTIF']);
        $second = Customer::create(['customer_name' => 'Customer Two', 'status' => 'AKTIF']);

        $this->assertSame('CUST-2611-0001', $first->customer_code);
        $this->assertSame('CUST-2611-0002', $second->customer_code);

        Carbon::setTestNow();
    }

    public function test_delivery_order_number_is_generated_and_approval_deducts_stock_once(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 14:30:00'));
        $product = Product::create([
            'product_code' => 'INT-PHASE2-001',
            'barcode' => 'BAR-PHASE2-001',
            'part_number' => 'PN-PHASE2-001',
            'name' => 'Produk Phase Two',
            'unit' => 'PCS',
            'stock' => 10,
            'status' => 'AKTIF',
        ]);
        $warehouse = Warehouse::firstOrCreate(['code' => 'MAIN'], ['name' => 'Warehouse Utama', 'status' => 'AKTIF']);
        InventoryStock::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
        ]);
        $salesOrder = SalesOrder::create([
            'so_number' => 'SO-PHASE2-001',
            'client_po_number' => 'PO-CUSTOMER-001',
            'so_date' => '2026-11-08',
            'customer_name' => 'Customer Phase Two',
            'customer_address' => 'Alamat Pengiriman',
            'status' => 'Pending',
        ]);
        $soItem = SalesOrderItem::create([
            'sales_order_id' => $salesOrder->id,
            'product_id' => $product->id,
            'part_number' => $product->part_number,
            'description' => $product->name,
            'qty' => 3,
            'unit' => 'PCS',
            'unit_price' => 1000,
            'amount' => 3000,
        ]);

        $response = $this->postJson('/api/delivery-orders', [
            'sales_order_id' => $salesOrder->id,
            'items' => [[
                'sales_order_item_id' => $soItem->id,
                'product_id' => $product->id,
                'part_number' => $product->part_number,
                'description' => $product->name,
                'qty_sent' => 3,
                'unit' => 'PCS',
            ]],
        ])->assertCreated();

        $deliveryOrderId = $response->json('data.id');
        $this->assertSame('DO-081126-1430', $response->json('data.do_number'));
        $this->assertSame($soItem->id, $response->json('data.items.0.sales_order_item_id'));
        $this->assertSame($product->id, $response->json('data.items.0.product_id'));
        $this->assertSame(10, (int) $product->fresh()->stock);

        $this->postJson("/api/delivery-orders/{$deliveryOrderId}/approve")
            ->assertOk();
        $this->assertSame(7, (int) InventoryStock::where('product_id', $product->id)->value('quantity'));
        $transactionCount = InventoryTransaction::where('reference_type', 'DO')
            ->where('reference_id', $deliveryOrderId)
            ->count();
        $this->assertSame(1, $transactionCount);

        $this->postJson("/api/delivery-orders/{$deliveryOrderId}/approve")
            ->assertOk();
        $this->assertSame(7, (int) InventoryStock::where('product_id', $product->id)->value('quantity'));
        $this->assertSame($transactionCount, InventoryTransaction::where('reference_type', 'DO')
            ->where('reference_id', $deliveryOrderId)
            ->count());

        Carbon::setTestNow();
    }

    public function test_delivery_order_numbers_add_a_suffix_when_created_in_the_same_minute(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 14:30:00'));
        $service = app(\App\Services\DocumentNumberService::class);

        $this->assertSame('DO-081126-1430', $service->nextDeliveryOrderNumber(now()));
        $this->assertSame('DO-081126-1430-1', $service->nextDeliveryOrderNumber(now()));
        $this->assertSame('DO-081126-1430-2', $service->nextDeliveryOrderNumber(now()));

        Carbon::setTestNow();
    }
}
