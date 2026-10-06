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
import Production from './pages/Production';
// Import Modul Lainnya
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import InventoryProducts from './pages/InventoryProducts';
import Warehouse from './pages/Warehouse';
import InventoryWarehouse from './pages/InventoryWarehouse';
import StockOpname from './pages/StockOpname';
import MasterData from './pages/MasterData';
import InventoryScan from './pages/InventoryScan';
import InventoryTransactions from './pages/InventoryTransactions';
import InventoryReports from './pages/InventoryReports';
import NetworkMonitoring from './pages/NetworkMonitoring';
import SecurityStatus from './pages/SecurityStatus';
import ActivityLog from './pages/ActivityLog';
import Commissioning from './pages/Commissioning';
import SPK from './pages/SPK';
// Import Modul Akuntansi
import ChartOfAccount from './pages/accounting/ChartOfAccount';
import JurnalUmum from './pages/accounting/JurnalUmum';
import JournalVoucherDetail from './pages/accounting/JournalVoucherDetail';
import BukuBesar from './pages/accounting/BukuBesar';
import NeracaSaldo from './pages/accounting/NeracaSaldo';
import JurnalPenyesuaian from './pages/accounting/JurnalPenyesuaian';
import LaporanKeuangan from './pages/accounting/LaporanKeuangan';
import { Menu, Moon, Sun } from 'lucide-react';
import axios from 'axios';
import { useTheme } from './context/ThemeContext';
import { getAllowedMenus } from './config/menus';

const PAGE_TITLES = {
  'dashboard':              'Dashboard Utama',
  // Pembelian
  'purchase-requisition':   'Purchase Requisition',
  'purchase-order':         'Purchase Order',
  'receive-item':           'Receive Item',
  'purchase-invoice':       'Purchase Invoice',
  'purchase-return':        'Purchase Return',
  'purchase-payment':       'Purchase Payment',
  // Penjualan
  'quotation':              'Quotation',
  'sales-order':            'Sales Order',
  'delivery-order':         'Delivery Order (Surat Jalan)',
  'invoice':                'Invoice',
  'sales-return':           'Sales Return',
  'sales-receipt':          'Sales Receipt',
  // Manufaktur
  'bill-of-materials':      'Bill of Materials',
  'work-order':             'Work Order',
  'material-release':       'Material Release',
  'product-result':         'Product Result',
  'production':             'Produksi',
  // Akuntansi
  'accounting-menu':          'Akuntansi',
  'accounting-coa':           'Chart of Account',
  'accounting-journal':       'Jurnal Umum',
  'accounting-voucher-detail':'Detail Journal Voucher',
  'accounting-ledger':        'Buku Besar',
  'accounting-trial-balance': 'Neraca Saldo',
  'accounting-adjustment':    'Jurnal Penyesuaian',
  'accounting-reports':       'Laporan Keuangan',
  // Pengaturan & Inventory
  'users':                  'Pengaturan Sistem',
  'inventory-products':     'Data Part Number Inventory',
  'inventory-warehouses':    'Warehouse Inventory',
  'inventory-receive':       'Penerimaan Barang',
  'inventory-issue':         'Pengeluaran Barang',
  'inventory-transfer':      'Transfer Lokasi',
  'inventory-opname':        'Stock Opname',
  'master-customers':        'Master Customer',
  'master-suppliers':        'Master Supplier',
  'inventory-scan':         'Scanner Barcode',
  'inventory-transactions': 'Riwayat Transaksi Inventory',
  'inventory-reports':      'Laporan Stok Mingguan',
  'network-monitoring':     'Network Monitoring',
  'security-status':        'Security Status',
  'activity-log':           'Activity Log',
  'spk':                        'Surat Perintah Kerja (SPK)',
  'commissioning':              'Komisioning & BAST',
};

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Menu aktif disimpan di localStorage agar tetap di halaman yang sama setelah reload.
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('aldigens_active_tab') || 'dashboard');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      return null;
    }
  });

  const allowedMenus = getAllowedMenus(currentUser);

  useEffect(() => {
    if (isAuthenticated && !allowedMenus.includes(activeTab) && activeTab !== 'accounting-voucher-detail') {
      setActiveTab('dashboard');
    }
  }, [isAuthenticated, currentUser]);

  /* Simpan menu aktif setiap kali berubah supaya reload tidak kembali ke dashboard. */
  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('aldigens_active_tab', activeTab);
  }, [activeTab, isAuthenticated]);

  /* Judul tab browser mengikuti halaman aktif. */
  useEffect(() => {
    const page = PAGE_TITLES[activeTab];
    document.title = page ? `${page} | PT. Aldigens Putera Persada` : 'PT. Aldigens Putera Persada';
  }, [activeTab]);

  /* Navigasi antar-halaman lewat event (dipakai modul Akuntansi). */
  useEffect(() => {
    const handleGoto = (e) => {
      if (e?.detail) setActiveTab(e.detail);
    };
    window.addEventListener('aldigens:goto', handleGoto);
    return () => window.removeEventListener('aldigens:goto', handleGoto);
  }, []);

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
    localStorage.removeItem('aldigens_active_tab');
    setCurrentUser(null);
    setActiveTab('dashboard');
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
      case 'production':             return <Production />;

      // Modul Akuntansi
      case 'accounting-coa':           return <ChartOfAccount />;
      case 'accounting-journal':       return <JurnalUmum />;
      case 'accounting-voucher-detail':return <JournalVoucherDetail />;
      case 'accounting-ledger':        return <BukuBesar />;
      case 'accounting-trial-balance': return <NeracaSaldo />;
      case 'accounting-adjustment':    return <JurnalPenyesuaian />;
      case 'accounting-reports':       return <LaporanKeuangan />;

      // Modul Pengaturan & Inventory
      case 'users':                  return <UserManagement />;
      case 'inventory-products':     return <InventoryProducts />;
      case 'inventory-warehouses':    return <Warehouse />;
      case 'inventory-receive':       return <InventoryWarehouse operation="receive" />;
      case 'inventory-issue':         return <InventoryWarehouse operation="issue" />;
      case 'inventory-transfer':      return <InventoryWarehouse operation="transfer" />;
      case 'inventory-opname':        return <StockOpname />;
      case 'master-customers':        return <MasterData type="customer" />;
      case 'master-suppliers':        return <MasterData type="supplier" />;
      case 'inventory-scan':         return <InventoryScan />;
      case 'inventory-transactions': return <InventoryTransactions />;
      case 'inventory-reports':      return <InventoryReports />;
      case 'network-monitoring':     return <NetworkMonitoring />;
      case 'security-status':        return <SecurityStatus />;
      case 'activity-log':           return <ActivityLog />;
      case 'spk':                        return <SPK />;
      case 'commissioning':              return <Commissioning />;
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