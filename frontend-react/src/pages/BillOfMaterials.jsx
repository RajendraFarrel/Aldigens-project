import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Box, Edit3, Plus, Printer, Save, Search, Trash2,
  RefreshCw, Layers, CheckCircle2, FileEdit,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { createBom, deleteBom, finalizeBom, getBoms, getProducts, updateBom } from '../services/api';

const newBomNumber = () =>
  `BOM-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
const emptyForm = () => ({
  document_number: newBomNumber(),
  product_id: '',
  output_quantity: '1',
  items: [{ product_id: '', quantity: '1' }],
  notes: '',
  status: 'DRAFT',
});
const isFinished = (product) => String(product?.item_type || '').toUpperCase() === 'PRODUK JADI';
const productLabel = (product) =>
  `${product.part_number || product.product_code || ''} — ${product.name} (Stok: ${product.stock ?? 0} ${product.unit || 'PCS'})`;
const formatQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return value ?? '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3, useGrouping: false }).format(quantity);
};

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [finishedSearch, setFinishedSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [bomResponse, productResponse] = await Promise.all([getBoms(), getProducts()]);
      setBoms(bomResponse.data?.data || []);
      setProducts(productResponse.data?.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Data BOM dan Inventory gagal dimuat. Pastikan API aktif dan Anda memiliki akses.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const componentProducts = useMemo(
    () => products.filter((product) => !isFinished(product) && product.status !== 'NONAKTIF'),
    [products]
  );
  const finishedProducts = useMemo(
    () => products.filter((product) => isFinished(product) && product.status !== 'NONAKTIF'),
    [products]
  );
  const filteredBOMs = useMemo(
    () =>
      boms.filter(
        (bom) =>
          String(bom.document_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(bom.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(bom.product?.part_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [boms, searchTerm]
  );
  const pagination = usePagination(filteredBOMs, 10);

  const visibleFinishedProducts = useMemo(() => {
    const term = finishedSearch.trim().toLowerCase();
    if (!term) return finishedProducts;
    return finishedProducts.filter((product) =>
      `${product.part_number || ''} ${product.product_code || ''} ${product.name || ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [finishedProducts, finishedSearch]);

  const openAddForm = () => {
    setError('');
    setNotice('');
    setEditingId(null);
    setFinishedSearch('');
    setComponentSearch({});
    setFormData(emptyForm());
    setViewMode('form');
  };

  const openEditForm = (bom) => {
    if (bom.status !== 'DRAFT') {
      setError('Hanya BOM draft yang dapat diedit karena BOM aktif sudah memengaruhi stok.');
      return;
    }
    setError('');
    setNotice('');
    setEditingId(bom.id);
    setFinishedSearch('');
    setComponentSearch({});
    setFormData({
      document_number: bom.document_number,
      product_id: String(bom.product_id),
      output_quantity: String(Number(bom.output_quantity)),
      items: (bom.items || []).map((item) => ({
        product_id: String(item.product_id),
        quantity: String(Number(item.quantity)),
      })),
      notes: bom.notes || '',
      status: 'DRAFT',
    });
    setViewMode('form');
  };

  const updateItem = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const selectedProduct = finishedProducts.find((product) => String(product.id) === String(formData.product_id));
      if (!selectedProduct) throw new Error('Pilih produk jadi yang terdaftar di Inventory.');
      if (formData.items.some((item) => !item.product_id || Number(item.quantity) < 1))
        throw new Error('Pilih komponen dan jumlahnya untuk setiap baris.');
      const payload = {
        document_number: formData.document_number,
        product_id: Number(formData.product_id),
        output_quantity: Number(formData.output_quantity),
        unit: selectedProduct.unit || 'PCS',
        notes: formData.notes || null,
        items: formData.items.map((item) => {
          const component = componentProducts.find((product) => String(product.id) === String(item.product_id));
          return {
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            unit: component?.unit || 'PCS',
          };
        }),
      };
      const response = editingId
        ? await updateBom(editingId, { ...payload, status: 'DRAFT', action: 'draft' })
        : await createBom({ ...payload, status: 'DRAFT', action: 'draft' });
      setNotice(
        `BOM draft ${response.data?.data?.document_number || payload.document_number} berhasil ${
          editingId ? 'diperbarui' : 'disimpan'
        }. Stok belum berubah.`
      );
      setViewMode('list');
      await loadData();
    } catch (requestError) {
      const validationMessages = requestError.response?.data?.errors;
      setError(
        requestError.response?.data?.message ||
          Object.values(validationMessages || {}).flat()[0] ||
          requestError.message ||
          'BOM gagal disimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const buildPayload = (bom) => ({
    document_number: bom.document_number,
    product_id: Number(bom.product_id),
    output_quantity: Number(bom.output_quantity),
    unit: bom.unit,
    notes: bom.notes || null,
    items: (bom.items || []).map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      unit: item.unit,
    })),
  });

  const handleFinalize = async (bom) => {
    if (
      !window.confirm(
        `Finalisasi BOM ${bom.document_number}? Stok komponen akan berkurang dan stok produk jadi bertambah.`
      )
    )
      return;
    setError('');
    setNotice('');
    try {
      await finalizeBom(bom.id, buildPayload(bom));
      setNotice(`BOM ${bom.document_number} difinalisasi. Stok Inventory telah diperbarui.`);
      await loadData();
    } catch (requestError) {
      const validationMessages = requestError.response?.data?.errors;
      setError(
        requestError.response?.data?.message ||
          Object.values(validationMessages || {}).flat()[0] ||
          'BOM draft gagal difinalisasi.'
      );
    }
  };

  const handleDelete = async (bom) => {
    if (!window.confirm(`Hapus BOM ${bom.document_number}? Hanya BOM draft yang dapat dihapus.`)) return;
    setError('');
    setNotice('');
    try {
      await deleteBom(bom.id);
      setNotice('BOM dihapus. Stok tidak berubah karena penghapusan BOM tidak membatalkan mutasi stok.');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'BOM gagal dihapus.');
    }
  };

  const handlePrint = (bom) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = (bom.items || [])
      .map(
        (item, index) =>
          `<tr><td>${index + 1}</td><td>${item.product?.part_number || ''}</td><td>${item.product?.name || ''}</td><td>${formatQuantity(item.quantity)} ${item.unit || ''}</td></tr>`
      )
      .join('');
    printWindow.document.write(
      `<html><head><title>${bom.document_number}</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:left}</style></head><body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>Bill of Materials: ${bom.document_number}</h3><p>Produk jadi: ${bom.product?.part_number || ''} — ${bom.product?.name || ''} | Hasil: ${formatQuantity(bom.output_quantity)} ${bom.unit}</p><table><thead><tr><th>No</th><th>Part Number</th><th>Komponen</th><th>Kuantitas</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`
    );
    printWindow.document.close();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-4 md:p-8 w-full max-w-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Draft BOM' : 'Buat Bill of Materials (BOM) Baru'}
              </h2>
              <p className="text-sm text-slate-400">
                Susun komposisi komponen bahan baku untuk merakit Produk Jadi di Inventory.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          {!finishedProducts.length && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-300">
              Belum ada Produk Jadi aktif. Tambahkan master Produk Jadi di Inventory sebelum membuat BOM.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Nomor BOM
                <input
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-mono normal-case text-indigo-400 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.document_number}
                  onChange={(event) => setFormData({ ...formData, document_number: event.target.value })}
                  required
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Produk Jadi (Target Rakitan)
                <input
                  type="search"
                  value={finishedSearch}
                  onChange={(event) => setFinishedSearch(event.target.value)}
                  placeholder="Cari Part Number atau nama produk jadi..."
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  value={formData.product_id}
                  onChange={(event) => setFormData({ ...formData, product_id: event.target.value })}
                  required
                >
                  <option value="">-- Pilih Part Number / Nama Produk Jadi --</option>
                  {visibleFinishedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.part_number || product.product_code} — {product.name} (stok {product.stock || 0})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Jumlah Hasil Produksi (Output)
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.output_quantity}
                  onChange={(event) => setFormData({ ...formData, output_quantity: event.target.value })}
                  required
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Catatan Produksi
                <input
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Keterangan proses perakitan..."
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                />
              </label>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">Komponen &amp; Barang Satuan</h3>
                  <p className="text-xs text-slate-400">Jumlah bahan baku yang dibutuhkan per 1x BOM.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: '1' }] })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Tambah Part
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const selected = componentProducts.find((product) => String(product.id) === String(item.product_id));
                  const required = Number(item.quantity || 0) * Number(formData.output_quantity || 0);
                  const componentTerm = (componentSearch[index] || '').trim().toLowerCase();
                  const visibleComponents = componentTerm
                    ? componentProducts.filter((product) =>
                        `${product.part_number || ''} ${product.product_code || ''} ${product.name || ''}`
                          .toLowerCase()
                          .includes(componentTerm)
                      )
                    : componentProducts;
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 items-end rounded-2xl bg-slate-950 border border-slate-800 p-4"
                    >
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Komponen Bahan Baku #{index + 1}
                        <input
                          type="search"
                          value={componentSearch[index] || ''}
                          onChange={(event) =>
                            setComponentSearch((current) => ({ ...current, [index]: event.target.value }))
                          }
                          placeholder="Filter part number atau nama barang..."
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm normal-case text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          value={item.product_id}
                          onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                          required
                        >
                          <option value="">-- Pilih Part Number / Nama Komponen --</option>
                          {visibleComponents.map((product) => (
                            <option key={product.id} value={product.id}>
                              {productLabel(product)}
                            </option>
                          ))}
                        </select>
                        {selected && (
                          <span className="mt-1.5 block text-[11px] normal-case text-sky-400">
                            Dibutuhkan total: {required} {selected.unit || 'PCS'} (Tersedia: {selected.stock || 0})
                          </span>
                        )}
                      </label>

                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Qty / Produk
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm normal-case text-white text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                          required
                        />
                      </label>

                      <button
                        type="button"
                        disabled={formData.items.length === 1}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            items: formData.items.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                        className="h-11 rounded-xl px-3.5 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="rounded-xl px-5 py-2.5 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !finishedProducts.length || !componentProducts.length}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan Draft' : 'Simpan Draft BOM'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const activeCount = boms.filter((b) => b.status !== 'DRAFT').length;
  const draftCount = boms.filter((b) => b.status === 'DRAFT').length;

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/20 border border-indigo-500/30 p-3 rounded-xl shadow">
            <Layers className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Bill of Materials (BOM)</h1>
            <p className="text-sm text-slate-400 mt-1">
              Formula komposisi bahan baku &amp; komponen untuk perakitan produk jadi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat BOM Baru</span>
          </button>
        </div>
      </div>

      {/* 3 Kartu KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">BOM Aktif (Terproses)</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">{activeCount} Dokumen</p>
            <p className="text-xs text-slate-500 mt-1">Siap ditarik ke Work Order</p>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Draft BOM</p>
            <p className="text-xl font-extrabold text-amber-400 mt-1">{draftCount} Dokumen</p>
            <p className="text-xs text-slate-500 mt-1">Menunggu finalisasi stok</p>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
            <FileEdit className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Cari Nomor BOM / Produk Jadi
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="No. BOM, Part Number, atau Nama Produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      {/* Tabel Utama */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <th className="p-5 font-bold">No. BOM</th>
                <th className="p-5 font-bold">Produk Jadi</th>
                <th className="p-5 font-bold">Output</th>
                <th className="p-5 font-bold">Komponen</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat BOM...
                  </td>
                </tr>
              ) : pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-slate-500">
                    Belum ada BOM tersimpan di database.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((bom) => (
                  <tr key={bom.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-5 font-mono font-bold text-indigo-400">
                      <Box className="mr-2 inline h-4 w-4 text-slate-400" />
                      {bom.document_number}
                    </td>
                    <td className="p-5 font-semibold text-white">
                      {bom.product?.part_number ? `${bom.product.part_number} — ` : ''}
                      {bom.product?.name || '-'}
                    </td>
                    <td className="p-5 text-slate-300">
                      {formatQuantity(bom.output_quantity)} {bom.unit}
                    </td>
                    <td className="p-5 text-slate-400 text-xs max-w-xs truncate">
                      {(bom.items || [])
                        .map(
                          (item) =>
                            `${item.product?.part_number || item.product?.name}: ${formatQuantity(item.quantity)} ${item.unit}`
                        )
                        .join(', ')}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          bom.status === 'DRAFT'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {bom.status === 'DRAFT' ? 'Draft' : 'Aktif'}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {bom.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => openEditForm(bom)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition cursor-pointer"
                              title="Edit Draft"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleFinalize(bom)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                              title="Finalisasi & Proses Stok"
                            >
                              Finalisasi
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePrint(bom)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Cetak BOM"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bom)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
                          title="Hapus BOM"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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