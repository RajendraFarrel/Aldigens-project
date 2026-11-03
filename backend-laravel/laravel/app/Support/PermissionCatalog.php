<?php

namespace App\Support;

/**
 * Katalog permission granular AIMS.
 *
 * Satu-satunya sumber kebenaran daftar permission. Dipakai oleh:
 *  - Seeder (mengisi tabel permissions & role_permissions),
 *  - Model\Permission (fallback bila tabel belum dimigrasi),
 *  - Controller Role (validasi permission yang dikirim frontend),
 *  - Endpoint /me (frontend memakai daftar ini untuk tampilan).
 *
 * CATATAN SCOPE: permission Sales sengaja TIDAK ditambahkan di sini karena
 * modul tersebut milik pengembang lain dan route-nya tidak dikunci.
 */
class PermissionCatalog
{
    /**
     * [kode permission => deskripsi]
     *
     * @return array<string,string>
     */
    public static function all(): array
    {
        $catalog = [];

        // ---------------- Accounting ----------------
        $accounting = [
            'accounting.dashboard.view'        => 'Melihat dashboard akuntansi',
            'accounting.coa.view'              => 'Melihat Chart of Accounts',
            'accounting.coa.create'            => 'Menambah akun COA',
            'accounting.coa.update'            => 'Mengubah akun COA',
            'accounting.coa.manage'            => 'Mengaktifkan/menonaktifkan akun COA',
            'accounting.cash_bank.view'        => 'Melihat master Kas & Bank',
            'accounting.cash_bank.create'      => 'Menambah Kas & Bank',
            'accounting.cash_bank.update'      => 'Mengubah Kas & Bank',
            'accounting.cash_bank.post'        => 'Mencatat penerimaan/pengeluaran Kas & Bank',
            'accounting.cash_bank.transfer'    => 'Transfer antar Kas & Bank',
            'accounting.cash_bank.opening_balance' => 'Mengubah saldo awal Kas & Bank',
            'accounting.receivables.view'      => 'Melihat piutang',
            'accounting.receivables.receive'   => 'Mencatat penerimaan piutang',
            'accounting.payables.view'         => 'Melihat utang',
            'accounting.payables.pay'          => 'Mencatat pembayaran utang',
            'accounting.journal.view'          => 'Melihat Journal Voucher',
            'accounting.journal.create'        => 'Membuat Journal Voucher',
            'accounting.journal.update'        => 'Mengubah Journal Voucher draft',
            'accounting.journal.delete'        => 'Menghapus Journal Voucher draft',
            'accounting.journal.post'          => 'Posting Journal Voucher',
            'accounting.journal.reverse'       => 'Reversal Journal Voucher',
            'accounting.reports.view'          => 'Melihat laporan keuangan',
            'accounting.reports.print'         => 'Mencetak/mengekspor laporan keuangan',
        ];

        // ---------------- Inventory ----------------
        $inventory = [
            'inventory.dashboard.view'         => 'Melihat dashboard inventory',
            'inventory.products.view'          => 'Melihat data part number/produk',
            'inventory.products.manage'        => 'Mengelola data produk (termasuk import)',
            'inventory.warehouse.view'         => 'Melihat gudang, lokasi, dan stok',
            'inventory.warehouse.manage'       => 'Mengelola master gudang dan lokasi',
            'inventory.goods_receipt.view'     => 'Melihat penerimaan barang',
            'inventory.goods_receipt.create'   => 'Membuat penerimaan barang',
            'inventory.goods_receipt.post'     => 'Posting penerimaan barang',
            'inventory.goods_issue.view'       => 'Melihat pengeluaran barang',
            'inventory.goods_issue.create'     => 'Membuat pengeluaran barang',
            'inventory.goods_issue.post'       => 'Posting pengeluaran barang',
            'inventory.transfer.view'          => 'Melihat transfer lokasi',
            'inventory.transfer.create'        => 'Membuat transfer lokasi',
            'inventory.transfer.post'          => 'Posting transfer lokasi',
            'inventory.mutation.update'        => 'Mengoreksi mutasi stok yang sudah tercatat',
            'inventory.mutation.delete'        => 'Menghapus/koreksi mutasi stok',
            'inventory.stock_opname.view'      => 'Melihat Stock Opname',
            'inventory.stock_opname.create'    => 'Membuat Stock Opname',
            'inventory.stock_opname.complete'  => 'Menyelesaikan Stock Opname',
            'inventory.transactions.view'      => 'Melihat riwayat transaksi inventory',
            'inventory.transactions.create'    => 'Mencatat transaksi stok manual',
            'inventory.reports.view'           => 'Melihat laporan stok',
            'inventory.reports.print'          => 'Mencetak/mengekspor laporan stok',
        ];

        // ---------------- Master Data ----------------
        $master = [
            'master.customers.view'                 => 'Melihat data customer',
            'master.customers.manage'               => 'Mengelola data customer',
            'master.suppliers.view'                 => 'Melihat data supplier',
            'master.suppliers.manage'               => 'Mengelola data supplier',
            'master.customer_part_numbers.view'     => 'Melihat customer part number',
            'master.customer_part_numbers.manage'   => 'Mengelola customer part number (termasuk import/export)',
            'master.exports.print'                  => 'Mengekspor data master',
        ];

        // ---------------- Operasional ----------------
        $operational = [
            'operational.dashboard.view'            => 'Melihat dashboard operasional',
            'operational.spk.view'                  => 'Melihat SPK',
            'operational.spk.create'                => 'Membuat SPK',
            'operational.spk.update'                => 'Mengubah SPK',
            'operational.spk.delete'                => 'Menghapus/membatalkan SPK',
            'operational.employee.view'             => 'Melihat data karyawan lapangan',
            'operational.employee.manage'           => 'Mengelola data karyawan lapangan',
            'operational.scheduling.view'           => 'Melihat penjadwalan',
            'operational.scheduling.manage'         => 'Mengelola penjadwalan & assignment',
            'operational.progress.update'           => 'Memperbarui progress pekerjaan',
            'operational.commissioning.manage'      => 'Mengelola Commissioning & BAST',
        ];

        // ---------------- Network & Security ----------------
        $security = [
            'security.dashboard.view'         => 'Melihat Security Status',
            'security.network_monitoring.view' => 'Melihat Network Monitoring',
            'security.activity_logs.view'     => 'Melihat Activity Log',
            'security.users.view'             => 'Melihat data pengguna',
            'security.users.manage'           => 'Mengelola pengguna & hak akses menu',
            'security.roles.view'             => 'Melihat role',
            'security.roles.manage'           => 'Mengelola role & mapping permission',
            'security.permissions.manage'     => 'Mengelola permission',
        ];

        foreach ([$accounting, $inventory, $master, $operational, $security] as $group) {
            $catalog += $group;
        }

        return $catalog;
    }

    /** @return string[] */
    public static function codes(): array
    {
        return array_keys(self::all());
    }

    public static function exists(string $code): bool
    {
        return array_key_exists($code, self::all());
    }

    /**
     * Semua permission yang dimiliki role Administrator.
     * Administrator selalu mendapat seluruh katalog — tidak bisa terkunci.
     *
     * @return string[]
     */
    public static function adminPermissions(): array
    {
        return self::codes();
    }

    /** Permission untuk peran Administrator yang dibatasi ke modul security. */
    public static function securityAdminPermissions(): array
    {
        return array_values(array_filter(
            self::codes(),
            fn($code) => str_starts_with($code, 'security.')
        ));
    }

    /**
     * Rancangan mapping role -> permission.
     * Hanya berlaku untuk role yang SUDAH ADA di database (seeder memfilter),
     * sehingga tidak pernah membuat role baru secara otomatis.
     *
     * @return array<string,string[]>
     */
    public static function roleMapping(): array
    {
        $acctView = [
            'accounting.dashboard.view',
            'accounting.coa.view',
            'accounting.cash_bank.view',
            'accounting.receivables.view',
            'accounting.payables.view',
            'accounting.journal.view',
            'accounting.reports.view',
        ];

        $invView = [
            'inventory.dashboard.view',
            'inventory.products.view',
            'inventory.warehouse.view',
            'inventory.goods_receipt.view',
            'inventory.goods_issue.view',
            'inventory.transfer.view',
            'inventory.stock_opname.view',
            'inventory.transactions.view',
            'inventory.reports.view',
        ];

        return [
            // Administrator: seluruh katalog (tidak bisa terkunci).
            'Administrator' => self::adminPermissions(),

            // Staff Gudang (role sistem existing): operasional gudang, tanpa
            // perubahan nilai/opening balance, tanpa akses akuntansi.
            'Staff Gudang' => array_merge($invView, [
                'inventory.products.manage',
                'inventory.warehouse.manage',
                'inventory.goods_receipt.create',
                'inventory.goods_receipt.post',
                'inventory.goods_issue.create',
                'inventory.goods_issue.post',
                'inventory.transfer.create',
                'inventory.transfer.post',
                'inventory.stock_opname.create',
                'inventory.stock_opname.complete',
                'inventory.reports.print',
                'master.customers.view',
                'master.suppliers.view',
                'master.customer_part_numbers.view',
                'master.customer_part_numbers.manage',
                'operational.commissioning.manage',
            ]),

            // Finance: Accounting + fungsi keuangan terkait.
            'Finance' => array_merge($acctView, [
                'accounting.coa.create',
                'accounting.coa.update',
                'accounting.coa.manage',
                'accounting.cash_bank.create',
                'accounting.cash_bank.update',
                'accounting.cash_bank.post',
                'accounting.cash_bank.transfer',
                'accounting.receivables.receive',
                'accounting.payables.pay',
                'accounting.journal.create',
                'accounting.journal.update',
                'accounting.journal.delete',
                'accounting.reports.print',
                'master.customers.view',
                'master.suppliers.view',
                'inventory.products.view',
            ]),

            // Supervisor Operasional.
            'Supervisor Operasional' => [
                'operational.dashboard.view',
                'operational.spk.view',
                'operational.spk.create',
                'operational.spk.update',
                'operational.employee.view',
                'operational.scheduling.view',
                'operational.scheduling.manage',
                'operational.progress.update',
                'operational.commissioning.manage',
                'inventory.products.view',
                'inventory.warehouse.view',
                'master.customers.view',
                'master.suppliers.view',
            ],

            // Staff Operasional.
            'Staff Operasional' => [
                'operational.dashboard.view',
                'operational.spk.view',
                'operational.scheduling.view',
                'operational.progress.update',
                'inventory.products.view',
            ],

            // EHS.
            'EHS' => [
                'operational.dashboard.view',
                'operational.spk.view',
                'operational.scheduling.view',
                'operational.progress.update',
            ],

            // Management: dashboard & laporan (read-only).
            'Management' => array_merge($acctView, $invView, [
                'accounting.reports.print',
                'inventory.reports.print',
                'master.customers.view',
                'master.suppliers.view',
                'master.customer_part_numbers.view',
                'operational.dashboard.view',
                'operational.spk.view',
                'operational.scheduling.view',
            ]),

            // Security / IT Administrator: modul Network & Security.
            'Security Admin' => self::securityAdminPermissions(),
        ];
    }
}
