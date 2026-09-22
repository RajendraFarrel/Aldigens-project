<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\DeliveryOrderController;
use App\Http\Controllers\Api\PurchaseOrderController;




/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rute yang butuh login (Sanctum)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Rute bebas (tidak perlu login) ditaruh di luar
Route::post('/login', [AuthController::class, 'login']);
Route::apiResource('quotations', QuotationController::class);
Route::get('/ping', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Backend Laravel menyala dan siap menerima request!',
        'timestamp' => now()
    ]);
});
Route::get('/sales-orders', [SalesOrderController::class, 'index']);
Route::post('/sales-orders', [SalesOrderController::class, 'store']);
Route::get('/inventories', [InventoryController::class, 'index']);
Route::post('/inventories', [InventoryController::class, 'store']);
Route::get('/inventories/scan/{part_number}', [InventoryController::class, 'showByPartNumber']);
Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
Route::get('/sales-orders/{id}', [SalesOrderController::class, 'show']);
Route::post('/quotations/{id}/convert-to-po', [PurchaseOrderController::class, 'storeFromQuotation']);
Route::post('/purchase-orders/{id}/convert-to-so', [SalesOrderController::class, 'storeFromPO']);
Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
Route::post('/quotations/{id}/convert-to-po', [PurchaseOrderController::class, 'storeFromQuotation']);
Route::put('/quotations/{id}', [QuotationController::class, 'update']);
Route::get('/inventories/scan/{part_number}', [InventoryController::class, 'showByPartNumber']);
Route::post('/inventories/scan/{part_number}/update-stock', [InventoryController::class, 'updateStock']);