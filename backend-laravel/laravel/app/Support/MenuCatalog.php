<?php

namespace App\Support;

/**
 * Katalog key menu — SINKRON dengan frontend-react/src/config/menus.js.
 *
 * Dipakai untuk memvalidasi `menu_access` yang dikirim ke backend. Nilai ini
 * tidak memberi izin API apa pun; permission API tetap diatur PermissionCatalog.
 * Frontend hanya memakainya untuk menampilkan/menyembunyikan menu.
 */
class MenuCatalog
{
    /** [key => permission minimal yang wajib ada, atau null] */
    public const PERMISSION_MAP = [
        // Dashboard umum
        'dashboard'                 => null,

        // Pembelian
        'purchases-menu'            => null,
        'purchase-requisition'      => 'inventory.transactions.view',
        'purchase-order'            => 'inventory.transactions.view',
        'receive-item'              => 'inventory.goods_receipt.view',
        'purchase-invoice'          => 'accounting.payables.view',
        'purchase-return'           => 'inventory.transactions.view',
        'purchase-payment'          => 'accounting.payables.view',

        // Penjualan (menu milik modul Sales — cukup permission view yang dimiliki
        // modul terkait; route Sales sendiri tidak dikunci oleh Tahap 1)
        'sales-menu'                => null,
        'quotation'                 => null,
        'sales-order'               => null,
        'delivery-order'            => null,
        'invoice'                   => 'accounting.receivables.view',
        'sales-return'              => null,
        'sales-receipt'             => null,

        // Manufaktur
        'manufactures-menu'         => null,
        'bill-of-materials'         => 'inventory.products.view',
        'work-order'                => 'inventory.products.view',
        'material-release'          => 'inventory.products.view',
        'production'                => 'inventory.products.view',
        'product-result'            => 'inventory.products.view',

        // Inventory
        'inventory-menu'            => null,
        'inventory-products'        => 'inventory.products.view',
        'inventory-warehouses'      => 'inventory.warehouse.view',
        'inventory-receive'         => 'inventory.goods_receipt.view',
        'inventory-issue'           => 'inventory.goods_issue.view',
        'inventory-transfer'        => 'inventory.transfer.view',
        'inventory-opname'          => 'inventory.stock_opname.view',
        'inventory-scan'            => 'inventory.stock_opname.view',
        'inventory-transactions'    => 'inventory.transactions.view',
        'inventory-reports'         => 'inventory.reports.view',
        'commissioning'             => 'operational.commissioning.manage',

        // Master Data
        'master-data-menu'          => null,
        'master-customers'          => 'master.customers.view',
        'master-suppliers'          => 'master.suppliers.view',

        // Akuntansi
        'accounting-menu'           => null,
        'accounting-coa'            => 'accounting.coa.view',
        'accounting-cash-bank'      => 'accounting.cash_bank.view',
        'accounting-receivables-payables' => 'accounting.receivables.view',
        'accounting-journal'        => 'accounting.journal.view',
        'accounting-ledger'         => 'accounting.reports.view',
        'accounting-trial-balance'  => 'accounting.reports.view',
        'accounting-adjustment'     => 'accounting.journal.view',
        'accounting-reports'        => 'accounting.reports.view',

        // Operasional
        'operasional-menu'          => null,
        'spk'                       => 'operational.spk.view',
        'scheduling'                => 'operational.scheduling.view',

        // Network & Security
        'network-security-menu'     => null,
        'network-monitoring'        => 'security.network_monitoring.view',
        'security-status'           => 'security.dashboard.view',
        'activity-log'              => 'security.activity_logs.view',

        // Pengaturan
        'users'                     => 'security.users.manage',
    ];

    /** @return string[] */
    public static function keys(): array
    {
        return array_keys(self::PERMISSION_MAP);
    }

    public static function isValid(string $key): bool
    {
        return array_key_exists($key, self::PERMISSION_MAP);
    }

    public static function permissionFor(string $key): ?string
    {
        return self::PERMISSION_MAP[$key] ?? null;
    }
}
