import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Box, Edit3, MoreVertical, Plus, Printer, Save, Search, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { createBom, deleteBom, finalizeBom, getBoms, getProducts, updateBom } from '../services/api';

const newBomNumber = () => `BOM-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
const emptyForm = () => ({ document_number: newBomNumber(), product_id: '', output_quantity: '1', items: [{ product_id: '', quantity: '1' }], notes: '', status: 'DRAFT' });
const isFinished = (product) => String(product?.item_type || '').toUpperCase() === 'PRODUK JADI';
const productLabel = (product) => `${product.part_number || product.product_code || ''} — ${product.name} (Stok: ${product.stock ?? 0} ${product.unit || 'PCS'})`;
const formatQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return value ?? '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3, useGrouping: false }).format(quantity);
};

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
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
      setError(requestError.response?.data?.message || 'Data BOM dan Inventory gagal dimuat. Pastikan API aktif dan Anda memiliki akses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const componentProducts = useMemo(() => products.filter((product) => !isFinished(product) && product.status !== 'NONAKTIF'), [products]);
  const finishedProducts = useMemo(() => products.filter((product) => isFinished(product) && product.status !== 'NONAKTIF'), [products]);
  const filteredBOMs = useMemo(() => boms.filter((bom) =>
    String(bom.document_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(bom.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(bom.product?.part_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [boms, searchTerm]);
  const pagination = usePagination(filteredBOMs, 10);

  const visibleFinishedProducts = useMemo(() => {
    const term = finishedSearch.trim().toLowerCase();
    if (!term) return finishedProducts;
    return finishedProducts.filter((product) => `${product.part_number || ''} ${product.product_code || ''} ${product.name || ''}`.toLowerCase().includes(term));
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
      setActiveMenuId(null);
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
      items: (bom.items || []).map((item) => ({ product_id: String(item.product_id), quantity: String(Number(item.quantity)) })),
      notes: bom.notes || '',
      status: 'DRAFT',
    });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const updateItem = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const selectedProduct = finishedProducts.find((product) => String(product.id) === String(formData.product_id));
      if (!selectedProduct) throw new Error('Pilih produk jadi yang terdaftar di Inventory.');
      if (formData.items.some((item) => !item.product_id || Number(item.quantity) < 1)) throw new Error('Pilih komponen dan jumlahnya untuk setiap baris.');
      const payload = {
        document_number: formData.document_number,
        product_id: Number(formData.product_id),
        output_quantity: Number(formData.output_quantity),
        unit: selectedProduct.unit || 'PCS',
        notes: formData.notes || null,
        items: formData.items.map((item) => {
          const component = componentProducts.find((product) => String(product.id) === String(item.product_id));
          return { product_id: Number(item.product_id), quantity: Number(item.quantity), unit: component?.unit || 'PCS' };
        }),
      };
      const response = editingId
        ? await updateBom(editingId, { ...payload, status: 'DRAFT', action: 'draft' })
        : await createBom({ ...payload, status: 'DRAFT', action: 'draft' });
      setNotice(`BOM draft ${response.data?.data?.document_number || payload.document_number} berhasil ${editingId ? 'diperbarui' : 'disimpan'}. Stok belum berubah.`);
      setViewMode('list');
      await loadData();
    } catch (requestError) {
      const validationMessages = requestError.response?.data?.errors;
      setError(requestError.response?.data?.message || Object.values(validationMessages || {}).flat()[0] || requestError.message || 'BOM gagal disimpan.');
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
    items: (bom.items || []).map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity), unit: item.unit })),
  });

  const handleFinalize = async (bom) => {
    if (!window.confirm(`Finalisasi BOM ${bom.document_number}? Stok komponen akan berkurang dan stok produk jadi bertambah.`)) return;
    setError('');
    setNotice('');
    try {
      await finalizeBom(bom.id, buildPayload(bom));
      setNotice(`BOM ${bom.document_number} difinalisasi. Stok Inventory telah diperbarui.`);
      await loadData();
    } catch (requestError) {
      const validationMessages = requestError.response?.data?.errors;
      setError(requestError.response?.data?.message || Object.values(validationMessages || {}).flat()[0] || 'BOM draft gagal difinalisasi.');
    }
    setActiveMenuId(null);
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
    setActiveMenuId(null);
  };

  const handlePrint = (bom) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = (bom.items || []).map((item, index) => `<tr><td>${index + 1}</td><td>${item.product?.part_number || ''}</td><td>${item.product?.name || ''}</td><td>${formatQuantity(item.quantity)} ${item.unit || ''}</td></tr>`).join('');
    printWindow.document.write(`<html><head><title>${bom.document_number}</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:left}</style></head><body><h2>Bill of Materials: ${bom.document_number}</h2><p>Produk jadi: ${bom.product?.part_number || ''} — ${bom.product?.name || ''} | Hasil: ${formatQuantity(bom.output_quantity)} ${bom.unit}</p><table><thead><tr><th>No</th><th>Part Number</th><th>Komponen</th><th>Kuantitas</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
            <div><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingId ? 'Edit Draft BOM' : 'Buat BOM Baru'}</h2><p className="text-xs text-slate-500">Draft dapat diedit tanpa mengubah stok Inventory.</p></div>
          </div>
          {error && <div className="mb-5 rounded-xl border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {!finishedProducts.length && <div className="mb-5 rounded-xl border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Belum ada Produk Jadi aktif. Tambahkan master Produk Jadi di Inventory sebelum membuat BOM.</div>}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border-slate-200 dark:border-slate-800">
              <label className="text-xs font-semibold uppercase text-slate-500">Nomor BOM<input className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={formData.document_number} onChange={(event) => setFormData({ ...formData, document_number: event.target.value })} required /></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Cari Produk Jadi
                <input type="search" value={finishedSearch} onChange={(event) => setFinishedSearch(event.target.value)} placeholder="Cari Part Number atau nama produk..." className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm normal-case text-slate-800 dark:text-white" />
                <select className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={formData.product_id} onChange={(event) => setFormData({ ...formData, product_id: event.target.value })} required><option value="">Pilih Part Number / Nama Produk Jadi</option>{visibleFinishedProducts.map((product) => <option key={product.id} value={product.id}>{product.part_number || product.product_code} — {product.name} (stok {product.stock || 0})</option>)}</select>
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">Jumlah Produk Jadi<input type="number" min="1" step="1" className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={formData.output_quantity} onChange={(event) => setFormData({ ...formData, output_quantity: event.target.value })} required /></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Catatan<input className="mt-2 w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} /></label>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-3"><div><h3 className="font-bold text-slate-800 dark:text-slate-100">Komponen & Barang Satuan</h3><p className="text-xs text-slate-500">Jumlah komponen yang digunakan untuk setiap BOM ini.</p></div><button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: '1' }] })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Tambah Part</button></div>
              {componentProducts.length === 0 && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Belum ada Komponen & Barang Satuan aktif di Inventory.</p>}
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const selected = componentProducts.find((product) => String(product.id) === String(item.product_id));
                  const required = Number(item.quantity || 0) * Number(formData.output_quantity || 0);
                  const componentTerm = (componentSearch[index] || '').trim().toLowerCase();
                  const visibleComponents = componentTerm
                    ? componentProducts.filter((product) => `${product.part_number || ''} ${product.product_code || ''} ${product.name || ''}`.toLowerCase().includes(componentTerm))
                    : componentProducts;
                  return <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-3 items-end rounded-xl border-slate-200 dark:border-slate-800 p-3">
                    <label className="text-xs font-semibold uppercase text-slate-500">Cari Part Number / Nama Komponen
                      <input type="search" value={componentSearch[index] || ''} onChange={(event) => setComponentSearch((current) => ({ ...current, [index]: event.target.value }))} placeholder="Cari part number atau nama barang..." className="mt-2 w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm normal-case text-slate-800 dark:text-white" />
                      <select className="mt-2 w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)} required><option value="">Pilih Part Number / Nama Komponen</option>{visibleComponents.map((product) => <option key={product.id} value={product.id}>{productLabel(product)}</option>)}</select>
                      {selected && <span className="mt-1 block text-[11px] normal-case text-slate-500">Dibutuhkan: {required} {selected.unit || 'PCS'} dari stok {selected.stock || 0}</span>}
                    </label>
                    <label className="text-xs font-semibold uppercase text-slate-500">Qty / Produk<input type="number" min="1" step="1" className="mt-2 w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm normal-case text-slate-800 dark:text-white" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required /></label>
                    <button type="button" disabled={formData.items.length === 1} onClick={() => setFormData({ ...formData, items: formData.items.filter((_, itemIndex) => itemIndex !== index) })} className="h-10 rounded-lg px-3 text-rose-600 hover:bg-rose-50 disabled:opacity-30" title="Hapus baris"><Trash2 className="h-4 w-4" /></button>
                  </div>;
                })}
              </div>
            </div>
            <div className="rounded-xl border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Simpan draft tidak mengubah stok. Finalisasi BOM dari daftar akan mengurangi stok komponen dan menambah stok produk jadi.</div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setViewMode('list')} className="rounded-xl px-5 py-2.5 text-slate-600 hover:bg-slate-100">Batal</button><button type="submit" disabled={saving || !finishedProducts.length || !componentProducts.length} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan Draft' : 'Simpan Draft BOM'}</button></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex-col sm:flex-row sm:items-center justify-start gap-4">
          <button onClick={openAddForm} className="order-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"><Plus className="h-4 w-4" /> Buat BOM Baru</button>
          <div className="relative order-2"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari Produk / Nomor BOM..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-200" /></div>
        </div>
        {error && <div className="mx-5 mt-4 rounded-xl border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {notice && <div className="mx-5 mt-4 rounded-xl border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        <div className="overflow-x-auto min-h-[300px]"><table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase"><tr><th className="px-6 py-3.5">No. BOM</th><th className="px-6 py-3.5">Produk Jadi</th><th className="px-6 py-3.5">Output</th><th className="px-6 py-3.5">Komponen</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-center">Aksi</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Memuat BOM...</td></tr> : pagination.paginatedItems.length === 0 ? <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Belum ada BOM tersimpan di database.</td></tr> : pagination.paginatedItems.map((bom) => <tr key={bom.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-6 py-4 font-bold text-blue-600"><Box className="mr-2 inline h-4 w-4 text-slate-400" />{bom.document_number}</td><td className="px-6 py-4 font-semibold">{bom.product?.part_number} — {bom.product?.name}</td><td className="px-6 py-4">{formatQuantity(bom.output_quantity)} {bom.unit}</td><td className="px-6 py-4">{(bom.items || []).map((item) => `${item.product?.part_number || item.product?.name}: ${formatQuantity(item.quantity)} ${item.unit}`).join(', ')}</td><td className="px-6 py-4">{bom.status === 'DRAFT' ? 'Draft' : 'Aktif'}</td>
              <td className="relative px-6 py-4 text-center"><button onClick={() => setActiveMenuId(activeMenuId === bom.id ? null : bom.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><MoreVertical className="inline h-4 w-4" /></button>{activeMenuId === bom.id && <div className="absolute right-12 top-10 z-20 w-48 rounded-xl border-slate-200 bg-white py-1.5 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">{bom.status === 'DRAFT' && <><button onClick={() => openEditForm(bom)} className="flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-slate-50"><Edit3 className="h-4 w-4 text-blue-500" /> Edit Draft</button><button onClick={() => handleFinalize(bom)} className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50"><Save className="h-4 w-4" /> Finalisasi & Proses Stok</button></>}<button onClick={() => { handlePrint(bom); setActiveMenuId(null); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-slate-50"><Printer className="h-4 w-4 text-emerald-500" /> Cetak BOM</button><button onClick={() => handleDelete(bom)} className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Hapus BOM</button></div>}</td>
            </tr>)}
          </tbody>
        </table></div>
        <Pagination currentPage={pagination.currentPage} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} />
      </div>
    </div>
  );
}
