import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
// Import Modul Pembelian
import PurchaseRequisition from './pages/PurchaseRequisition';
import POList from './pages/POList';
import ReceiveItem from './pages/ReceiveItem';
import PurchaseInvoice from './pages/PurchaseInvoice';
import PurchaseReturn from './pages/PurchaseReturn';
import PurchasePayment from './pages/PurchasePayment';
// Import Modul Penjualan
import Quotation from './pages/Quotation';
import SalesOrder from './pages/SalesOrder';
import DeliveryOrder from './pages/DeliveryOrder';
import Invoice from './pages/Invoice';
import SalesReturn from './pages/SalesReturn';
import SalesReceipt from './pages/SalesReceipt';
// Import Modul Manufaktur
import BillOfMaterials from './pages/BillOfMaterials';
import WorkOrder from './pages/WorkOrder';
import MaterialRelease from './pages/MaterialRelease';
import ProductResult from './pages/ProductResult';
// Import Modul Lainnya
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import InventoryProducts from './pages/InventoryProducts';
import InventoryScan from './pages/InventoryScan';
import InventoryTransactions from './pages/InventoryTransactions';
import InventoryReports from './pages/InventoryReports';
import { Menu, Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { useTheme } from './context/ThemeContext';
import { getAllowedMenus } from './config/menus';

const PAGE_TITLES = {
  'dashboard':              'Dashboard Utama',
  // Pembelian
  'purchase-requisition':   'Permintaan Pembelian (PR)',
  'purchase-order':         'Pesanan Pembelian (PO)',
  'receive-item':           'Penerimaan Barang (RI)',
  'purchase-invoice':       'Faktur Pembelian (PI)',
  'purchase-return':        'Retur Pembelian',
  'purchase-payment':       'Pembayaran Pembelian',
  // Penjualan
  'quotation':              'Manajemen Penawaran ',
  'sales-order':            'Manajemen Sales Order',
  'delivery-order':         'Delivery Order (Surat Jalan)',
  'invoice':                'Invoice / Tagihan',
  'sales-return':           'Retur Penjualan (Sales Return)',
  'sales-receipt':          'Penerimaan Penjualan (Sales Receipt)',
  // Manufaktur
  'bill-of-materials':      'Formula Produk (BOM)',
  'work-order':             'Perintah Kerja Produksi',
  'material-release':       'Pengeluaran Bahan Baku',
  'product-result':         'Penerimaan Hasil Produksi',
  // Pengaturan & Inventory
  'users':                  'Pengaturan Sistem',
  'inventory-products':     'Data Produk Inventory',
  'inventory-scan':         'Scanner Barcode',
  'inventory-transactions': 'Riwayat Transaksi Inventory',
  'inventory-reports':      'Laporan Stok Mingguan',
};

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      return null;
    }
  });

  const allowedMenus = getAllowedMenus(currentUser);

  useEffect(() => {
    if (isAuthenticated && !allowedMenus.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    axios.get(`${apiUrl}/ping`)
      .then(response => console.log(response.data))
      .catch(error => console.error(error));

    const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    const handleUserUpdate = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('auth_user') || 'null'));
      } catch {
      }
    };

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:user-updated', handleUserUpdate);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:user-updated', handleUserUpdate);
    };
  }, []);

  const handleLogin = () => {
    try {
      setCurrentUser(JSON.parse(localStorage.getItem('auth_user') || 'null'));
    } catch {
      setCurrentUser(null);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':              return <Dashboard />;
      
      // Modul Pembelian
      case 'purchase-requisition':   return <PurchaseRequisition />;
      case 'purchase-order':         return <POList />;
      case 'receive-item':           return <ReceiveItem />;
      case 'purchase-invoice':       return <PurchaseInvoice />;
      case 'purchase-return':        return <PurchaseReturn />;
      case 'purchase-payment':       return <PurchasePayment />;

      // Modul Penjualan
      case 'quotation':              return <Quotation />;
      case 'sales-order':            return <SalesOrder />;
      case 'delivery-order':         return <DeliveryOrder />;
      case 'invoice':                return <Invoice />;
      case 'sales-return':           return <SalesReturn />;
      case 'sales-receipt':          return <SalesReceipt />;

      // Modul Manufaktur
      case 'bill-of-materials':      return <BillOfMaterials />;
      case 'work-order':             return <WorkOrder />;
      case 'material-release':       return <MaterialRelease />;
      case 'product-result':         return <ProductResult />;
      
      // Modul Pengaturan & Inventory
      case 'users':                  return <UserManagement />;
      case 'inventory-products':     return <InventoryProducts />;
      case 'inventory-scan':         return <InventoryScan />;
      case 'inventory-transactions': return <InventoryTransactions />;
      case 'inventory-reports':      return <InventoryReports />;
      default:                       return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        allowedMenus={allowedMenus}
      />

      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-100 dark:bg-slate-950">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shadow-xs sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {PAGE_TITLES[activeTab] || 'Sistem Terintegrasi'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">PT. Aldigens Putera Persada</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {currentUser && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {currentUser.full_name || currentUser.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser.role}</span>
              </div>
            )}
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
}