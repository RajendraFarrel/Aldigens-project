import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import {
  Wallet, ArrowDownRight, ArrowUpRight, RefreshCw, PlusCircle, X,
  Car, Bike, Package, FileText, AlertTriangle, Wrench, ShieldAlert,
  Navigation, CheckCircle2, Plus, Trash2, TrendingUp, ShoppingCart, Pencil,
} from 'lucide-react';
import { swalSuccess, swalError } from '../utils/swal';

const FLEET_STORAGE_KEY = 'aldigens_fleet_assets';
const PR_QUEUE_KEY = 'aldigens_pr_draft_queue';
const PRODUCTS_CACHE_KEY = 'aldigens_products_cache';

const DEFAULT_FLEET = [
  {
    id: 'flt-1',
    plate_number: 'B 9124 UXT',
    name: 'Mitsubishi L300 Box',
    type: 'Mobil',
    driver: 'Agus Supriyanto',
    status: 'Sedang Jalan',
    assignment: 'Pengiriman DO ke Cikarang',
    tax_due_date: '2026-12-05',
    service_due_date: '2026-11-28',
  },
  {
    id: 'flt-2',
    plate_number: 'B 1842 KLA',
    name: 'Toyota Avanza Operasional',
    type: 'Mobil',
    driver: 'Rudi Hartono',
    status: 'Standby',
    assignment: 'Kantor Bekasi',
    tax_due_date: '2027-03-14',
    service_due_date: '2026-12-20',
  },
  {
    id: 'flt-3',
    plate_number: 'B 4519 TQR',
    name: 'Honda Vario 125 Teknisi',
    type: 'Motor',
    driver: 'Dedi Kurniawan',
    status: 'Sedang Jalan',
    assignment: 'Kunjungan Teknisi Lapangan',
    tax_due_date: '2026-11-25',
    service_due_date: '2026-12-10',
  },
  {
    id: 'flt-4',
    plate_number: 'B 6210 WMN',
    name: 'Yamaha R15 / Operasional',
    type: 'Motor',
    driver: 'Fajar Pratama',
    status: 'Servis',
    assignment: 'Ganti Oli & Kampas Rem',
    tax_due_date: '2027-01-19',
    service_due_date: '2026-11-18',
  },
];

const EMPTY_FLEET_FORM = {
  plate_number: '',
  name: '',
  type: 'Mobil',
  driver: '',
  status: 'Standby',
  assignment: '',
  tax_due_date: '',
  service_due_date: '',
};

const DEFAULT_MUTATIONS = [
  {
    id: 'def-1',
    ref: 'BKM-2611001',
    date: '2026-11-26',
    description: 'Pelunasan Invoice PT United Tractors',
    account: 'Bank Permata (070.224.339-4)',
    type: 'IN',
    amount: 25500000,
  },
  {
    id: 'def-2',
    ref: 'BKK-2611002',
    date: '2026-11-25',
    description: 'Pembayaran Pembelian Material Toko Garda',
    account: 'Bank Permata (070.224.339-4)',
    type: 'OUT',
    amount: 8400000,
  },
];

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(String(dateStr).slice(0, 10));
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export default function Dashboard() {
  const [summary, setSummary] = useState({
    total_cash_modal: 145500000,
    total_cash_in: 35200000,
    total_cash_out: 12800000,
  });
  const [mutations, setMutations] = useState(DEFAULT_MUTATIONS);

  // Cache produk instan agar daftar stok menipis langsung tampil (0 detik)
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // abaikan error parse cache
    }
    return [];
  });

  const [invoices, setInvoices] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]');
    } catch {
      return [];
    }
  });
  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
    } catch {
      return [];
    }
  });
  const [workOrders, setWorkOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aldigens_work_orders') || '[]');
    } catch {
      return [];
    }
  });

  const [fleet, setFleet] = useState(() => {
    try {
      const saved = localStorage.getItem(FLEET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // abaikan error parse
    }
    return DEFAULT_FLEET;
  });
  const [fleetFilter, setFleetFilter] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [editingFleetId, setEditingFleetId] = useState(null);

  const [formData, setFormData] = useState({
    type: 'IN',
    ref_number: 'BKM-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toISOString().split('T')[0],
    account: 'Bank Permata (070.224.339-4)',
    contact_name: '',
    amount: '',
    description: '',
  });

  const [fleetForm, setFleetForm] = useState(EMPTY_FLEET_FORM);

  const saveFleet = useCallback((nextFleet) => {
    setFleet(nextFleet);
    try {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(nextFleet));
    } catch {
      // abaikan error storage
    }
  }, []);

  const fetchDashboardData = useCallback(() => {
    setLoading(true);

    // 1. Produk & Stok
    api.get('/products')
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setProducts(list);
          try {
            localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(list));
          } catch {
            // abaikan jika kuota penuh
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 2. Keuangan & Sinkronisasi Mutasi dari Sales Receipt / Purchase Payment
    Promise.allSettled([
      api.get('/dashboard-financials'),
      api.get('/sales-receipts'),
      api.get('/purchase-payments'),
    ]).then(([finRes, srRes, ppRes]) => {
      let baseSummary = {
        total_cash_modal: 145500000,
        total_cash_in: 35200000,
        total_cash_out: 12800000,
      };
      let apiMutations = [];

      if (finRes.status === 'fulfilled' && finRes.value.data) {
        if (finRes.value.data.summary) baseSummary = finRes.value.data.summary;
        if (Array.isArray(finRes.value.data.mutations)) apiMutations = finRes.value.data.mutations;
      }

      const apiReceipts = srRes.status === 'fulfilled' ? (srRes.value.data?.data || srRes.value.data || []) : [];
      const localReceipts = JSON.parse(localStorage.getItem('aldigens_sales_receipts') || '[]');
      const allReceipts = [...(Array.isArray(apiReceipts) ? apiReceipts : []), ...localReceipts];

      const apiPayments = ppRes.status === 'fulfilled' ? (ppRes.value.data?.data || ppRes.value.data || []) : [];
      const localPayments = JSON.parse(localStorage.getItem('aldigens_purchase_payments') || '[]');
      const allPayments = [...(Array.isArray(apiPayments) ? apiPayments : []), ...localPayments];

      const receiptMutations = allReceipts.map((r, idx) => ({
        id: `sr-${r.id || r.receipt_number || idx}`,
        ref: r.receipt_number || r.reference_number || `SR-${idx + 1}`,
        date: String(r.payment_date || r.date || '2026-11-26').slice(0, 10),
        description: `Penerimaan Pelunasan ${r.customer_name || r.invoice_number || 'Customer'}`,
        account: r.payment_method || r.bank_account || 'Bank Permata (070.224.339-4)',
        type: 'IN',
        amount: Number(r.amount || r.total_paid || 0),
      })).filter((m) => m.amount > 0);

      const paymentMutations = allPayments.map((p, idx) => ({
        id: `pp-${p.id || p.payment_number || idx}`,
        ref: p.payment_number || p.reference_number || `PP-${idx + 1}`,
        date: String(p.payment_date || p.date || '2026-11-26').slice(0, 10),
        description: `Pembayaran Supplier ${p.supplier_name || p.po_number || 'Vendor'}`,
        account: p.payment_method || p.bank_account || 'Bank Permata (070.224.339-4)',
        type: 'OUT',
        amount: Number(p.amount || p.total_paid || 0),
      })).filter((m) => m.amount > 0);

      const extraIn = receiptMutations.reduce((s, m) => s + m.amount, 0);
      const extraOut = paymentMutations.reduce((s, m) => s + m.amount, 0);

      setSummary({
        total_cash_modal: Number(baseSummary.total_cash_modal || 0) + extraIn - extraOut,
        total_cash_in: Number(baseSummary.total_cash_in || 0) + extraIn,
        total_cash_out: Number(baseSummary.total_cash_out || 0) + extraOut,
      });

      const mergedMutations = [...receiptMutations, ...paymentMutations, ...apiMutations];
      setMutations(mergedMutations.length > 0 ? mergedMutations.slice(0, 10) : DEFAULT_MUTATIONS);
    });

    // 3. Invoices
    api.get('/invoices')
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setInvoices(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    // 4. Delivery Orders
    api.get('/delivery-orders')
      .then((res) => {
        const apiDOs = res.data?.data || res.data || [];
        const localDOs = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]');
        const map = new Map();
        localDOs.forEach((d) => map.set(d.do_number || d.id, d));
        (Array.isArray(apiDOs) ? apiDOs : []).forEach((d) => map.set(d.do_number || d.id, d));
        setDeliveryOrders(Array.from(map.values()));
      })
      .catch(() => {
        setDeliveryOrders(JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]'));
      });

    // 5. Purchase Orders
    api.get('/purchase-orders')
      .then((res) => {
        const apiPOs = res.data?.data || res.data || [];
        const localPOs = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
        const map = new Map();
        localPOs.forEach((p) => map.set(p.po_number || p.id, p));
        (Array.isArray(apiPOs) ? apiPOs : []).forEach((p) => map.set(p.po_number || p.id, p));
        setPurchaseOrders(Array.from(map.values()));
      })
      .catch(() => {
        setPurchaseOrders(JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]'));
      });

    // 6. Work Orders (Manufaktur) - ambil langsung dari localStorage agar bebas 404
    try {
      const localWOs = JSON.parse(localStorage.getItem('aldigens_work_orders') || '[]');
      setWorkOrders(Array.isArray(localWOs) ? localWOs : []);
    } catch {
      setWorkOrders([]);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Kirim 1 atau beberapa item kritis ke antrean Purchase Requisition tanpa reload
  const handleRequestPR = (itemsToOrder, remarksText = '') => {
    const queuePayload = {
      source: 'Dashboard Gudang / Inventory',
      department: 'Inventory & Gudang',
      remarks: remarksText || 'Pengajuan restock barang menipis/habis dari Dashboard',
      items: itemsToOrder.map((p) => {
        const minStk = Number(p.minimum_stock ?? p.min_stock ?? 5);
        const curStk = Number(p.stock || 0);
        const suggestedQty = Math.max(minStk > 0 ? minStk * 2 - curStk : 10, 1);
        return {
          productId: p.id,
          part_number: p.part_number || p.product_code || '',
          name: p.name || p.description || '',
          unit: p.unit || 'PCS',
          quantity: suggestedQty,
        };
      }),
    };
    localStorage.setItem(PR_QUEUE_KEY, JSON.stringify(queuePayload));
    localStorage.setItem('aldigens_active_tab', 'purchase-requisition');
    window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'purchase-requisition' }));
  };

  const fleetStats = useMemo(() => {
    const mobilCount = fleet.filter((f) => f.type === 'Mobil').length;
    const motorCount = fleet.filter((f) => f.type === 'Motor').length;
    const standbyCount = fleet.filter((f) => f.status === 'Standby').length;
    const onDutyCount = fleet.filter((f) => f.status === 'Sedang Jalan').length;
    const serviceCount = fleet.filter((f) => f.status === 'Servis').length;

    const alerts = fleet
      .map((item) => {
        const taxDays = daysUntil(item.tax_due_date);
        const srvDays = daysUntil(item.service_due_date);
        return { ...item, taxDays, srvDays };
      })
      .filter((item) => (item.taxDays !== null && item.taxDays <= 30) || (item.srvDays !== null && item.srvDays <= 14));

    return {
      total: fleet.length,
      mobilCount,
      motorCount,
      standbyCount,
      onDutyCount,
      serviceCount,
      alerts,
    };
  }, [fleet]);

  const filteredFleet = useMemo(() => {
    if (fleetFilter === 'ALL') return fleet;
    return fleet.filter((f) => f.type === fleetFilter);
  }, [fleet, fleetFilter]);

  const inventoryStats = useMemo(() => {
    const totalSku = products.length;
    const totalQty = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const lowStockItems = products
      .filter((p) => Number(p.stock || 0) <= Number(p.minimum_stock ?? p.min_stock ?? 5))
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

    return { totalSku, totalQty, lowStockItems };
  }, [products]);

  const salesStats = useMemo(() => {
    const totalInvoiceValue = invoices.reduce((sum, inv) => {
      const grand = Number(inv.grand_total ?? inv.total_amount ?? 0);
      if (grand > 0) return sum + grand;
      const itemsSum = (inv.items || []).reduce(
        (s, it) => s + Number(it.qty || 0) * Number(it.unit_price || it.price || 0) * 1.11,
        0
      );
      return sum + itemsSum;
    }, 0);
    const unpaidCount = invoices.filter((inv) => (inv.status || 'Unpaid') !== 'Paid').length;
    const activeWoCount = workOrders.filter((w) => !['Completed', 'Selesai', 'Done'].includes(w.status)).length;
    return {
      totalInvoiceValue,
      unpaidCount,
      doCount: deliveryOrders.length,
      poCount: purchaseOrders.length,
      woCount: workOrders.length,
      activeWoCount,
    };
  }, [invoices, deliveryOrders, purchaseOrders, workOrders]);

  const handleTypeChange = (newType) => {
    const prefix = newType === 'IN' ? 'BKM-' : 'BKK-';
    setFormData({
      ...formData,
      type: newType,
      ref_number: prefix + Math.floor(100000 + Math.random() * 900000),
    });
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        transaction_type: formData.type,
        reference_number: formData.ref_number,
        date: formData.date,
        bank_account: formData.account,
        contact_name: formData.contact_name,
        amount: Number(formData.amount),
        description: formData.description,
      };

      await api.post('/financial-mutations', payload);
      swalSuccess('Berhasil', 'Transaksi kas berhasil dicatat!');
      setIsInputModalOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Gagal menyimpan mutasi kas:', error);
      swalError('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan transaksi.');
    }
  };

  const openAddFleetModal = () => {
    setEditingFleetId(null);
    setFleetForm(EMPTY_FLEET_FORM);
    setIsFleetModalOpen(true);
  };

  const openEditFleetModal = (item) => {
    setEditingFleetId(item.id);
    setFleetForm({
      plate_number: item.plate_number || '',
      name: item.name || '',
      type: item.type || 'Mobil',
      driver: item.driver || '',
      status: item.status || 'Standby',
      assignment: item.assignment || '',
      tax_due_date: item.tax_due_date || '',
      service_due_date: item.service_due_date || '',
    });
    setIsFleetModalOpen(true);
  };

  const closeFleetModal = () => {
    setIsFleetModalOpen(false);
    setEditingFleetId(null);
    setFleetForm(EMPTY_FLEET_FORM);
  };

  const handleSaveFleet = (e) => {
    e.preventDefault();
    const normalizedPlate = fleetForm.plate_number.toUpperCase().trim();

    if (editingFleetId) {
      const updated = fleet.map((f) =>
        f.id === editingFleetId
          ? { ...f, ...fleetForm, plate_number: normalizedPlate }
          : f
      );
      saveFleet(updated);
      swalSuccess('Armada Diperbarui', `Data ${normalizedPlate} (${fleetForm.name}) berhasil diubah.`);
    } else {
      const newAsset = {
        ...fleetForm,
        id: `flt-${Date.now()}`,
        plate_number: normalizedPlate,
      };
      saveFleet([newAsset, ...fleet]);
      swalSuccess('Armada Ditambahkan', `${newAsset.plate_number} (${newAsset.name}) berhasil dicatat.`);
    }

    closeFleetModal();
  };

  const handleCycleFleetStatus = (item) => {
    const order = ['Standby', 'Sedang Jalan', 'Servis'];
    const nextStatus = order[(order.indexOf(item.status) + 1) % order.length];
    const updated = fleet.map((f) => (f.id === item.id ? { ...f, status: nextStatus } : f));
    saveFleet(updated);
  };

  const handleDeleteFleet = (item) => {
    if (!window.confirm(`Hapus kendaraan ${item.plate_number} (${item.name}) dari daftar aset berjalan?`)) return;
    const updated = fleet.filter((f) => f.id !== item.id);
    saveFleet(updated);
  };

  const fleetStatusStyle = (status) => {
    if (status === 'Standby') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'Sedang Jalan') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  const maxChartVal = Math.max(
    Number(summary.total_cash_in || 0),
    Number(summary.total_cash_out || 0),
    Number(salesStats.totalInvoiceValue || 0),
    1
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Operasional &amp; Keuangan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PT. Aldigens Putera Persada &bull; Pemantauan Kas, Stok Gudang, Penjualan &amp; Aset Berjalan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openAddFleetModal}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition cursor-pointer"
          >
            <Car className="h-4 w-4 text-sky-400" />
            <span>+ Armada</span>
          </button>
          <button
            onClick={() => setIsInputModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Input Kas Masuk / Keluar</span>
          </button>
          <button
            onClick={fetchDashboardData}
            title="Muat ulang seluruh data"
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kas &amp; Bank</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Rp {Number(summary.total_cash_modal).toLocaleString('id-ID')}
            </h3>
            <span className="text-xs text-emerald-500 font-medium mt-1.5 inline-block">
              +Rp {Number(summary.total_cash_in).toLocaleString('id-ID')} masuk
            </span>
          </div>
          <div className="p-3.5 bg-blue-500/15 text-blue-400 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aset Berjalan</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {fleetStats.mobilCount} Mobil &bull; {fleetStats.motorCount} Motor
            </h3>
            <span className="text-xs text-sky-400 font-medium mt-1.5 inline-block">
              {fleetStats.standbyCount} Standby &bull; {fleetStats.onDutyCount} Jalan
            </span>
          </div>
          <div className="p-3.5 bg-sky-500/15 text-sky-400 rounded-xl">
            <Car className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Persediaan Stok</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {inventoryStats.totalSku} Item ({inventoryStats.totalQty.toLocaleString('id-ID')})
            </h3>
            <span className={`text-xs font-medium mt-1.5 inline-block ${inventoryStats.lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {inventoryStats.lowStockItems.length} item stok menipis / habis
            </span>
          </div>
          <div className="p-3.5 bg-amber-500/15 text-amber-400 rounded-xl">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Penjualan &amp; Tagihan</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Rp {Number(salesStats.totalInvoiceValue).toLocaleString('id-ID')}
            </h3>
            <span className="text-xs text-indigo-400 font-medium mt-1.5 inline-block">
              {salesStats.unpaidCount} Inv Unpaid &bull; {salesStats.doCount} DO
            </span>
          </div>
          <div className="p-3.5 bg-indigo-500/15 text-indigo-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Monitoring Aset Berjalan (Mobil & Motor) + Peringatan Pajak/Servis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400" />
                Status Aset Berjalan (Mobil &amp; Motor)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Klik badge status untuk mengganti kondisi operasional, atau klik ikon pensil untuk edit detail.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {['ALL', 'Mobil', 'Motor'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFleetFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    fleetFilter === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? `Semua (${fleet.length})` : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Unit / Plat Nomor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Pemegang / Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Penugasan / Lokasi</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredFleet.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.type === 'Mobil' ? 'bg-sky-500/15 text-sky-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                          {item.type === 'Mobil' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-slate-900 dark:text-white">{item.plate_number}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{item.driver || '-'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-300">{item.assignment || '-'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleCycleFleetStatus(item)}
                        title="Klik untuk ubah status"
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${fleetStatusStyle(item.status)}`}
                      >
                        {item.status}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditFleetModal(item)}
                          title="Edit detail armada"
                          className="p-1.5 text-sky-400 hover:bg-sky-500/15 rounded-lg transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFleet(item)}
                          title="Hapus unit"
                          className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Radar Pajak STNK & Servis Berkala */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Radar Pajak STNK &amp; Servis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengingat jatuh tempo STNK (H-30) &amp; jadwal servis berkala (H-14).
              </p>
            </div>

            {fleetStats.alerts.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-emerald-300">Seluruh Pajak &amp; Servis Armada Aman</p>
                <p className="text-[11px] text-slate-400">Tidak ada jatuh tempo dalam 30 hari ke depan.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {fleetStats.alerts.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{a.plate_number}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{a.name}</span>
                    </div>
                    {a.taxDays !== null && a.taxDays <= 30 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Pajak STNK ({a.tax_due_date})</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${a.taxDays < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {a.taxDays < 0 ? `Lewat ${Math.abs(a.taxDays)} hari` : `H-${a.taxDays}`}
                        </span>
                      </div>
                    )}
                    {a.srvDays !== null && a.srvDays <= 14 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-sky-400" /> Servis ({a.service_due_date})
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${a.srvDays < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'}`}>
                          {a.srvDays < 0 ? `Lewat ${Math.abs(a.srvDays)} hari` : `H-${a.srvDays}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/70 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-lg font-extrabold text-emerald-500 dark:text-emerald-400">{fleetStats.standbyCount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Standby</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-lg font-extrabold text-blue-500 dark:text-blue-400">{fleetStats.onDutyCount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Jalan</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-lg font-extrabold text-amber-500 dark:text-amber-400">{fleetStats.serviceCount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Servis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Arus Keuangan & Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Ringkasan Penjualan &amp; Arus Kas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perbandingan omzet tagihan terhadap uang masuk dan uang keluar.</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Total Penjualan (Invoice)</span>
                  <span className="text-indigo-500 dark:text-indigo-400 font-bold">Rp {Number(salesStats.totalInvoiceValue).toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((salesStats.totalInvoiceValue / maxChartVal) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Total Uang Masuk (Kas &amp; Bank)</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold">+ Rp {Number(summary.total_cash_in).toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((Number(summary.total_cash_in || 0) / maxChartVal) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Total Uang Keluar (Operasional &amp; PO)</span>
                  <span className="text-rose-500 dark:text-rose-400 font-bold">- Rp {Number(summary.total_cash_out).toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((Number(summary.total_cash_out || 0) / maxChartVal) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">Purchase Order</p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{salesStats.poCount} Dokumen</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">Delivery Order</p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{salesStats.doCount} Dokumen</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">Sales Invoice</p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{invoices.length} Dokumen</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invoice Belum Lunas</span>
                <span className="font-bold text-amber-500 dark:text-amber-400">{salesStats.unpaidCount} Tagihan</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Work Order Produksi</span>
                <span className="font-bold text-sky-500 dark:text-sky-400">{salesStats.activeWoCount} Aktif / {salesStats.woCount} Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Radar Stok Menipis / Habis + Tombol Ajukan PR */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Peringatan Stok Menipis &amp; Habis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajukan Purchase Requisition (PR) ke bagian Purchasing untuk pengadaan stok.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {inventoryStats.lowStockItems.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    handleRequestPR(
                      inventoryStats.lowStockItems.slice(0, 10),
                      'Pengajuan restock prioritas (10 item terendah dari Dashboard)'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Ajukan PR (Top 10)
                </button>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                {inventoryStats.lowStockItems.length} Item
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {inventoryStats.lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">
                Semua stok barang di gudang berada di atas batas minimum.
              </p>
            ) : (
              inventoryStats.lowStockItems.slice(0, 15).map((p) => {
                const stock = Number(p.stock || 0);
                return (
                  <div
                    key={p.id || p.part_number}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-semibold text-blue-500 dark:text-blue-400 truncate">{p.part_number || p.product_code || '-'}</p>
                      <p className="text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          stock === 0
                            ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {stock === 0 ? 'Habis (0)' : `Sisa ${stock} ${p.unit || ''}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRequestPR([p], `Pengajuan PR untuk ${p.part_number || p.name}`)}
                        title="Ajukan Purchase Requisition"
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> PR
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tabel Mutasi & Arus Kas Terakhir */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mutasi &amp; Arus Kas Transaksi Terakhir</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sinkronisasi real-time dari transaksi penjualan dan pembelian perusahaan.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. Ref / Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan Transaksi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Akun Kas/Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Arus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {mutations.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">{item.ref}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.date}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.account}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.type === 'IN' ? (
                      <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full inline-flex items-center gap-1">
                        <ArrowDownRight className="h-3.5 w-3.5" /> Uang Masuk
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 rounded-full inline-flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5" /> Uang Keluar
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${item.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {item.type === 'IN' ? '+ ' : '- '} Rp {Number(item.amount).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Armada (Mobil / Motor) */}
      {isFleetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                {editingFleetId ? <Pencil className="w-4 h-4 text-sky-400" /> : <Plus className="w-4 h-4 text-sky-400" />}
                {editingFleetId ? 'Edit Data Aset Berjalan' : 'Tambah Aset Berjalan (Mobil / Motor)'}
              </h3>
              <button onClick={closeFleetModal} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFleet} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jenis Kendaraan</label>
                  <select
                    value={fleetForm.type}
                    onChange={(e) => setFleetForm({ ...fleetForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="Mobil">Mobil</option>
                    <option value="Motor">Motor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Plat Nomor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: B 9123 XYZ"
                    value={fleetForm.plate_number}
                    onChange={(e) => setFleetForm({ ...fleetForm, plate_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nama / Tipe Kendaraan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mitsubishi L300 / Honda Vario 125"
                  value={fleetForm.name}
                  onChange={(e) => setFleetForm({ ...fleetForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Driver / Pemegang</label>
                  <input
                    type="text"
                    placeholder="Nama driver / teknisi"
                    value={fleetForm.driver}
                    onChange={(e) => setFleetForm({ ...fleetForm, driver: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    value={fleetForm.status}
                    onChange={(e) => setFleetForm({ ...fleetForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="Standby">Standby</option>
                    <option value="Sedang Jalan">Sedang Jalan</option>
                    <option value="Servis">Servis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Penugasan / Lokasi Saat Ini</label>
                <input
                  type="text"
                  placeholder="Contoh: Kantor Bekasi / Kirim DO-3894"
                  value={fleetForm.assignment}
                  onChange={(e) => setFleetForm({ ...fleetForm, assignment: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jatuh Tempo Pajak STNK</label>
                  <input
                    type="date"
                    value={fleetForm.tax_due_date}
                    onChange={(e) => setFleetForm({ ...fleetForm, tax_due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jadwal Servis Berikutnya</label>
                  <input
                    type="date"
                    value={fleetForm.service_due_date}
                    onChange={(e) => setFleetForm({ ...fleetForm, service_due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={closeFleetModal}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold cursor-pointer"
                >
                  {editingFleetId ? 'Simpan Perubahan' : 'Simpan Kendaraan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Kas Masuk / Keluar Built-in */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Input Kas Masuk / Keluar Manual</h3>
              <button onClick={() => setIsInputModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange('IN')}
                  className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    formData.type === 'IN' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" /> Kas Masuk (BKM)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('OUT')}
                  className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    formData.type === 'OUT' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" /> Kas Keluar (BKK)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Nomor Referensi</label>
                  <input
                    type="text"
                    required
                    value={formData.ref_number}
                    onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Akun Kas / Bank</label>
                  <select
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                  >
                    <option value="Bank Permata (070.224.339-4)">Bank Permata (070.224.339-4)</option>
                    <option value="Kas Kecil (Petty Cash)">Kas Kecil (Petty Cash)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Pihak Terkait / Kontak</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT United Tractors"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Nominal (IDR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Contoh: 5000000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Keterangan / Uraian Transaksi</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Tuliskan keterangan lengkap..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}