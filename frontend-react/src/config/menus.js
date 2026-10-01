import {
    LayoutDashboard,
    FileText,
    ShoppingCart,
    Users,
    Package,
    Warehouse,
    UsersRound,
    Truck,
    ScanLine,
    History,
    Network,
    ShieldCheck,
    ClipboardList as ActivityLogIcon,
    BarChart3,
    Receipt,
    PackageMinus,
    Wallet,
    ShoppingBag,
    ClipboardList,
    PackagePlus,
    PackageX,
    CreditCard,
    Factory,
    ListTree,
    FileCog,
    ArrowUpRight,
    PackageCheck,
    CheckSquare // <-- Cukup tulis seperti ini saja tanpa komentar di belakangnya
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
                { key: 'production', label: 'Produksi', icon: Factory },
                { key: 'product-result', label: 'Hasil Produksi', icon: PackageCheck },
            ],
        }, ]
    },
    {
        group: 'Inventory',
        items: [{
            key: 'inventory-menu',
            label: 'Inventory',
            icon: Package,
            subItems: [
                { key: 'inventory-products', label: 'Data Part Number', icon: Package },
                { key: 'inventory-warehouses', label: 'Warehouse', icon: Warehouse },
                { key: 'inventory-receive', label: 'Penerimaan Barang', icon: PackagePlus },
                { key: 'inventory-issue', label: 'Pengeluaran Barang', icon: PackageX },
                { key: 'inventory-transfer', label: 'Transfer Lokasi', icon: ArrowUpRight },
                { key: 'inventory-opname', label: 'Stock Opname', icon: ClipboardList },
                { key: 'inventory-scan', label: 'Scanner Barcode', icon: ScanLine },
                { key: 'inventory-transactions', label: 'Riwayat Transaksi', icon: History },
                { key: 'inventory-reports', label: 'Laporan Stok', icon: BarChart3 },
                { key: 'commissioning', label: 'Komisioning & BAST', icon: CheckSquare },
            ],
        }],
    },
    {
        group: 'Master Data',
        items: [{
            key: 'master-data-menu',
            label: 'Master Data',
            icon: UsersRound,
            subItems: [
                { key: 'master-customers', label: 'Customer', icon: UsersRound },
                { key: 'master-suppliers', label: 'Supplier', icon: Truck },
            ],
        }],
    },
    {
        group: 'Network & Security',
        items: [{
            key: 'network-security-menu',
            label: 'Network & Security',
            icon: Network,
            subItems: [
                { key: 'network-monitoring', label: 'Network Monitoring', icon: Network },
                { key: 'security-status', label: 'Security Status', icon: ShieldCheck },
                { key: 'activity-log', label: 'Activity Log', icon: ActivityLogIcon },
            ],
        }],
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