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
    CheckSquare,
    // Modul Akuntansi
    BookMarked,
    NotebookPen,
    BookOpen,
    Scale,
    FileStack,
    FileBarChart
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
        group: 'PO System',
        items: [
            { key: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
            {
                key: 'purchases-menu',
                label: 'Purchases',
                icon: ShoppingBag,
                subItems: [
                    { key: 'purchase-requisition', label: 'Purchase Requisition (PR)', icon: ClipboardList },
                    { key: 'purchase-order', label: 'Purchase Order (PO)', icon: ShoppingCart },
                    { key: 'receive-item', label: 'Receive Item (RI)', icon: PackagePlus },
                    { key: 'purchase-invoice', label: 'Purchase Invoice (PI)', icon: FileText },
                    { key: 'purchase-return', label: 'Purchase Return', icon: PackageX },
                    { key: 'purchase-payment', label: 'Purchase Payment', icon: CreditCard },
                ],
            },
            {
                key: 'sales-menu',
                label: 'Sales',
                icon: ShoppingCart,
                subItems: [
                    { key: 'quotation', label: 'Quotation', icon: FileText },
                    { key: 'sales-order', label: 'Sales Order & Customer PO', icon: ShoppingCart },
                    { key: 'delivery-order', label: 'Delivery Order (DO)', icon: Truck },
                    { key: 'commissioning', label: 'Commissioning & BAST', icon: CheckSquare }, // Tepat di bawah DO
                    { key: 'invoice', label: 'Invoice', icon: Receipt },
                    { key: 'sales-return', label: 'Sales Return', icon: PackageMinus },
                    { key: 'sales-receipt', label: 'Sales Receipt', icon: Wallet },
                ],
            },
        ],
    },
    {
        group: 'Manufacturing',
        items: [{
            key: 'manufactures-menu',
            label: 'Manufacturing',
            icon: Factory,
            subItems: [
                { key: 'bill-of-materials', label: 'Bill of Materials (BOM)', icon: ListTree },
                { key: 'work-order', label: 'Work Order (WO)', icon: FileCog },
                { key: 'material-release', label: 'Material Release', icon: ArrowUpRight },
                { key: 'production', label: 'Production', icon: Factory },
                { key: 'product-result', label: 'Product Result', icon: PackageCheck },
            ],
        }, ]
    },
    {
        group: 'Accounting',
        items: [{
            key: 'accounting-menu',
            label: 'Accounting',
            icon: BookMarked,
            subItems: [
                { key: 'accounting-coa', label: 'Chart of Accounts', icon: BookMarked },
                { key: 'accounting-journal', label: 'General Journal', icon: NotebookPen },
                { key: 'accounting-ledger', label: 'General Ledger', icon: BookOpen },
                { key: 'accounting-trial-balance', label: 'Trial Balance', icon: Scale },
                { key: 'accounting-adjustment', label: 'Adjusting Entries', icon: FileStack },
                { key: 'accounting-reports', label: 'Financial Reports', icon: FileBarChart },
            ],
        }],
    },
    {
        group: 'Inventory',
        items: [{
            key: 'inventory-menu',
            label: 'Inventory',
            icon: Package,
            subItems: [
                { key: 'inventory-products', label: 'Part Number Data', icon: Package },
                { key: 'inventory-warehouses', label: 'Warehouse', icon: Warehouse },
                { key: 'inventory-receive', label: 'Goods Receipt', icon: PackagePlus },
                { key: 'inventory-issue', label: 'Goods Issue', icon: PackageX },
                { key: 'inventory-transfer', label: 'Location Transfer', icon: ArrowUpRight },
                { key: 'inventory-opname', label: 'Stock Opname', icon: ClipboardList },
                { key: 'inventory-scan', label: 'Barcode Scanner', icon: ScanLine },
                { key: 'inventory-transactions', label: 'Transaction History', icon: History },
                { key: 'inventory-reports', label: 'Stock Reports', icon: BarChart3 },
                { key: 'commissioning', label: 'Commissioning & BAST', icon: CheckSquare },
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
                { key: 'master-customers', label: 'Customers', icon: UsersRound },
                { key: 'master-suppliers', label: 'Suppliers', icon: Truck },
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
        group: 'Settings',
        items: [
            { key: 'users', label: 'System Settings', icon: Users, admin: true },
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