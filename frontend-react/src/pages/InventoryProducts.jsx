import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, X, Save, RefreshCw, Package, Printer, Upload, FileSpreadsheet, Boxes, PackageCheck } from 'lucide-react';
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

// Klasifikasi item berdasarkan item_type dari API.
// Data lama dengan item_type kosong/null dianggap komponen agar tidak hilang.
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
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('components');
  // null = form bebas (edit). 'components' / 'finished' = tipe dikunci sesuai tab asal form.
  const [lockType, setLockType] = useState(null);
  // Kata kunci terakhir yang diminta — mencegah respons lama (debounce) menimpa data terbaru.
  const searchRef = useRef('');
  searchRef.current = search.trim();

  // State Import Excel
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Pisahkan data per tab setelah hasil pencarian diterima (tanpa request tambahan).
  const componentProducts = useMemo(() => products.filter((p) => !isProdukJadi(p)), [products]);
  const finishedProducts = useMemo(() => products.filter((p) => isProdukJadi(p)), [products]);

  const tabItems = activeTab === 'finished' ? finishedProducts : componentProducts;
  const isFinishedTab = activeTab === 'finished';

  const pagination = usePagination(tabItems, 10);

  // Kembali ke halaman 1 saat pindah tab.
  const { setCurrentPage } = pagination;
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, setCurrentPage]);

  // Saat hasil pencarian diterima, arahkan ke tab yang memiliki hasil
  // (mis. mencari Part Number produk jadi dari tab komponen).
  // Hanya untuk pencarian aktif, agar tidak memaksa pindah tab saat daftar kosong biasanya.
  useEffect(() => {
    if (loading || !search.trim()) return;
    if (!componentProducts.length && finishedProducts.length) setActiveTab('finished');
    else if (!finishedProducts.length && componentProducts.length) setActiveTab('components');
  }, [products, loading, search]);

  // --- FUNGSI FETCH DISINKRONKAN KE ALDIGENS_PRODUCTS ---
  // Bukan useCallback: dipanggil oleh useEffect yang dideklarasikan lebih dulu,
  // jadi tidak boleh bergantung pada variabel yang baru dibuat setelahnya.
  const fetchProducts = async () => {
    setLoading(true);
    // Snapshot keyword agar respons usang (mis. saat search dikosongkan) tidak menimpa hasil terbaru.
    const keyword = search.trim();
    try {
      const res = await getProducts(keyword);
      if (keyword === searchRef.current) {
        setProducts(res.data?.data || []);
        setError('');
      }
    } catch (err) {
      // Request yang dibatalkan (pindah halaman / unmount) bukan kegagalan data.
      const cancelled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (!cancelled && keyword === searchRef.current) {
        setProducts([]);
        setError('Gagal memuat data produk.');
      }
    } finally {
      // Selalu dijalankan agar indikator loading tidak menggantung.
      setLoading(false);
    }
  };


  // Fungsi Pembantu membaca LocalStorage aldigens_products
  const fallbackToLocal = (searchTerm) => {
    const localInventory = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
    if (!searchTerm) {
      setProducts(localInventory);
      return;
    }
    const filtered = localInventory.filter(p =>
      String(p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.part_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.product_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProducts(filtered);
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Muat daftar customer untuk dropdown "Customer" pada form produk.
  useEffect(() => {
    getCustomers()
      .then((res) => setCustomers(res.data?.data || res.data || []))
      .catch(() => setCustomers([]));
    getSuppliers()
      .then((res) => setSuppliers(res.data?.data || res.data || []))
      .catch(() => setSuppliers([]));
  }, []);

  const openAdd = () => {
    setEditingProduct(null);
    // Tab Produk Jadi langsung membuat master PRODUK JADI (stok awal 0).
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
      // Pertahankan tipe item asli; hanya null/kosong yang diberi default komponen.
      item_type: product.item_type || 'BAHAN / COMPONENT',
      unit: product.unit || 'PCS',
      stock: product.stock ?? product.qty ?? product.stok ?? 0,
      minimum_stock: product.minimum_stock ?? 0,
      maximum_stock: product.maximum_stock ?? '',
      supplier_id: product.supplier_id ?? '',
      customer_id: product.customer_id ?? '',
    });
    // Edit dari tab Produk Jadi: tipe dikunci agar tidak berubah jadi komponen.
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
    // Pastikan tipe tidak berubah jadi komponen saat form dibuka dari tab Produk Jadi.
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
    } catch (e) {
      console.warn("API Error saat simpan, menggunakan LocalStorage fallback...");

      let currentLocal = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      if (editingProduct) {
        currentLocal = currentLocal.map(item =>
          (item.id === editingProduct.id || item.part_number === editingProduct.part_number)
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

  /* Cetak / PDF — mencetak SELURUH data yang cocok dengan tab & pencarian,
     bukan hanya baris pada halaman pagination yang sedang tampil. */
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
      metadataRight: [
        { label: 'Total Item', value: `${rows.length} item`, strong: true },
      ],
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
    } catch (e) {
      console.warn("API Error saat hapus, menggunakan LocalStorage fallback...");
      let currentLocal = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      currentLocal = currentLocal.filter(item => item.id !== product.id && item.part_number !== product.part_number);
      localStorage.setItem('aldigens_products', JSON.stringify(currentLocal));
      swalToast('Produk dihapus (Offline Mode).', 'success');
    } finally {
      fetchProducts();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Data Barang & Part Number</h2>
            <p className="text-xs text-slate-500">Manajemen komponen, barang satuan, produk jadi, stok, dan barcode</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import hanya untuk tab komponen: importer existing belum menentukan item_type. */}
          {!isFinishedTab && (
            <button onClick={openImport} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer">
              <Upload className="h-4 w-4" /> Import Excel
            </button>
          )}
          <button onClick={handleExport} title="Ekspor seluruh data produk (semua tipe item)" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> {isFinishedTab ? 'Export Excel (Semua Produk)' : 'Export Excel'}
          </button>
          <button onClick={handlePrintReport} title="Cetak daftar sesuai tab & pencarian aktif" className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer">
            <Printer className="h-4 w-4" /> Cetak / PDF
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer">
            <Plus className="h-4 w-4" /> {isFinishedTab ? 'Tambah Produk Jadi' : 'Tambah Barang'}
          </button>
        </div>
      </div>

      {/* Tab pemisah data berdasarkan item_type */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tab.key === 'finished' ? finishedProducts.length : componentProducts.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 mb-0 text-sm font-bold border-2 rounded-xl transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-400'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-300'}`} />
              {tab.label}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isFinishedTab && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          Export Excel mencakup <b>seluruh data produk</b> (komponen dan produk jadi), bukan hanya tab aktif.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span>✕</span> {error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, barcode, part number, kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button onClick={fetchProducts} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Satuan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...</td></tr>
              ) : pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 px-4">
                    <p className="text-slate-500 text-sm">
                      {search
                        ? `Tidak ada ${isFinishedTab ? 'produk jadi' : 'komponen'} yang cocok dengan pencarian "${search}".`
                        : isFinishedTab
                          ? 'Belum ada Produk Jadi terdaftar.'
                          : 'Belum ada Komponen & Barang Satuan terdaftar.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isFinishedTab
                        ? 'Produk jadi adalah master hasil perakitan; stok bertambah melalui proses produksi.'
                        : 'Komponen dan barang satuan adalah bahan yang digunakan dalam produksi.'}
                    </p>
                    <button onClick={openAdd} className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition cursor-pointer">
                      <Plus className="h-4 w-4" /> {isFinishedTab ? 'Tambah Produk Jadi' : 'Tambah Barang'}
                    </button>
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((p, idx) => {
                const finalStock = Number(p.stock ?? p.stok ?? p.qty ?? 0);
                return (
                  <tr key={p.id || p.part_number || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.part_number || p.product_code || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name || p.description}</td>
                    <td className="px-4 py-3 text-slate-500">{p.supplier?.supplier_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.customer?.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.unit || 'PCS'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-base ${finalStock <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {finalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setBarcodeProduct(p)} className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition cursor-pointer" title="Lihat Barcode"><Barcode className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer" title="Edit"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={pagination.currentPage} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} />
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingProduct ? 'Edit Produk' : lockType === 'finished' ? 'Tambah Produk Jadi' : 'Tambah Barang'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Part Number</label>
                <input
                  type="text"
                  value={form.part_number}
                  onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                  placeholder="Part number dari supplier"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Supplier</label>
                <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="w-full border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option value="">Tanpa Supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_code} — {supplier.supplier_name}</option>)}</select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Customer</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"><option value="">Tanpa Customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_code} — {customer.customer_name}</option>)}</select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Jenis Item</label>
                <select
                  value={form.item_type}
                  onChange={(e) => setForm({ ...form, item_type: e.target.value })}
                  disabled={lockType === 'finished'}
                  className="w-full border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <option>BAHAN / COMPONENT</option><option>PRODUK JADI</option><option>PRODUKSI</option>
                </select>
                {lockType === 'finished' && (
                  <p className="text-[11px] text-slate-400 mt-1">Tipe terkunci PRODUK JADI saat dibuat dari tab Produk Jadi.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Produk <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk/barang" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Kategori</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Satuan</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option>PCS</option><option>SET</option><option>ROLL</option><option>METER</option><option>KG</option><option>BOX</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Stok Awal</label>
                <input type="number" min={0} value={form.stock} disabled={!editingProduct && lockType === 'finished'} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" />
                {!editingProduct && lockType === 'finished' && (
                  <p className="text-[11px] text-slate-400 mt-1">Master produk jadi dibuat dengan stok 0. Stok bertambah lewat alur produksi.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Barcode */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBarcodeProduct(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Barcode className="h-5 w-5 text-violet-600" /> {isProdukJadi(barcodeProduct) ? 'Barcode Produk Jadi' : 'Barcode Barang'}</h3>
              <button onClick={() => setBarcodeProduct(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-800">{barcodeProduct.name || barcodeProduct.description}</p>
              {barcodeProduct.part_number && <p className="text-xs text-slate-500">Part No: {barcodeProduct.part_number}</p>}
              {(barcodeProduct.barcode || barcodeProduct.product_code) && <p className="text-xs text-slate-400">Kode: {barcodeProduct.barcode || barcodeProduct.product_code}</p>}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-center overflow-x-auto">
              <BarcodeLabel value={barcodeProduct.barcode || barcodeProduct.product_code || barcodeProduct.part_number || 'UNKNOWN'} height={70} width={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBarcodeProduct(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">Tutup</button>
              <button onClick={() => handlePrintBarcode(barcodeProduct)} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"><Printer className="h-4 w-4" /> Cetak</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Import Data Produk</h3>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-3 py-2.5 rounded-xl leading-relaxed">
              Kolom yang dibaca: <b>Part Number, Supplier, Nama Barang, Jenis Barang, Satuan, Stock Awal</b>.
              Kolom Supplier boleh berisi kode atau nama supplier — bila belum terdaftar, supplier baru dibuat otomatis.
              Kode internal tidak perlu diisi — dibuat otomatis oleh sistem.
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Template Excel
            </button>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); }} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs cursor-pointer" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowImport(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">Tutup</button>
              <button onClick={handleImport} disabled={importing || !importFile} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Mulai Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}