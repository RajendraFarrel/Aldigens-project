import { useCallback, useEffect, useState } from 'react';
import {
  Building2, MapPin, Package, Pencil, Plus, RefreshCw, Save, Search,
  Trash2, X, Hash, ChevronLeft,
} from 'lucide-react';
import {
  createWarehouse, createWarehouseLocation, deleteWarehouse, getWarehouses,
  updateWarehouse, getWarehouseItems,
} from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const EMPTY_WAREHOUSE = { code: '', name: '', address: '', status: 'AKTIF' };

/* ─── Modal (sama dengan halaman Penerimaan / Pengeluaran Barang) ─── */
function Modal({ title, subtitle, icon: Icon, iconColor, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition" type="button">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
const labelClass = 'text-xs font-semibold text-slate-600';

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(EMPTY_WAREHOUSE);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  // Modal tambah lokasi
  const [locationWarehouse, setLocationWarehouse] = useState(null);
  const [locForm, setLocForm] = useState({ code: '', name: '' });
  const [locationError, setLocationError] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Halaman detail isi warehouse
  const [itemWarehouse, setItemWarehouse] = useState(null);
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [itemSummary, setItemSummary] = useState({ item_count: 0, total_qty: 0 });
  const [itemSearch, setItemSearch] = useState('');
  const [itemLocationFilter, setItemLocationFilter] = useState('');
  const [itemLoading, setItemLoading] = useState(false);

  const loadItems = useCallback(async (warehouse, locationId = '') => {
    if (!warehouse) return;
    setItemLoading(true);
    try {
      const res = await getWarehouseItems(warehouse.id, locationId ? { location_id: locationId } : {});
      setWarehouseItems(res.data?.data || []);
      setItemSummary(res.data?.summary || { item_count: 0, total_qty: 0 });
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Daftar item warehouse gagal dimuat.');
    } finally {
      setItemLoading(false);
    }
  }, []);

  const openItems = async (warehouse) => {
    setItemWarehouse(warehouse);
    setItemSearch('');
    setItemLocationFilter('');
    setWarehouseItems([]);
    setItemSummary({ item_count: 0, total_qty: 0 });
    await loadItems(warehouse);
  };

  const closeItems = () => setItemWarehouse(null);

  const filteredItems = warehouseItems.filter(row => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return [row.product?.part_number, row.product?.name, row.location?.code, row.location?.name]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });

  const itemPagination = usePagination(filteredItems, 10);

  const filtered = warehouses.filter(w => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [w.code, w.name, w.address, ...(w.locations || []).map(l => `${l.code} ${l.name || ''}`)]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });

  const pagination = usePagination(filtered, 10);

  const loadWarehouses = useCallback(async () => {
    try {
      const response = await getWarehouses();
      setWarehouses(response.data?.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Data warehouse gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_WAREHOUSE);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_WAREHOUSE);
    setFormError('');
  };

  const submitWarehouse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFormError('');
    setMessage('');
    try {
      if (editingId) await updateWarehouse(editingId, form);
      else await createWarehouse(form);
      closeModal();
      setMessage(editingId ? 'Warehouse berhasil diperbarui.' : 'Warehouse berhasil ditambahkan.');
      setLoading(true);
      await loadWarehouses();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()[0] ||
        'Warehouse gagal disimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const editWarehouse = (warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      status: warehouse.status || 'AKTIF'
    });
    setFormError('');
    setShowModal(true);
  };

  const removeWarehouse = async (warehouse) => {
    if (!window.confirm(`Hapus warehouse ${warehouse.name}?`)) return;
    try {
      await deleteWarehouse(warehouse.id);
      setMessage('Warehouse berhasil dihapus.');
      await loadWarehouses();
    } catch (err) {
      setError(err.response?.data?.message || 'Warehouse gagal dihapus.');
    }
  };

  const setLocationOpenFor = (warehouseId) => {
    // Pakai data terbaru dari state agar daftar lokasi tidak stale.
    const w = warehouses.find(x => String(x.id) === String(warehouseId));
    if (!w) return;
    setLocationWarehouse(w);
    setLocForm({ code: '', name: '' });
    setLocationError('');
  };

  const closeLocation = () => {
    setLocationWarehouse(null);
    setLocForm({ code: '', name: '' });
    setLocationError('');
  };

  const submitLocation = async (event) => {
    event.preventDefault();
    setSavingLocation(true);
    setLocationError('');
    try {
      await createWarehouseLocation(locationWarehouse.id, locForm);
      closeLocation();
      setMessage(`Lokasi berhasil ditambahkan ke ${locationWarehouse.name}.`);
      setLoading(true);
      await loadWarehouses();
    } catch (err) {
      setLocationError(
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()[0] ||
        'Lokasi gagal ditambahkan.'
      );
    } finally {
      setSavingLocation(false);
    }
  };

  // Halaman detail isi warehouse (bukan popup) — punya tombol kembali.
  if (itemWarehouse) {
    return (
      <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
        <button
          type="button"
          onClick={closeItems}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition"
        >
          <ChevronLeft className="w-4 h-4" />Kembali ke daftar warehouse
        </button>

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{itemWarehouse.name}</h2>
              <p className="text-sm text-slate-500">
                <span className="font-mono">{itemWarehouse.code}</span> · Daftar item yang tersimpan di warehouse ini
              </p>
            </div>
          </div>
          <button
            onClick={() => loadItems(itemWarehouse, itemLocationFilter)}
            className="p-2 border rounded-lg hover:bg-slate-50 transition"
            title="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${itemLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Item</p>
            <p className="text-2xl font-bold text-slate-800">{itemSummary.item_count}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Qty</p>
            <p className="text-2xl font-bold text-emerald-600">{itemSummary.total_qty}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lokasi</p>
            <p className="text-2xl font-bold text-blue-600">{itemWarehouse.locations?.length || 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={itemLocationFilter}
            onChange={e => { setItemLocationFilter(e.target.value); loadItems(itemWarehouse, e.target.value); }}
            className={`${inputClass} w-auto`}
          >
            <option value="">Semua Lokasi</option>
            {itemWarehouse.locations?.map(l => (
              <option key={l.id} value={l.id}>{l.code}{l.name ? ` — ${l.name}` : ''}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              placeholder="Cari part number, nama, atau lokasi..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600">Part Number</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Nama Item</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Lokasi</th>
                  <th className="text-right p-4 font-semibold text-slate-600">Qty</th>
                </tr>
              </thead>
              <tbody>
                {itemLoading ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400">Memuat item...</td></tr>
                ) : itemPagination.totalItems === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-400">
                    {itemSearch ? 'Item tidak ditemukan.' : 'Warehouse ini belum memiliki stok barang.'}
                  </td></tr>
                ) : (
                  itemPagination.paginatedItems.map(row => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="p-4 font-mono font-semibold text-blue-600">{row.product?.part_number || '-'}</td>
                      <td className="p-4 text-slate-700">{row.product?.name || '-'}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-md px-2 py-1 font-mono">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {row.location?.code || 'Umum'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {row.quantity} <span className="text-[11px] font-normal text-slate-400">{row.product?.unit || ''}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={itemPagination.currentPage}
            totalItems={itemPagination.totalItems}
            pageSize={itemPagination.pageSize}
            onPageChange={itemPagination.setCurrentPage}
            onPageSizeChange={itemPagination.setPageSize}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Warehouse</h2>
            <p className="text-sm text-slate-500">Kelola warehouse dan lokasi penyimpanan inventory.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />Tambah Warehouse
          </button>
          <button onClick={() => { setLoading(true); loadWarehouses(); }} className="p-2 border rounded-lg hover:bg-slate-50 transition" title="Muat ulang">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pencarian */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode, nama, alamat, atau lokasi..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-600">Warehouse</th>
                <th className="text-left p-4 font-semibold text-slate-600">Alamat</th>
                <th className="text-center p-4 font-semibold text-slate-600">Item</th>
                <th className="text-center p-4 font-semibold text-slate-600">Total Qty</th>
                <th className="text-center p-4 font-semibold text-slate-600">Lokasi</th>
                <th className="text-center p-4 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-400">Memuat data warehouse...</td></tr>
              ) : pagination.totalItems === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">Belum ada warehouse.</td></tr>
              ) : (
                pagination.paginatedItems.map((warehouse) => (
                  <tr key={warehouse.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{warehouse.name}</p>
                      <p className="text-xs font-mono text-slate-500">
                        {warehouse.code} ·{' '}
                        <span className={warehouse.status === 'AKTIF' ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                          {warehouse.status}
                        </span>
                      </p>
                    </td>
                    <td className="p-4 text-slate-600 max-w-[240px] truncate">{warehouse.address || '-'}</td>
                    <td className="p-4 text-center">
                      <span className="inline-block min-w-[2.5rem] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {warehouse.item_count ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block min-w-[2.5rem] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                        {warehouse.total_qty ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block min-w-[2.5rem] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold">
                        {warehouse.locations?.length || 0}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openItems(warehouse)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5"
                          title="Lihat daftar item"
                        >
                          <Package className="w-3.5 h-3.5" />Item
                        </button>
                        <button
                          onClick={() => setLocationOpenFor(warehouse.id)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                          title="Kelola lokasi"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editWarehouse(warehouse)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeWarehouse(warehouse)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Tambah Lokasi */}
      {locationWarehouse && (
        <Modal
          title={`Kelola Lokasi — ${locationWarehouse.name}`}
          subtitle="Tambahkan lokasi penyimpanan baru di warehouse ini."
          icon={MapPin}
          iconColor="text-emerald-600"
          onClose={closeLocation}
        >
          {/* Daftar lokasi saat ini */}
          <div className="space-y-2">
            <label className={labelClass}>Lokasi saat ini ({locationWarehouse.locations?.length || 0})</label>
            {locationWarehouse.locations?.length ? (
              <div className="flex flex-wrap gap-2">
                {locationWarehouse.locations.map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span className="font-mono font-semibold text-slate-700">{item.code}</span>
                    {item.name && <span className="text-slate-500">{item.name}</span>}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada lokasi di warehouse ini.</p>
            )}
          </div>

          <form onSubmit={submitLocation} className="space-y-3 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Kode Lokasi <span className="text-red-500">*</span></label>
                <input
                  required
                  placeholder="Contoh: A-01"
                  value={locForm.code}
                  onChange={e => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Nama Lokasi</label>
                <input
                  placeholder="Contoh: Rak A Lantai 1"
                  value={locForm.name}
                  onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {locationError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{locationError}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeLocation} className="flex-1 border border-slate-300 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
                Tutup
              </button>
              <button
                type="submit"
                disabled={savingLocation}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {savingLocation ? 'Menyimpan...' : 'Tambah Lokasi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Tambah / Edit */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Warehouse' : 'Tambah Warehouse'}
          subtitle={editingId ? 'Perubahan langsung disimpan ke master warehouse.' : 'Isi detail warehouse di bawah ini.'}
          icon={Building2}
          iconColor="text-blue-600"
          onClose={closeModal}
        >
          <form onSubmit={submitWarehouse} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Kode Warehouse <span className="text-red-500">*</span></label>
                <input
                  required
                  placeholder="Contoh: WH-MAIN"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Nama Warehouse <span className="text-red-500">*</span></label>
                <input
                  required
                  placeholder="Contoh: Warehouse Utama"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Alamat</label>
                <input
                  placeholder="Alamat lengkap warehouse"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  <option>AKTIF</option>
                  <option>NONAKTIF</option>
                </select>
              </div>
            </div>

            {formError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 border border-slate-300 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
                Batal
              </button>
              <button
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Warehouse'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
