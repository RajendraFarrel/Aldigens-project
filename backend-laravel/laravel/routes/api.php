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
use App\Http\Controllers\AccountController;
use App\Http\Controllers\JournalVoucherController;
use App\Http\Controllers\AccountingReportController;
use App\Http\Controllers\CashBankController;
use App\Http\Controllers\CashBankTransactionController;
use App\Http\Controllers\CashBankReportController;
use App\Http\Controllers\PurchaseInvoiceController;
use App\Http\Controllers\PurchasePaymentController;
use App\Http\Controllers\ReceivablePayableController;
// Modul Operasional (SPK) — Step 3A
use App\Http\Controllers\SpkController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\SpkScheduleController;
use App\Http\Controllers\GoodsReceiptController;


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

    // -----------------------------------------------
    // Dashboard Inventory
    // Setiap route WAJIB memiliki middleware permission (AIMS Tahap 1).
    // Modul Sales (quotations, sales-orders, delivery-orders) sengaja TIDAK
    // dikunci karena masih tanggung jawab pengembang modul Sales.
    // -----------------------------------------------
    Route::get('/inventory/dashboard', [DashboardController::class, 'index'])
        ->middleware('permission:inventory.dashboard.view|accounting.dashboard.view');

    // Products (Inventory)
    Route::get('/inventory/products/search', [ProductController::class, 'findByCode'])
        ->middleware('permission:inventory.products.view|inventory.transactions.view');
    Route::get('/inventory/products/import-template', [ProductController::class, 'downloadTemplate'])
        ->middleware('permission:inventory.products.manage');
    Route::post('/inventory/products/import', [ProductController::class, 'import'])
        ->middleware('permission:inventory.products.manage');
    Route::get('/inventory/products', [ProductController::class, 'index'])
        ->middleware('permission:inventory.products.view');
    Route::get('/inventory/products/{inventory_product}', [ProductController::class, 'show'])
        ->middleware('permission:inventory.products.view');
    Route::post('/inventory/products', [ProductController::class, 'store'])
        ->middleware('permission:inventory.products.manage');
    Route::put('/inventory/products/{inventory_product}', [ProductController::class, 'update'])
        ->middleware('permission:inventory.products.manage');
    Route::patch('/inventory/products/{inventory_product}', [ProductController::class, 'update'])
        ->middleware('permission:inventory.products.manage');
    Route::delete('/inventory/products/{inventory_product}', [ProductController::class, 'destroy'])
        ->middleware('permission:inventory.products.manage');
    Route::get('/products', [ApiProductController::class, 'index'])
        ->middleware('permission:inventory.products.view');
    Route::post('/products', [ApiProductController::class, 'store'])
        ->middleware('permission:inventory.products.manage');

    // Goods Receipts (Penerimaan Barang)
    Route::get('/goods-receipts', [GoodsReceiptController::class, 'index'])
        ->middleware('permission:inventory.goods_receipt.view');
    Route::post('/goods-receipts', [GoodsReceiptController::class, 'store'])
        ->middleware('permission:inventory.goods_receipt.post|inventory.goods_receipt.create');

    // Warehouse berada di dalam Inventory
    Route::get('/inventory/warehouses', [WarehouseController::class, 'index'])
        ->middleware('permission:inventory.warehouse.view');
    Route::post('/inventory/warehouses', [WarehouseController::class, 'store'])
        ->middleware('permission:inventory.warehouse.manage');
    Route::put('/inventory/warehouses/{warehouse}', [WarehouseController::class, 'update'])
        ->middleware('permission:inventory.warehouse.manage');
    Route::delete('/inventory/warehouses/{warehouse}', [WarehouseController::class, 'destroy'])
        ->middleware('permission:inventory.warehouse.manage');
    Route::get('/inventory/warehouses/{warehouse}/locations', [WarehouseController::class, 'locations'])
        ->middleware('permission:inventory.warehouse.view');
    Route::get('/inventory/warehouses/{warehouse}/items', [WarehouseController::class, 'items'])
        ->middleware('permission:inventory.warehouse.view');
    Route::post('/inventory/warehouses/{warehouse}/locations', [WarehouseController::class, 'storeLocation'])
        ->middleware('permission:inventory.warehouse.manage');
    Route::get('/inventory/stocks', [InventoryWarehouseController::class, 'stocks'])
        ->middleware('permission:inventory.warehouse.view');
    Route::post('/inventory/receive', [InventoryWarehouseController::class, 'receive'])
        ->middleware('permission:inventory.goods_receipt.post|inventory.goods_receipt.create');
    Route::post('/inventory/issue', [InventoryWarehouseController::class, 'issue'])
        ->middleware('permission:inventory.goods_issue.post|inventory.goods_issue.create');
    Route::post('/inventory/transfer', [InventoryWarehouseController::class, 'transfer'])
        ->middleware('permission:inventory.transfer.post|inventory.transfer.create');
    Route::get('/inventory/mutations', [InventoryWarehouseController::class, 'mutations'])
        ->middleware('permission:inventory.transactions.view');
    Route::put('/inventory/mutations/{groupKey}', [InventoryWarehouseController::class, 'updateMutation'])
        ->middleware('permission:inventory.mutation.update');
    Route::delete('/inventory/mutations/{groupKey}', [InventoryWarehouseController::class, 'destroyMutation'])
        ->middleware('permission:inventory.mutation.delete');
    Route::get('/inventory/stock-opnames', [StockOpnameController::class, 'index'])
        ->middleware('permission:inventory.stock_opname.view');
    Route::post('/inventory/stock-opnames', [StockOpnameController::class, 'store'])
        ->middleware('permission:inventory.stock_opname.create');
    Route::post('/inventory/stock-opnames/{stockOpname}/complete', [StockOpnameController::class, 'complete'])
        ->middleware('permission:inventory.stock_opname.complete');

    // Master Data
    // Customers
    Route::get('/customers', [MasterDataController::class, 'getCustomers'])
        ->middleware('permission:master.customers.view');
    Route::post('/customers', [MasterDataController::class, 'storeCustomer'])
        ->middleware('permission:master.customers.manage');
    Route::put('/customers/{customer}', [MasterDataController::class, 'updateCustomer'])
        ->middleware('permission:master.customers.manage');
    Route::delete('/customers/{customer}', [MasterDataController::class, 'deleteCustomer'])
        ->middleware('permission:master.customers.manage');
    Route::get('/customer-part-numbers', [CustomerPartNumberController::class, 'index'])
        ->middleware('permission:master.customer_part_numbers.view');
    Route::get('/customer-part-numbers/inventory-options', [CustomerPartNumberController::class, 'inventoryProductOptions'])
        ->middleware('permission:master.customer_part_numbers.view|inventory.products.view');
    Route::get('/customer-part-numbers/import-template', [CustomerPartNumberController::class, 'downloadTemplate'])
        ->middleware('permission:master.customer_part_numbers.manage');
    Route::post('/customer-part-numbers/import', [CustomerPartNumberController::class, 'import'])
        ->middleware('permission:master.customer_part_numbers.manage');
    Route::get('/customer-part-numbers/export', [CustomerPartNumberController::class, 'export'])
        ->middleware('permission:master.customer_part_numbers.view');
    Route::post('/customer-part-numbers', [CustomerPartNumberController::class, 'store'])
        ->middleware('permission:master.customer_part_numbers.manage');
    Route::put('/customer-part-numbers/{id}', [CustomerPartNumberController::class, 'update'])
        ->middleware('permission:master.customer_part_numbers.manage');
    Route::delete('/customer-part-numbers/{id}', [CustomerPartNumberController::class, 'destroy'])
        ->middleware('permission:master.customer_part_numbers.manage');

    // Suppliers
    Route::get('/suppliers', [MasterDataController::class, 'getSuppliers'])
        ->middleware('permission:master.suppliers.view');
    Route::post('/suppliers', [MasterDataController::class, 'storeSupplier'])
        ->middleware('permission:master.suppliers.manage');
    Route::put('/suppliers/{id}', [MasterDataController::class, 'updateSupplier'])
        ->middleware('permission:master.suppliers.manage');
    Route::delete('/suppliers/{id}', [MasterDataController::class, 'deleteSupplier'])
        ->middleware('permission:master.suppliers.manage');

    // Inventory Transactions
    Route::get('/inventory/transactions', [InventoryTransactionController::class, 'index'])
        ->middleware('permission:inventory.transactions.view');
    Route::post('/inventory/transactions', [InventoryTransactionController::class, 'store'])
        ->middleware('permission:inventory.transactions.create');
    Route::post('/inventory/transactions/batch', [InventoryTransactionController::class, 'batch'])
        ->middleware('permission:inventory.transactions.create');

    // Reports dan export CSV (kompatibel dengan Excel)
    Route::get('/inventory/reports/weekly', [ReportController::class, 'weekly'])
        ->middleware('permission:inventory.reports.view');
    Route::get('/inventory/reports/period', [ReportController::class, 'period'])
        ->middleware('permission:inventory.reports.view');
    Route::get('/exports/{type}', [ExportController::class, 'csv'])
        ->middleware('permission:inventory.reports.print|master.exports.print');

    // Users & Roles — khusus permission administrasi sistem.
    // Defense-in-depth (Tahap 1.1): middleware permission di route + policy di
    // controller. Route ini TIDAK menyentuh Sales.
    Route::get('/permissions', [RoleController::class, 'permissions'])
        ->middleware('permission:security.roles.view');
    Route::put('users/{user}/menu-access', [UserController::class, 'updateMenuAccess'])
        ->middleware('permission:security.users.manage');
    Route::get('users', [UserController::class, 'index'])
        ->middleware('permission:security.users.view');
    Route::post('users', [UserController::class, 'store'])
        ->middleware('permission:security.users.manage');
    Route::put('users/{user}', [UserController::class, 'update'])
        ->middleware('permission:security.users.manage');
    Route::patch('users/{user}', [UserController::class, 'update'])
        ->middleware('permission:security.users.manage');
    Route::delete('users/{user}', [UserController::class, 'destroy'])
        ->middleware('permission:security.users.manage');

    Route::put('/roles/{role}/permissions', [RoleController::class, 'syncRolePermissions'])
        ->middleware('permission:security.permissions.manage|security.roles.manage');
    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('permission:security.roles.view');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('permission:security.roles.manage');
    Route::put('roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission:security.roles.manage');
    Route::patch('roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission:security.roles.manage');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])
        ->middleware('permission:security.roles.manage');

    // Purchase Request dan BOM → dikelola dengan hak Inventory
    Route::apiResource('/purchase-requests', PurchaseRequestController::class)
        ->only(['index', 'show'])->middleware('permission:inventory.transactions.view');
    Route::post('/purchase-requests', [PurchaseRequestController::class, 'store'])
        ->middleware('permission:inventory.transactions.create');
    Route::put('/purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'update'])
        ->middleware('permission:inventory.transactions.create');
    Route::delete('/purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'destroy'])
        ->middleware('permission:inventory.transactions.create');
    Route::patch('/purchase-requests/{purchaseRequest}/status', [PurchaseRequestController::class, 'updateStatus'])
        ->middleware('permission:inventory.transactions.create');
    Route::apiResource('/boms', BomController::class)
        ->only(['index', 'show'])->middleware('permission:inventory.products.view');
    Route::apiResource('/boms', BomController::class)
        ->only(['store', 'update', 'destroy'])->middleware('permission:inventory.products.manage');
    Route::post('/boms/{bom}/finalize', [BomController::class, 'finalize'])
        ->middleware('permission:inventory.products.manage');
    Route::apiResource('/productions', ProductionController::class)
        ->only(['index', 'store'])->middleware('permission:inventory.products.manage');

    // --- PURCHASE ORDERS & RECEIVE ITEMS ---
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])
        ->middleware('permission:inventory.transactions.create');
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])
        ->middleware('permission:inventory.transactions.view');
    Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update'])
        ->middleware('permission:inventory.transactions.create');
    Route::delete('/purchase-orders/{id}', [PurchaseOrderController::class, 'destroy'])
        ->middleware('permission:inventory.transactions.create');
    Route::post('/purchase-orders/{id}/convert-to-so', [SalesOrderController::class, 'storeFromPO']);

    Route::post('/receive-items', [ReceiveItemController::class, 'store'])
        ->middleware('permission:inventory.goods_receipt.create');
    Route::get('/receive-items', [ReceiveItemController::class, 'index'])
        ->middleware('permission:inventory.goods_receipt.view');
    Route::put('/receive-items/{id}', [ReceiveItemController::class, 'update'])
        ->middleware('permission:inventory.goods_receipt.create');
    Route::delete('/receive-items/{id}', [ReceiveItemController::class, 'destroy'])
        ->middleware('permission:inventory.goods_receipt.create');

    // --- Existing routes (modul Sales — TIDAK dikunci pada Tahap 1) ---
    Route::apiResource('quotations', QuotationController::class);
    Route::get('/sales-orders', [SalesOrderController::class, 'index']);
    Route::post('/sales-orders', [SalesOrderController::class, 'store']);
    Route::get('/sales-orders/{id}', [SalesOrderController::class, 'show']);
    Route::post('/sales-orders/{id}', [SalesOrderController::class, 'storeFromPO']);
    Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
    Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
    Route::get('/delivery-orders/{id}', [DeliveryOrderController::class, 'show']);

    Route::post('/delivery-orders/{id}/approve', [DeliveryOrderController::class, 'approve']);

    // Invoices (dari SO + DO)
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::put('/invoices/{id}', [InvoiceController::class, 'updateStatus']);
    Route::post('/invoices/{id}/post-jurnal', [InvoiceController::class, 'postJurnal']);
    Route::post('/quotations/{id}/convert-to-po', [PurchaseOrderController::class, 'storeFromQuotation']);
    Route::put('/quotations/{id}', [QuotationController::class, 'update']);

    // --- Modul Akuntansi ---
    Route::get('/accounting/accounts', [AccountController::class, 'index'])
        ->middleware('permission:accounting.coa.view');
    Route::post('/accounting/accounts', [AccountController::class, 'store'])
        ->middleware('permission:accounting.coa.create');
    Route::put('/accounting/accounts/{account}', [AccountController::class, 'update'])
        ->middleware('permission:accounting.coa.update');
    Route::patch('/accounting/accounts/{account}/toggle-status', [AccountController::class, 'toggleStatus'])
        ->middleware('permission:accounting.coa.manage');

    Route::get('/accounting/vouchers', [JournalVoucherController::class, 'index'])
        ->middleware('permission:accounting.journal.view');
    Route::post('/accounting/vouchers', [JournalVoucherController::class, 'store'])
        ->middleware('permission:accounting.journal.create');
    Route::get('/accounting/vouchers/{journalVoucher}', [JournalVoucherController::class, 'show'])
        ->middleware('permission:accounting.journal.view');
    Route::put('/accounting/vouchers/{journalVoucher}', [JournalVoucherController::class, 'update'])
        ->middleware('permission:accounting.journal.update');
    Route::delete('/accounting/vouchers/{journalVoucher}', [JournalVoucherController::class, 'destroy'])
        ->middleware('permission:accounting.journal.delete');
    // Posting & reversal = aksi khusus (hak terpisah dari hak baca/buat).
    Route::post('/accounting/vouchers/{journalVoucher}/post', [JournalVoucherController::class, 'post'])
        ->middleware('permission:accounting.journal.post');
    Route::post('/accounting/vouchers/{journalVoucher}/reverse', [JournalVoucherController::class, 'reverse'])
        ->middleware('permission:accounting.journal.reverse');

    // --- Modul Kas & Bank ---
    Route::get('/accounting/cash-banks/akun-tersedia', [CashBankController::class, 'akunTersedia'])
        ->middleware('permission:accounting.cash_bank.view');
    Route::get('/accounting/cash-banks/saldo-awal', [CashBankController::class, 'saldoAwal'])
        ->middleware('permission:accounting.cash_bank.view');
    // Saldo awal = operasi berisiko tinggi, permission khusus.
    Route::put('/accounting/cash-banks/{cashBank}/saldo-awal', [CashBankController::class, 'simpanSaldoAwal'])
        ->middleware('permission:accounting.cash_bank.opening_balance');
    Route::get('/accounting/cash-banks/ringkasan', [CashBankReportController::class, 'ringkasan'])
        ->middleware('permission:accounting.cash_bank.view');
    Route::get('/accounting/cash-banks/mutasi', [CashBankReportController::class, 'mutasi'])
        ->middleware('permission:accounting.cash_bank.view');
    Route::get('/accounting/cash-banks', [CashBankController::class, 'index'])
        ->middleware('permission:accounting.cash_bank.view');
    Route::get('/accounting/cash-banks/{cashBank}', [CashBankController::class, 'show'])
        ->middleware('permission:accounting.cash_bank.view');
    Route::post('/accounting/cash-banks', [CashBankController::class, 'store'])
        ->middleware('permission:accounting.cash_bank.create');
    Route::put('/accounting/cash-banks/{cashBank}', [CashBankController::class, 'update'])
        ->middleware('permission:accounting.cash_bank.update');
    Route::patch('/accounting/cash-banks/{cashBank}', [CashBankController::class, 'update'])
        ->middleware('permission:accounting.cash_bank.update');
    Route::delete('/accounting/cash-banks/{cashBank}', [CashBankController::class, 'destroy'])
        ->middleware('permission:accounting.cash_bank.update');
    Route::patch('/accounting/cash-banks/{cashBank}/toggle-status', [CashBankController::class, 'toggleStatus'])
        ->middleware('permission:accounting.cash_bank.update');

    Route::post('/accounting/cash-bank/penerimaan', [CashBankTransactionController::class, 'penerimaan'])
        ->middleware('permission:accounting.cash_bank.post');
    Route::post('/accounting/cash-bank/pengeluaran', [CashBankTransactionController::class, 'pengeluaran'])
        ->middleware('permission:accounting.cash_bank.post');
    Route::post('/accounting/cash-bank/transfer', [CashBankTransactionController::class, 'transfer'])
        ->middleware('permission:accounting.cash_bank.transfer');

    // --- Modul Utang Piutang ---
    Route::get('/accounting/receivables-payables/ringkasan', [ReceivablePayableController::class, 'ringkasan'])
        ->middleware('permission:accounting.receivables.view|accounting.payables.view');
    Route::get('/accounting/receivables-payables/piutang', [ReceivablePayableController::class, 'piutang'])
        ->middleware('permission:accounting.receivables.view');
    Route::get('/accounting/receivables-payables/utang', [ReceivablePayableController::class, 'utang'])
        ->middleware('permission:accounting.payables.view');
    Route::get('/accounting/receivables-payables/aging', [ReceivablePayableController::class, 'aging'])
        ->middleware('permission:accounting.receivables.view|accounting.payables.view');
    Route::get('/accounting/receivables-payables/master', [ReceivablePayableController::class, 'masterPelanggan'])
        ->middleware('permission:accounting.receivables.view');
    Route::get('/accounting/receivables-payables/penerimaan', [ReceivablePayableController::class, 'indexPenerimaan'])
        ->middleware('permission:accounting.receivables.view');
    Route::post('/accounting/receivables-payables/penerimaan', [ReceivablePayableController::class, 'storePenerimaan'])
        ->middleware('permission:accounting.receivables.receive');
    Route::get('/accounting/receivables-payables/pembayaran', [ReceivablePayableController::class, 'indexPembayaran'])
        ->middleware('permission:accounting.payables.view');
    Route::post('/accounting/receivables-payables/pembayaran', [ReceivablePayableController::class, 'storePembayaran'])
        ->middleware('permission:accounting.payables.pay');

    // Purchase Invoice & Purchase Payment (fungsi keuangan, bukan modul Sales)
    Route::get('/purchase-invoices', [PurchaseInvoiceController::class, 'index'])
        ->middleware('permission:accounting.payables.view');
    Route::post('/purchase-invoices', [PurchaseInvoiceController::class, 'store'])
        ->middleware('permission:accounting.payables.pay');
    Route::get('/purchase-invoices/{purchaseInvoice}', [PurchaseInvoiceController::class, 'show'])
        ->middleware('permission:accounting.payables.view');
    Route::put('/purchase-invoices/{purchaseInvoice}', [PurchaseInvoiceController::class, 'update'])
        ->middleware('permission:accounting.payables.pay');
    Route::delete('/purchase-invoices/{purchaseInvoice}', [PurchaseInvoiceController::class, 'destroy'])
        ->middleware('permission:accounting.payables.pay');
    Route::post('/purchase-invoices/{purchaseInvoice}/post', [PurchaseInvoiceController::class, 'post'])
        ->middleware('permission:accounting.payables.pay');

    Route::get('/purchase-payments', [PurchasePaymentController::class, 'index'])
        ->middleware('permission:accounting.payables.view');
    Route::get('/purchase-payments/{purchase_payment}', [PurchasePaymentController::class, 'show'])
        ->middleware('permission:accounting.payables.view');
    Route::post('/purchase-payments', [PurchasePaymentController::class, 'store'])
        ->middleware('permission:accounting.payables.pay');
    Route::put('/purchase-payments/{purchase_payment}', [PurchasePaymentController::class, 'update'])
        ->middleware('permission:accounting.payables.pay');
    Route::delete('/purchase-payments/{purchase_payment}', [PurchasePaymentController::class, 'destroy'])
        ->middleware('permission:accounting.payables.pay');

    // Laporan akuntansi
    Route::get('/accounting/reports/summary', [AccountingReportController::class, 'summary'])
        ->middleware('permission:accounting.reports.view');
    Route::get('/accounting/reports/journal-umum', [AccountingReportController::class, 'journalUmum'])
        ->middleware('permission:accounting.reports.view');
    Route::get('/accounting/reports/buku-besar', [AccountingReportController::class, 'bukuBesar'])
        ->middleware('permission:accounting.reports.view');
    Route::get('/accounting/reports/neraca-saldo', [AccountingReportController::class, 'neracaSaldo'])
        ->middleware('permission:accounting.reports.view');
    Route::get('/accounting/reports/laba-rugi', [AccountingReportController::class, 'labaRugi'])
        ->middleware('permission:accounting.reports.view');
    Route::get('/accounting/reports/neraca', [AccountingReportController::class, 'neraca'])
        ->middleware('permission:accounting.reports.view');

    // Activity log (read-only, tidak ada route edit/hapus).
    Route::get('/security/activity-logs', [AuthController::class, 'activityLogs'])
        ->middleware('permission:security.activity_logs.view');

    // Current user info
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('sales-returns', SalesReturnController::class);
    Route::apiResource('sales-receipts', SalesReceiptController::class);

    Route::get('/commissionings', [CommissioningController::class, 'index'])
        ->middleware('permission:operational.commissioning.manage');
    Route::post('/commissionings', [CommissioningController::class, 'store'])
        ->middleware('permission:operational.commissioning.manage');
    Route::get('/commissionings/{id}', [CommissioningController::class, 'show'])
        ->middleware('permission:operational.commissioning.manage');
    Route::put('/commissionings/{id}', [CommissioningController::class, 'update'])
        ->middleware('permission:operational.commissioning.manage');
    Route::delete('/commissionings/{id}', [CommissioningController::class, 'destroy'])
        ->middleware('permission:operational.commissioning.manage');
    Route::patch('/commissionings/{id}/status', [CommissioningController::class, 'updateStatus'])
        ->middleware('permission:operational.commissioning.manage');

    // --- Modul Operasional: SPK ---
    Route::get('/spks', [SpkController::class, 'index'])
        ->middleware('permission:operational.spk.view');
    Route::post('/spks', [SpkController::class, 'store'])
        ->middleware('permission:operational.spk.create');
    Route::get('/spks/{id}', [SpkController::class, 'show'])
        ->middleware('permission:operational.spk.view');
    Route::put('/spks/{id}', [SpkController::class, 'update'])
        ->middleware('permission:operational.spk.update');
    Route::patch('/spks/{id}', [SpkController::class, 'update'])
        ->middleware('permission:operational.spk.update');
    Route::delete('/spks/{id}', [SpkController::class, 'destroy'])
        ->middleware('permission:operational.spk.delete');

    // --- Master personel lapangan ---
    Route::get('/employees', [EmployeeController::class, 'index'])
        ->middleware('permission:operational.employee.view');
    Route::get('/employees/{id}', [EmployeeController::class, 'show'])
        ->middleware('permission:operational.employee.view');
    Route::post('/employees', [EmployeeController::class, 'store'])
        ->middleware('permission:operational.employee.manage');
    Route::put('/employees/{id}', [EmployeeController::class, 'update'])
        ->middleware('permission:operational.employee.manage');

    // --- Penjadwalan operasional SPK ---
    Route::patch('/spk-schedules/{id}/status', [SpkScheduleController::class, 'updateStatus'])
        ->middleware('permission:operational.scheduling.manage');
    Route::patch('/spk-schedules/{id}/progress', [SpkScheduleController::class, 'updateProgress'])
        ->middleware('permission:operational.progress.update|operational.scheduling.manage');
    Route::get('/spk-schedules', [SpkScheduleController::class, 'index'])
        ->middleware('permission:operational.scheduling.view');
    Route::get('/spk-schedules/{id}', [SpkScheduleController::class, 'show'])
        ->middleware('permission:operational.scheduling.view');
    Route::post('/spk-schedules', [SpkScheduleController::class, 'store'])
        ->middleware('permission:operational.scheduling.manage');
    Route::put('/spk-schedules/{id}', [SpkScheduleController::class, 'update'])
        ->middleware('permission:operational.scheduling.manage');
    Route::patch('/spk-schedules/{id}', [SpkScheduleController::class, 'update'])
        ->middleware('permission:operational.scheduling.manage');
    Route::delete('/spk-schedules/{id}', [SpkScheduleController::class, 'destroy'])
        ->middleware('permission:operational.scheduling.manage');
});