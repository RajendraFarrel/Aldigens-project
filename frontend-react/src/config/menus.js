import {
    LayoutDashboard,
    FileText,
    ShoppingCart,
    Users,
    Package,
    ScanLine,
    History,
    BarChart3,
    Truck,
    Receipt,
    PackageMinus,
    Wallet,
    ShoppingBag,
    ClipboardList,
    PackagePlus,
    PackageX,
    CreditCard,
    Factory, // Ikon menu Manufaktur
    ListTree, // Ikon Bill of Materials
    FileCog, // Ikon Work Order
    ArrowUpRight, // Ikon Material Release
    PackageCheck // Ikon Product Result
} from 'lucide-react';

/**
 * Sumber tunggal daftar menu aplikasi.
 * Dipakai oleh Sidebar, kontrol akses admin (UserManagement), dan filter App.
 *
 * - `key`   : id menu yang juga digunakan sebagai `activeTab`.
 * - `label` : teks yang ditampilkan.
 * - `icon`  : komponen ikon (lucide-react).
 * - `admin` : true = hanya untuk role Administrator (tidak bisa dicabut).
 * - `subItems` : array berisi sub-menu (dropdown).
 */

export const MENU_GROUPS = [{
        group: 'Sistem PO',
        items: [
            { key: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
            {
                key: 'purchases-menu',
                label: 'Pembelian (Purchases)',
                icon: ShoppingBag,
                subItems: [
                    { key: 'purchase-requisition', label: 'Permintaan Pembelian (PR)', icon: ClipboardList },
                    { key: 'purchase-order', label: 'Pesanan Pembelian (PO)', icon: ShoppingCart },
                    { key: 'receive-item', label: 'Penerimaan Barang (RI)', icon: PackagePlus },
                    { key: 'purchase-invoice', label: 'Faktur Pembelian (PI)', icon: FileText },
                    { key: 'purchase-return', label: 'Retur Pembelian', icon: PackageX },
                    { key: 'purchase-payment', label: 'Pembayaran Pembelian', icon: CreditCard },
                ],
            },
            {
                key: 'sales-menu',
                label: 'Penjualan (Sales)',
                icon: ShoppingCart,
                subItems: [
                    { key: 'quotation', label: 'Penawaran (Quotation)', icon: FileText },
                    { key: 'sales-order', label: 'Sales Order (SO)', icon: ShoppingCart },
                    { key: 'delivery-order', label: 'Delivery Order (DO)', icon: Truck },
                    { key: 'invoice', label: 'Invoice', icon: Receipt },
                    { key: 'sales-return', label: 'Retur Penjualan (Sales Return)', icon: PackageMinus },
                    { key: 'sales-receipt', label: 'Penerimaan Penjualan (Sales Receipt)', icon: Wallet },
                ],
            },
        ],
    },
    {
        group: 'Pabrikasi',
        items: [{
            key: 'manufactures-menu',
            label: 'Manufaktur',
            icon: Factory,
            subItems: [
                { key: 'bill-of-materials', label: 'Formula Produk (BOM)', icon: ListTree },
                { key: 'work-order', label: 'Perintah Kerja (WO)', icon: FileCog },
                { key: 'material-release', label: 'Pengeluaran Bahan', icon: ArrowUpRight },
                { key: 'product-result', label: 'Hasil Produksi', icon: PackageCheck },
            ],
        }, ]
    },
    {
        group: 'Inventory',
        items: [
            { key: 'inventory-products', label: 'Data Produk', icon: Package },
            { key: 'inventory-scan', label: 'Scanner Barcode', icon: ScanLine },
            { key: 'inventory-transactions', label: 'Riwayat Transaksi', icon: History },
            { key: 'inventory-reports', label: 'Laporan Stok', icon: BarChart3 },
        ],
    },
    {
        group: 'Pengaturan',
        items: [
            { key: 'users', label: 'Pengaturan Sistem', icon: Users, admin: true },
        ],
    },
];

/** Semua key menu dalam bentuk array (termasuk subItems agar role permissions tetap berjalan). */
export const MENU_KEYS = MENU_GROUPS.flatMap((g) =>
    g.items.flatMap((i) =>
        i.subItems ? [i.key, ...i.subItems.map((sub) => sub.key)] : [i.key]
    )
);

/** Menu yang tidak pernah bisa dicabut dari sebuah akun (selalu boleh). */
export const ALWAYS_ALLOWED = ['dashboard'];

/**
 * Hitung daftar menu efektif untuk seorang user berdasarkan role & akses.
 * @param {object|null} user  Objek user { role, menu_access }.
 * @returns {string[]} daftar key menu yang boleh diakses.
 */
export function getAllowedMenus(user) {
    if (!user) return ['dashboard'];

    const isAdmin = user.role === 'Administrator';
    const access = Array.isArray(user.menu_access) ? user.menu_access : null;

    // Administrator tanpa pembatasan eksplisit -> akses semua.
    if (isAdmin && access === null) return [...MENU_KEYS];

    // Selain itu, gunakan daftar menu_access (fallback: semua menu untuk admin,
    // atau menu non-admin default bila kosong).
    const base = access && access.length ? access : (isAdmin ? MENU_KEYS : nonAdminDefault());

    // Administrator selalu dapat mengakses menu pengaturan.
    const merged = new Set(base);
    if (isAdmin) merged.add('users');
    ALWAYS_ALLOWED.forEach((k) => merged.add(k));

    // Jaga agar hanya key yang valid.
    return MENU_KEYS.filter((k) => merged.has(k));
}

/** Menu default untuk staff non-admin (semua kecuali Pengaturan Sistem). */
export function nonAdminDefault() {
    return MENU_KEYS.filter((k) => k !== 'users');
}

export default MENU_GROUPS;