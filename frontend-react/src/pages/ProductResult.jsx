import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, ArrowLeft, Save, Trash2, CheckCircle2,
  Package, PackageCheck, Clock,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api, { getProducts } from '../services/api';
import { swalToast } from '../utils/swal';

const PRODUCT_RESULT_STORAGE_KEY = 'aldigens_product_result';
const WO_STORAGE_KEY = 'aldigens_wo';

export default function ProductResult() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [productResults, setProductResults] = useState(() => {
    const saved = localStorage.getItem(PRODUCT_RESULT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [workOrders, setWorkOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const savedWO = JSON.parse(localStorage.getItem(WO_STORAGE_KEY) || '[]');
    setWorkOrders(savedWO);
    getProducts()
      .then((res) => setProducts(res?.data?.data || res?.data || []))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    prNo: `PRST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    refWO: '',
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    product: '',
    qtyIn: 1,
    unit: 'Unit',
    status: 'Disetujui',
  });

  const filteredResult = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return productResults;
    return productResults.filter(
      (item) =>
        String(item.prNo || '').toLowerCase().includes(q) ||
        String(item.refWO || '').toLowerCase().includes(q) ||
        String(item.product || '').toLowerCase().includes(q)
    );
  }, [productResults, searchTerm]);

  const pagination = usePagination(filteredResult, 10);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      default:
        return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
  };

  const handleOpenForm = () => {
    setFormError(null);
    const latestWO = JSON.parse(localStorage.getItem(WO_STORAGE_KEY) || '[]');
    setWorkOrders(latestWO);
    setFormData({
      prNo: `PRST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      refWO: '',
      date: new Date().toISOString().split('T')[0],
      product_id: '',
      product: '',
      qtyIn: 1,
      unit: 'Unit',
      status: 'Disetujui',
    });
    setViewMode('form');
  };

  const handleWoChange = (e) => {
    const selectedWoNo = e.target.value;
    const wo = workOrders.find((w) => w.woNo === selectedWoNo);

    if (wo) {
      const realName = wo.product || wo.model_bracket || wo.items?.[0]?.description || '';
      setFormData((prev) => ({
        ...prev,
        refWO: selectedWoNo,
        product_id: wo.product_id || '',
        product: realName,
        qtyIn: Number(wo.targetQty || wo.items?.[0]?.target_qty || 1),
      }));
    } else {
      setFormData((prev) => ({ ...prev, refWO: '', product_id: '', product: '', qtyIn: 1 }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.refWO) {
      setFormError('Pilih referensi Work Order terlebih dahulu!');
      return;
    }

    setSaving(true);
    try {
      await api.post('/product-results', formData).catch(() => null);

      // Jika disetujui dan produk terdaftar di Inventory, tambahkan stok barang jadi
      if (formData.status === 'Disetujui') {
        const matchedProduct =
          products.find((p) => String(p.id) === String(formData.product_id)) ||
          products.find((p) => String(p.name || '').toLowerCase() === String(formData.product || '').toLowerCase());

        if (matchedProduct) {
          const nextStock = Number(matchedProduct.stock || 0) + Number(formData.qtyIn || 0);
          await api
            .put(`/products/${matchedProduct.id}`, {
              ...matchedProduct,
              stock: nextStock,
            })
            .catch(() => null);
        }

        // Tandai Work Order terkait menjadi Selesai
        const updatedWO = workOrders.map((w) =>
          w.woNo === formData.refWO ? { ...w, status: 'Selesai', finish_date: formData.date } : w
        );
        setWorkOrders(updatedWO);
        localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(updatedWO));
      }

      const payload = { id: formData.prNo, ...formData };
      const updated = [payload, ...productResults];
      setProductResults(updated);
      localStorage.setItem(PRODUCT_RESULT_STORAGE_KEY, JSON.stringify(updated));

      if (typeof swalToast === 'function') {
        swalToast(`Hasil produksi ${formData.product} berhasil dicatat!`, 'success');
      }
      setViewMode('list');
    } catch (error) {
      setFormError(error.response?.data?.message || error.message || 'Gagal menyimpan hasil produksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus data hasil produksi ini?')) {
      const updated = productResults.filter((item) => item.id !== id);
      setProductResults(updated);
      localStorage.setItem(PRODUCT_RESULT_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  if (viewMode === 'form') {
    return (
      <div className="p-4 md:p-8 w-full max-w-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer text-slate-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Catat Hasil Produksi (Product Result)</h2>
                <p className="text-sm text-slate-400">
                  Setor barang jadi hasil rakitan ke gudang berdasarkan Work Order.
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-mono font-bold">
              {formData.prNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {formError && (
              <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Pilih Work Order (WO) *
                </label>
                <select
                  required
                  value={formData.refWO}
                  onChange={handleWoChange}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Referensi WO ({workOrders.length}) --</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id || wo.woNo} value={wo.woNo}>
                      {wo.woNo} — {wo.product || 'Produk WO'} ({wo.targetQty} Unit)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tanggal Setor *
                </label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Nama Produk Jadi (Otomatis dari WO) *
                </label>
                <input
                  required
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Qty Masuk *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.qtyIn}
                    onChange={(e) => setFormData({ ...formData, qtyIn: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Status Dokumen
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Disetujui">Disetujui (Tambah Stok Gudang &amp; Selesaikan WO)</option>
                  <option value="Draft">Draft (Belum Update Stok)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-6 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Hasil Produksi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const approvedUnits = productResults
    .filter((r) => r.status === 'Disetujui')
    .reduce((sum, r) => sum + Number(r.qtyIn || 0), 0);

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl shadow">
            <PackageCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Product Result</h1>
            <p className="text-sm text-slate-400 mt-1">
              Serah terima hasil produksi barang jadi ke gudang Inventory.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Catat Hasil Produksi</span>
        </button>
      </div>

      {/* 3 Kartu KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Produk Jadi Masuk</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">{approvedUnits} Unit</p>
            <p className="text-xs text-slate-500 mt-1">Tercatat masuk ke Inventory</p>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Dokumen Serah Terima</p>
            <p className="text-xl font-extrabold text-sky-400 mt-1">{productResults.length} Dokumen</p>
            <p className="text-xs text-slate-500 mt-1">Riwayat penyelesaian produksi</p>
          </div>
          <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Cari Hasil Produksi / WO / Produk
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="No. PRST, No. WO, atau Nama Produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <th className="p-5 font-bold">Tanggal</th>
                <th className="p-5 font-bold">No. Hasil Produksi</th>
                <th className="p-5 font-bold">Ref. WO</th>
                <th className="p-5 font-bold">Produk Jadi</th>
                <th className="p-5 font-bold">Qty Masuk</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-500">
                    Tidak ada data hasil produksi.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-5 text-slate-300">{item.date}</td>
                    <td className="p-5 font-mono font-bold text-emerald-400">
                      <Package className="h-4 w-4 inline mr-2 text-slate-400" />
                      {item.prNo}
                    </td>
                    <td className="p-5 font-mono text-sky-400">{item.refWO}</td>
                    <td className="p-5 font-semibold text-white">{item.product}</td>
                    <td className="p-5 text-slate-300">
                      {item.qtyIn} {item.unit || 'Unit'}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status === 'Disetujui' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}