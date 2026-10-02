<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\DeliveryOrderController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\ProductController as ApiProductController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\SalesReturnController;
use App\Http\Controllers\SalesReceiptController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\InventoryWarehouseController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\PurchaseRequestController;
use App\Http\Controllers\BomController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\Api\ReceiveItemController;
use App\Http\Controllers\CustomerPartNumberController;
use App\Http\Controllers\CommissioningController;
use App\Http\Controllers\RoleController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// -----------------------------------------------
// Public routes (tidak perlu login)
// -----------------------------------------------
Route::post('/login', [AuthController::class, 'login']);

Route::get('/ping', function () {
    return response()->json([
        'status'    => 'success',
        'message'   => 'Backend Laravel menyala dan siap menerima request!',
        'timestamp' => now(),
    ]);
});

// -----------------------------------------------
// Protected routes (butuh Sanctum token)
// -----------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/password', [AuthController::class, 'changePassword']);

    // Dashboard Inventory
    Route::get('/inventory/dashboard', [DashboardController::class, 'index']);

    // Products (Inventory)
    Route::get('/inventory/products/search', [ProductController::class, 'findByCode']);
    Route::get('/inventory/products/import-template', [ProductController::class, 'downloadTemplate']);
    Route::post('/inventory/products/import', [ProductController::class, 'import']);
    Route::apiResource('/inventory/products', ProductController::class);
    Route::get('/products', [ApiProductController::class, 'index']);
    Route::post('/products', [ApiProductController::class, 'store']);

    // Warehouse berada di dalam Inventory
    Route::apiResource('/inventory/warehouses', WarehouseController::class)->except(['show']);
    Route::get('/inventory/warehouses/{warehouse}/locations', [WarehouseController::class, 'locations']);
    Route::get('/inventory/warehouses/{warehouse}/items', [WarehouseController::class, 'items']);
    Route::post('/inventory/warehouses/{warehouse}/locations', [WarehouseController::class, 'storeLocation']);
    Route::get('/inventory/stocks', [InventoryWarehouseController::class, 'stocks']);
    Route::post('/inventory/receive', [InventoryWarehouseController::class, 'receive']);
    Route::post('/inventory/issue', [InventoryWarehouseController::class, 'issue']);
    Route::post('/inventory/transfer', [InventoryWarehouseController::class, 'transfer']);
    Route::get('/inventory/mutations', [InventoryWarehouseController::class, 'mutations']);
    Route::put('/inventory/mutations/{groupKey}', [InventoryWarehouseController::class, 'updateMutation']);
    Route::delete('/inventory/mutations/{groupKey}', [InventoryWarehouseController::class, 'destroyMutation']);
    Route::get('/inventory/stock-opnames', [StockOpnameController::class, 'index']);
    Route::post('/inventory/stock-opnames', [StockOpnameController::class, 'store']);
    Route::post('/inventory/stock-opnames/{stockOpname}/complete', [StockOpnameController::class, 'complete']);

    // Master Data
    // Customers
    Route::get('/customers', [MasterDataController::class, 'getCustomers']);
    Route::post('/customers', [MasterDataController::class, 'storeCustomer']);
    Route::put('/customers/{customer}', [MasterDataController::class, 'updateCustomer']);
    Route::delete('/customers/{customer}', [MasterDataController::class, 'deleteCustomer']);
    Route::get('/customer-part-numbers', [CustomerPartNumberController::class, 'index']);
    Route::get('/customer-part-numbers/import-template', [CustomerPartNumberController::class, 'downloadTemplate']);
    Route::post('/customer-part-numbers/import', [CustomerPartNumberController::class, 'import']);
    Route::get('/customer-part-numbers/export', [CustomerPartNumberController::class, 'export']);
    Route::post('/customer-part-numbers', [CustomerPartNumberController::class, 'store']);
    Route::put('/customer-part-numbers/{id}', [CustomerPartNumberController::class, 'update']);
    Route::delete('/customer-part-numbers/{id}', [CustomerPartNumberController::class, 'destroy']);
    Route::get('/suppliers', [MasterDataController::class, 'suppliers']);
    Route::put('/customers/{id}', [MasterDataController::class, 'updateCustomer']);
    Route::delete('/customers/{id}', [MasterDataController::class, 'deleteCustomer']);

    // Suppliers
    Route::get('/suppliers', [MasterDataController::class, 'getSuppliers']);
    Route::post('/suppliers', [MasterDataController::class, 'storeSupplier']);
    Route::put('/suppliers/{id}', [MasterDataController::class, 'updateSupplier']);
    Route::delete('/suppliers/{id}', [MasterDataController::class, 'deleteSupplier']);

    // Inventory Transactions
    Route::get('/inventory/transactions', [InventoryTransactionController::class, 'index']);
    Route::post('/inventory/transactions', [InventoryTransactionController::class, 'store']);
    Route::post('/inventory/transactions/batch', [InventoryTransactionController::class, 'batch']);

    // Reports dan export CSV (kompatibel dengan Excel)
    Route::get('/inventory/reports/weekly', [ReportController::class, 'weekly']);
    Route::get('/exports/{type}', [ExportController::class, 'csv']);

    // Users & Roles
    Route::put('users/{user}/menu-access', [UserController::class, 'updateMenuAccess']);
    Route::apiResource('users', UserController::class)->except(['show']);
    Route::apiResource('roles', RoleController::class)->except(['show']);

    // Purchase Request dan BOM
    Route::apiResource('/purchase-requests', PurchaseRequestController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::patch('/purchase-requests/{purchaseRequest}/status', [PurchaseRequestController::class, 'updateStatus']);
    Route::apiResource('/boms', BomController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::apiResource('/productions', ProductionController::class)->only(['index', 'store']);

    // --- Existing routes ---
    Route::apiResource('quotations', QuotationController::class);
    Route::get('/sales-orders', [SalesOrderController::class, 'index']);
    Route::post('/sales-orders', [SalesOrderController::class, 'store']);
    Route::get('/sales-orders/{id}', [SalesOrderController::class, 'show']);
    Route::post('/sales-orders/{id}', [SalesOrderController::class, 'storeFromPO']);
    Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
    Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
    Route::get('/delivery-orders/{id}', [DeliveryOrderController::class, 'show']);

    // Invoices (dari SO + DO)
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::put('/invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
    Route::post('/quotations/{id}/convert-to-po', [PurchaseOrderController::class, 'storeFromQuotation']);
    Route::post('/purchase-orders/{id}/convert-to-so', [SalesOrderController::class, 'storeFromPO']);
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::put('/quotations/{id}', [QuotationController::class, 'update']);

    // Current user info
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('sales-returns', SalesReturnController::class);
    Route::apiResource('sales-receipts', SalesReceiptController::class);
    Route::apiResource('receive-items', ReceiveItemController::class);

    Route::get('/commissionings', [CommissioningController::class, 'index']);
    Route::post('/commissionings', [CommissioningController::class, 'store']);
    Route::patch('/commissionings/{id}/status', [CommissioningController::class, 'updateStatus']);
});