<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\DeliveryOrderController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\InvoiceController;

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
    Route::apiResource('/inventory/products', ProductController::class);

    // Inventory Transactions
    Route::get('/inventory/transactions', [InventoryTransactionController::class, 'index']);
    Route::post('/inventory/transactions', [InventoryTransactionController::class, 'store']);
    Route::post('/inventory/transactions/batch', [InventoryTransactionController::class, 'batch']);

    // Reports
    Route::get('/inventory/reports/weekly', [ReportController::class, 'weekly']);

    // Users
    Route::put('users/{user}/menu-access', [UserController::class, 'updateMenuAccess']);
    Route::apiResource('users', UserController::class)->except(['show']);

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
});