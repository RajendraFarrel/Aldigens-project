import { useCallback, useEffect, useState } from 'react';
import { Building2, MapPin, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { createWarehouse, createWarehouseLocation, deleteWarehouse, getWarehouses, updateWarehouse } from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const EMPTY_WAREHOUSE = { code: '', name: '', address: '', status: 'AKTIF' };

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(EMPTY_WAREHOUSE);
  const [locationForms, setLocationForms] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const pagination = usePagination(warehouses, 10);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
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

  const submitWarehouse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingId) await updateWarehouse(editingId, form);
      else await createWarehouse(form);
      setForm(EMPTY_WAREHOUSE);
      setEditingId(null);
      setMessage(editingId ? 'Warehouse berhasil diperbarui.' : 'Warehouse berhasil ditambahkan.');
      await loadWarehouses();
    } catch (err) {
      setError(err.response?.data?.message || 'Warehouse gagal disimpan.');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const addLocation = async (warehouseId) => {
    const location = locationForms[warehouseId] || { code: '', name: '' };
    if (!location.code.trim()) return setError('Kode lokasi wajib diisi.');
    try {
      await createWarehouseLocation(warehouseId, location);
      setLocationForms({ ...locationForms, [warehouseId]: { code: '', name: '' } });
      setMessage('Lokasi berhasil ditambahkan.');
      await loadWarehouses();
    } catch (err) {
      setError(err.response?.data?.message || 'Lokasi gagal ditambahkan.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Warehouse</h2>
          <p className="text-sm text-slate-500">Kelola warehouse dan lokasi penyimpanan inventory.</p>
        </div>
        <button onClick={loadWarehouses} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer" title="Muat ulang">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      <form onSubmit={submitWarehouse} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-slate-800">
          <Building2 className="w-5 h-5 text-blue-600" />
          {editingId ? 'Edit Warehouse' : 'Tambah Warehouse'}
        </h3>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            required
            placeholder="Kode warehouse"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Nama warehouse"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Alamat"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option>AKTIF</option>
            <option>NONAKTIF</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2 disabled:opacity-60 hover:bg-blue-700 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_WAREHOUSE);
              }}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="text-sm text-slate-500 py-6 col-span-2 text-center">Memuat data warehouse...</div>
          ) : pagination.totalItems === 0 ? (
            <div className="text-sm text-slate-500 py-6 col-span-2 text-center">Belum ada warehouse.</div>
          ) : (
            pagination.paginatedItems.map((warehouse) => {
              const location = locationForms[warehouse.id] || { code: '', name: '' };
              return (
                <div key={warehouse.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800">{warehouse.name}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {warehouse.code} · <span className={warehouse.status === 'AKTIF' ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{warehouse.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => editWarehouse(warehouse)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-100 cursor-pointer">
                        Edit
                      </button>
                      <button onClick={() => removeWarehouse(warehouse)} className="p-1 text-red-500 hover:text-red-700 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {warehouse.address && <p className="text-sm text-slate-500">{warehouse.address}</p>}
                  <div className="border-t border-slate-200 pt-3">
                    <div className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Lokasi ({warehouse.locations?.length || 0})
                    </div>
                    {warehouse.locations?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700">
                          {item.code}
                          {item.name ? ` — ${item.name}` : ''}
                        </span>
                        <span className="text-xs text-slate-400">{item.status}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <input
                        placeholder="Kode lokasi"
                        value={location.code}
                        onChange={(e) =>
                          setLocationForms({
                            ...locationForms,
                            [warehouse.id]: { ...location, code: e.target.value.toUpperCase() }
                          })
                        }
                        className="border bg-white rounded px-2 py-1.5 text-xs flex-1"
                      />
                      <input
                        placeholder="Nama lokasi"
                        value={location.name}
                        onChange={(e) =>
                          setLocationForms({
                            ...locationForms,
                            [warehouse.id]: { ...location, name: e.target.value }
                          })
                        }
                        className="border bg-white rounded px-2 py-1.5 text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addLocation(warehouse.id)}
                        className="p-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                        title="Tambah Lokasi"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
