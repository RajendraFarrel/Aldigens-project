import {
  LayoutDashboard, FileText, ShoppingCart, Users,
  Package, ScanLine, History, BarChart3, Truck, Receipt,
} from 'lucide-react';

/**
 * Sumber tunggal daftar menu aplikasi.
 * Dipakai oleh Sidebar, kontrol akses admin (UserManagement), dan filter App.
 *
 * - `key`   : id menu yang juga digunakan sebagai `activeTab`.
 * - `label` : teks yang ditampilkan.
 * - `icon`  : komponen ikon (lucide-react).
 * - `admin` : true = hanya untuk role Administrator (tidak bisa dicabut).
 */

export const MENU_GROUPS = [
  {
    group: 'Sistem PO',
    items: [
      { key: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
      { key: 'quotation', label: 'Penawaran (Quotation)', icon: FileText },
      { key: 'purchase-order', label: 'Purchase Order (PO)', icon: FileText },
      { key: 'sales-order', label: 'Sales Order (SO)', icon: ShoppingCart },
      { key: 'delivery-order', label: 'Delivery Order (DO)', icon: Truck },
      { key: 'invoice', label: 'Invoice', icon: Receipt },
    ],
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

/** Semua key menu dalam bentuk array (urut sesuai tampilan). */
export const MENU_KEYS = MENU_GROUPS.flatMap((g) => g.items.map((i) => i.key));

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