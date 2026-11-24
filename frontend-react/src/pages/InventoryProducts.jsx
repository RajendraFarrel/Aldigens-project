import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, Barcode, X, Save, RefreshCw,
  Package, Printer, Upload, FileSpreadsheet, Boxes, PackageCheck,
  ShoppingCart, AlertTriangle,
} from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct, importProducts, downloadProductTemplate, downloadExport, getCustomers, getSuppliers } from '../services/api';
import BarcodeLabel, { printBarcodes } from '../components/BarcodeLabel';
import { swalConfirm, swalError, swalToast } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import {
  printAldigensDocument,
  makeReportNumber,
  getCurrentUserName,
  fmtDateLong,
  fmtQty,
} from '../utils/printAldigensDocument';

const PR_QUEUE_KEY = 'aldigens_pr_draft_queue';
const PR_ROUTE_PATH = '/purchases/purchase-requisition';

const EMPTY_FORM = {
  product_code: '',
  part_number: '',
  name: '',
  category: '',
  item_type: 'BAHAN / COMPONENT',
  unit: 'PCS',
  stock: 0,
  minimum_stock: 0,
  maximum_stock: '',
  supplier_id: '',
  customer_id: '',
};

const PRODUK_JADI = 'PRODUK JADI';

const isProdukJadi = (product) => String(product?.item_type || '').toUpperCase() === PRODUK_JADI;

const TABS = [
  { key: 'components', label: 'Komponen & Barang Satuan', icon: Boxes },
  { key: 'finished', label: 'Produk Jadi', icon: PackageCheck },
];

export default function InventoryProducts() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('components');
  const [lockType, setLockType] = useState(null);
  const searchRef = useRef('');
  searchRef.current = search.trim();

  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const componentProducts = useMemo(() => products.filter((p) => !isProdukJadi(p)), [products]);
  const finishedProducts = useMemo(() => products.filter((p) => isProdukJadi(p)), [products]);

  const baseTabItems = activeTab === 'finished' ? finishedProducts : componentProducts;
  const tabItems = useMemo(() => {
    if (!onlyLowStock) return baseTabItems;
    return baseTabItems.filter((p) => Number(p.stock ?? p.stok ?? p.qty ?? 0) <= Number(p.minimum_stock ?? 5));
  }, [baseTabItems, onlyLowStock]);

  const isFinishedTab = activeTab === 'finished';

  const pagination = usePagination(tabItems, 10);

  const { setCurrentPage } = pagination;
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, onlyLowStock, setCurrentPage]);

  useEffect(() => {
    if (loading || !search.trim()) return;
    if (!componentProducts.length && finishedProducts.length) setActiveTab('finished');
    else if (!finishedProducts.length && componentProducts.length) setActiveTab('components');
  }, [products, loading, search, componentProducts.length, finishedProducts.length]);

  const fetchProducts = async () => {
    setLoading(true);
    const keyword = search.trim();
    try {
      const res = await getProducts(keyword);
      if (keyword === searchRef.current) {
        setProducts(res.data?.data || []);
        setError('');
      }
    } catch (err) {
      const cancelled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (!cancelled && keyword === searchRef.current) {
        setProducts([]);
        setError('Gagal memuat data produk.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    getCustomers()
      .then((res) => setCustomers(res.data?.data || res.data || []))
      .catch(() => setCustomers([]));
    getSuppliers()
      .then((res) => setSuppliers(res.data?.data || res.data || []))
      .catch(() => setSuppliers([]));
  }, []);

  // Ajukan PR dari halaman Inventory
  const handleAjukanPR = (product) => {
    const minStk = Number(product.minimum_stock ?? 5);
    const curStk = Number(product.stock ?? product.stok ?? product.qty ?? 0);
    const suggestedQty = Math.max(minStk > 0 ? minStk * 2 - curStk : 10, 1);

    const queuePayload = {
      source: 'Master Inventory',
      department: 'Inventory & Gudang',
      remarks: `Pengajuan pembelian stok menipis/habis (${product.part_number || product.name})`,
      items: [
        {
          productId: product.id,
          part_number: product.part_number || product.product_code || '',
          name: product.name || product.description || '',
          unit: product.unit || 'PCS',
          quantity: suggestedQty,
        },
      ],
    };
    localStorage.setItem(PR_QUEUE_KEY, JSON.stringify(queuePayload));
    window.location.href = PR_ROUTE_PATH;
  };

  const openAdd = () => {
    setEditingProduct(null);
    setForm(isFinishedTab ? { ...EMPTY_FORM, item_type: PRODUK_JADI, stock: 0 } : EMPTY_FORM);
    setLockType(isFinishedTab ? 'finished' : null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      product_code: product.product_code || '',
      part_number: product.part_number || '',
      name: product.name || product.description || '',
      category: product.category || '',
      item_type: product.item_type || 'BAHAN / COMPONENT',
      unit: product.unit || 'PCS',
      stock: product.stock ?? product.qty ?? product.stok ?? 0,
      minimum_stock: product.minimum_stock ?? 0,
      maximum_stock: product.maximum_stock ?? '',
      supplier_id: product.supplier_id ?? '',
      customer_id: product.customer_id ?? '',
    });
    setLockType(isFinishedTab || isProdukJadi(product) ? 'finished' : null);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.part_number.trim()) {
      setError('Part Number wajib diisi.');
      return;
    }
    if (!form.name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }
    const payload = lockType === 'finished' ? { ...form, item_type: PRODUK_JADI } : form;
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id || editingProduct.part_number, payload);
      } else {
        await createProduct(payload);
      }
      swalToast('Produk berhasil disimpan via API.', 'success');
    } catch {
      let currentLocal = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      if (editingProduct) {
        currentLocal = currentLocal.map((item) =>
          item.id === editingProduct.id || item.part_number === editingProduct.part_number
            ? { ...item, ...payload, stock: payload.stock, stok: payload.stock, qty: payload.stock }
            : item
        );
        swalToast('Produk diperbarui (Offline Mode).', 'success');
      } else {
        const newProduct = { ...payload, id: Date.now(), stok: payload.stock, stock: payload.stock, qty: payload.stock };
        currentLocal.push(newProduct);
        swalToast('Produk ditambahkan (Offline Mode).', 'success');
      }
      localStorage.setItem('aldigens_products', JSON.stringify(currentLocal));
    } finally {
      setShowModal(false);
      setSaving(false);
      fetchProducts();
    }
  };

  const handlePrintBarcode = (product) => {
    printBarcodes([product]);
  };

  const handlePrintReport = () => {
    const rows = tabItems;
    const title = isFinishedTab ? 'LAPORAN MASTER PRODUK JADI' : 'LAPORAN MASTER PART NUMBER & PRODUK';
    const printedAt = new Date();

    printAldigensDocument({
      title,
      reportNumber: makeReportNumber(isFinishedTab ? 'MST-FG' : 'MST-PN'),
      printedAt,
      printedBy: getCurrentUserName(),
      metadataLeft: [
        { label: 'Jenis Data', value: isFinishedTab ? 'Produk Jadi' : 'Komponen & Barang Satuan', strong: true },
        { label: 'Pencarian', value: search.trim() ? `"${search.trim()}"` : 'Tanpa filter pencarian' },
      ],
      metadataRight: [{ label: 'Total Item', value: `${rows.length} item`, strong: true }],
      infoBox: [
        {
          label: 'Keterangan Laporan',
          value: 'Data master dan stok merupakan snapshot pada saat laporan dicetak (bukan saldo historis).',
          full: true,
        },
      ],
      sections: [
        {
          title: 'DAFTAR MASTER PRODUK',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (_r) => _r?._no },
            { header: 'Part Number', width: '13%', value: (r) => r.part_number },
            { header: 'Kode Produk', width: '10%', value: (r) => r.product_code },
            { header: 'Barcode', width: '10%', value: (r) => r.barcode },
            { header: 'Nama Produk', width: '23%', value: (r) => r.name || r.description },
            { header: 'Customer', width: '14%', value: (r) => r.customer?.customer_name },
            { header: 'Jenis Barang', width: '9%', align: 'center', value: (r) => r.item_type || 'BAHAN / COMPONENT' },
            { header: 'Kategori', width: '9%', value: (r) => r.category },
            { header: 'Satuan', width: '5%', align: 'center', value: (r) => r.unit || 'PCS' },
            { header: 'Stok', width: '5%', align: 'right', value: (r) => fmtQty(r.stock ?? r.stok ?? r.qty ?? 0) },
            { header: 'Min', width: '4%', align: 'right', value: (r) => fmtQty(r.minimum_stock) },
            { header: 'Maks', width: '4%', align: 'right', value: (r) => fmtQty(r.maximum_stock) },
          ],
          rows: rows.map((r, idx) => ({ ...r, _no: idx + 1 })),
          emptyMessage: `Tidak ada ${isFinishedTab ? 'produk jadi' : 'komponen'} pada filter yang dipilih.`,
        },
      ],
      notes: [
        'Data master dan stok merupakan snapshot saat laporan dicetak.',
        search.trim() ? `Filter pencarian yang diterapkan: "${search.trim()}".` : 'Tidak ada filter pencarian yang diterapkan.',
      ],
      summary: [
        { label: 'Total Item', value: `${rows.length} item`, total: true },
        { label: 'Dicetak', value: fmtDateLong(printedAt) },
      ],
      signatories: [
        { label: 'Dibuat Oleh', name: getCurrentUserName(), role: 'Administrator Inventory' },
        { label: 'Diperiksa Oleh', name: '........................', role: 'Kepala Gudang' },
      ],
      landscape: true,
    });
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setError('');
    setShowImport(true);
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const res = await importProducts(importFile);
      setImportResult(res.data);
      swalToast(`Import selesai: ${res.data.imported} produk masuk.`, 'success');
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengimpor file.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await downloadExport('products');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'master-part-number.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      swalToast('Export berhasil diunduh.', 'success');
    } catch {
      swalError('Gagal export', 'Tidak dapat mengunduh data.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadProductTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-import-produk.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      swalToast('Template berhasil diunduh.', 'success');
    } catch {
      swalError('Gagal mengunduh', 'Tidak dapat mengunduh template import.');
    }
  };

  const handleDelete = async (product) => {
    const ok = await swalConfirm({
      title: 'Hapus Produk?',
      text: `Produk "${product.name || product.part_number}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(product.id || product.part_number);
      swalToast('Produk berhasil dihapus.', 'success');
    } catch {
      let currentLocal = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      currentLocal = currentLocal.filter((item) => item.id !== product.id && item.part_number !== product.part_number);
      localStorage.setItem('aldigens_products', JSON.stringify(currentLocal));
      swalToast('Produk dihapus (Offline Mode).', 'success');
    } finally {
      fetchProducts();
    }
  };

  const lowStockCount = useMemo(
    () => products.filter((p) => Number(p.stock ?? p.stok ?? p.qty ?? 0) <= Number(p.minimum_stock ?? 5)).length,
    [products]
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl shadow">
            <Package className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Data Barang &amp; Part Number</h2>
            <p className="text-sm text-slate-400 mt-1">
              Manajemen komponen, barang satuan, produk jadi, stok, barcode &amp; pengajuan Purchase Requisition
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isFinishedTab && (
            <button
              onClick={openImport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Import Excel
            </button>
          )}
          <button
            onClick={handleExport}
            title="Ekspor seluruh data produk"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Export Excel
          </button>
          <button
            onClick={handlePrintReport}
            title="Cetak daftar sesuai tab & pencarian aktif"
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Cetak / PDF
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {isFinishedTab ? 'Tambah Produk Jadi' : 'Tambah Barang'}
          </button>
        </div>
      </div>

      {/* Tabs & Filter Stok Menipis */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === 'finished' ? finishedProducts.length : componentProducts.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setOnlyLowStock((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
            onlyLowStock
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900 text-amber-300 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Filter Stok Menipis / Habis ({lowStockCount})
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, barcode, part number, kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-900 text-slate-100"
          />
        </div>
        <button
          onClick={fetchProducts}
          className="p-2.5 border border-slate-800 bg-slate-900 rounded-xl hover:bg-slate-800 transition text-slate-300 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabel Utama */}
      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 font-bold">Part Number</th>
                <th className="px-5 py-4 font-bold">Nama Produk</th>
                <th className="px-5 py-4 font-bold">Supplier</th>
                <th className="px-5 py-4 font-bold">Kategori</th>
                <th className="px-5 py-4 font-bold">Satuan</th>
                <th className="px-5 py-4 font-bold text-right">Stok</th>
                <th className="px-5 py-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...
                  </td>
                </tr>
              ) : pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 px-4 text-slate-400">
                    Tidak ada data produk ditemukan pada tampilan ini.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((p, idx) => {
                  const finalStock = Number(p.stock ?? p.stok ?? p.qty ?? 0);
                  const minStock = Number(p.minimum_stock ?? 5);
                  const isLow = finalStock <= minStock;
                  return (
                    <tr key={p.id || p.part_number || idx} className="hover:bg-slate-800/50 transition">
                      <td className="px-5 py-3.5 font-mono text-blue-400 font-semibold text-xs">
                        {p.part_number || p.product_code || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-white">{p.name || p.description}</td>
                      <td className="px-5 py-3.5 text-slate-400">{p.supplier?.supplier_name || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{p.category || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{p.unit || 'PCS'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`font-bold text-sm px-2.5 py-1 rounded-lg ${
                            finalStock <= 0
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'text-emerald-400'
                          }`}
                        >
                          {finalStock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center items-center gap-1.5">
                          {isLow && !isProdukJadi(p) && (
                            <button
                              onClick={() => handleAjukanPR(p)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Ajukan Purchase Requisition (PR) ke bagian Pembelian"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" /> Ajukan PR
                            </button>
                          )}
                          <button
                            onClick={() => setBarcodeProduct(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-400 transition cursor-pointer"
                            title="Lihat Barcode"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* Modal Tambah / Edit Produk */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Produk' : lockType === 'finished' ? 'Tambah Produk Jadi' : 'Tambah Barang'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Part Number *</label>
                <input
                  type="text"
                  value={form.part_number}
                  onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                  placeholder="Part number dari supplier"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Supplier</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">Tanpa Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplier_code} — {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Customer</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">Tanpa Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_code} — {customer.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Jenis Item</label>
                <select
                  value={form.item_type}
                  onChange={(e) => setForm({ ...form, item_type: e.target.value })}
                  disabled={lockType === 'finished'}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
                >
                  <option>BAHAN / COMPONENT</option>
                  <option>PRODUK JADI</option>
                  <option>PRODUKSI</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama produk/barang"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Kategori"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Satuan</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm"
                  >
                    <option>PCS</option>
                    <option>SET</option>
                    <option>ROLL</option>
                    <option>METER</option>
                    <option>KG</option>
                    <option>BOX</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Stok Saat Ini</label>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    disabled={!editingProduct && lockType === 'finished'}
                    onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Minimum Stok</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minimum_stock}
                    onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Barcode */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4" onClick={() => setBarcodeProduct(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Barcode className="h-5 w-5 text-violet-400" /> {isProdukJadi(barcodeProduct) ? 'Barcode Produk Jadi' : 'Barcode Barang'}
              </h3>
              <button onClick={() => setBarcodeProduct(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-white">{barcodeProduct.name || barcodeProduct.description}</p>
              {barcodeProduct.part_number && <p className="text-xs text-slate-400">Part No: {barcodeProduct.part_number}</p>}
            </div>
            <div className="bg-white rounded-xl p-4 flex justify-center overflow-x-auto">
              <BarcodeLabel value={barcodeProduct.barcode || barcodeProduct.product_code || barcodeProduct.part_number || 'UNKNOWN'} height={70} width={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBarcodeProduct(null)} className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
                Tutup
              </button>
              <button
                onClick={() => handlePrintBarcode(barcodeProduct)}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" /> Import Data Produk
              </h3>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-2.5 rounded-xl leading-relaxed">
              Kolom yang dibaca: <b>Part Number, Supplier, Nama Barang, Jenis Barang, Satuan, Stock Awal</b>.
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-emerald-500/40 text-emerald-300 hover:bg-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" /> Download Template Excel
            </button>
            {error && <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setImportFile(e.target.files[0] || null);
                setImportResult(null);
              }}
              className="w-full border border-slate-800 bg-slate-950 text-slate-300 rounded-xl px-3 py-2.5 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs cursor-pointer"
            />
            {importResult && (
              <div className="text-xs text-emerald-300 bg-emerald-500/10 p-3 rounded-xl">
                Import selesai: {importResult.imported} data diproses.
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowImport(false)} className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium cursor-pointer">
                Tutup
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Mulai Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}