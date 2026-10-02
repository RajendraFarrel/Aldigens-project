import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, RefreshCw, Save, Trash2, Users, X } from 'lucide-react';
import CustomerPartNumbers from './CustomerPartNumbers';
import {
  createCustomer, createSupplier, deleteCustomer, deleteSupplier, getCustomers, getSuppliers,
  updateCustomer, updateSupplier,
} from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const CUSTOMER_VIEWS = { MASTER: 'master', DATA: 'data' };
const EMPTY = { customer_code: '', customer_name: '', supplier_code: '', supplier_name: '', address: '', phone: '', email: '', status: 'AKTIF' };

const DEFAULT_CUSTOMERS = [
  { id: 1, customer_code: 'CUST-001', customer_name: 'PT. UNITED TRACTORS Tbk', phone: '021-4605959', email: 'contact@unitedtractors.com', address: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', status: 'AKTIF' },
  { id: 2, customer_code: 'CUST-002', customer_name: 'PT KOBEXINDO TRACTORS', phone: '021-65310555', email: 'info@kobexindo.com', address: 'Complex Office Park JIEXPO Kemayoran, Jakarta', status: 'AKTIF' },
  { id: 3, customer_code: 'CUST-003', customer_name: 'PT CBC INDONESIA', phone: '021-88392011', email: 'sales@cbc-indonesia.com', address: 'Kawasan Industri MM2100 Bekasi', status: 'AKTIF' },
  { id: 4, customer_code: 'CUST-004', customer_name: 'PT BINA PERTIWI', phone: '021-4605977', email: 'binapertiwi@unitedtractors.com', address: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', status: 'AKTIF' },
  { id: 5, customer_code: 'CUST-005', customer_name: 'PT HCMI (HYUNDAI)', phone: '021-8937100', email: 'support@hyundai-motor.co.id', address: 'Deltasurya Cikarang Pusat, Bekasi', status: 'AKTIF' },
  { id: 6, customer_code: 'CUST-006', customer_name: 'PT SANY PERKASA', phone: '021-29083888', email: 'info@sanyperkasa.com', address: 'Cakung, Jakarta Timur', status: 'AKTIF' },
];

/* ─── Reusable Modal ─── */
function Modal({ title, icon: Icon, iconColor = 'text-blue-600', onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            {title}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MasterData({ type = 'customer' }) {
  const isCustomer = type === 'customer';
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [customerView, setCustomerView] = useState(CUSTOMER_VIEWS.MASTER);

  const codeKey = isCustomer ? 'customer_code' : 'supplier_code';
  const nameKey = isCustomer ? 'customer_name' : 'supplier_name';
  const label   = isCustomer ? 'Customer' : 'Supplier';

  const pagination = usePagination(rows, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isCustomer) {
        try {
          const response = await getCustomers();
          const apiData = response.data?.data || [];
          if (apiData.length > 0) {
            setRows(apiData);
          } else {
            const local = JSON.parse(localStorage.getItem('aldigens_master_customers') || JSON.stringify(DEFAULT_CUSTOMERS));
            setRows(local);
          }
        } catch {
          const local = JSON.parse(localStorage.getItem('aldigens_master_customers') || JSON.stringify(DEFAULT_CUSTOMERS));
          setRows(local);
        }
      } else {
        const response = await getSuppliers();
        setRows(response.data?.data || []);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Data gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isCustomer && rows.length > 0) {
      localStorage.setItem('aldigens_master_customers', JSON.stringify(rows));
    }
  }, [rows, isCustomer]);

  /* ── Modal handlers ── */
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id || row.customer_code);
    setForm({ ...EMPTY, ...row });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setMessage('');
    try {
      const data = { ...form };
      if (isCustomer) {
        delete data.supplier_code;
        delete data.supplier_name;
      } else {
        delete data.customer_code;
        delete data.customer_name;
      }

      if (editingId) {
        if (isCustomer) {
          setRows(rows.map(r => (r.id === editingId || r.customer_code === editingId) ? { ...r, ...data } : r));
          try { await updateCustomer(editingId, data); } catch { }
        } else {
          await updateSupplier(editingId, data);
        }
      } else {
        const newEntry = { id: Date.now(), ...data };
        if (isCustomer) {
          setRows([newEntry, ...rows]);
          try { await createCustomer(data); } catch { }
        } else {
          await createSupplier(data);
        }
      }

      setMessage(`${label} berhasil disimpan.`);
      if (!isCustomer) await load();
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Data gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (row) => {
    const isSparepartAktif = isCustomer && (row.products_count || 0) > 0;
    const question = isSparepartAktif
      ? `${label} ${row[nameKey]} masih memiliki ${row.products_count} sparepart.\n\nHapus customer dan sekaligus lepas sparepartnya dari customer ini?`
      : `Hapus ${label.toLowerCase()} ${row[nameKey]}?\n\nData akan dihapus permanen dan tidak bisa dikembalikan.`;

    if (!window.confirm(question)) return;
    try {
      if (isCustomer) {
        await deleteCustomer(row.id);
      } else {
        await deleteSupplier(row.id);
      }
      setMessage(`${label} ${row[nameKey]} berhasil dihapus.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `${label} gagal dihapus.`);
    }
  };

  /* ── Tab: Data Customer (Part Number) ── */
  if (isCustomer && customerView === CUSTOMER_VIEWS.DATA) {
    return (
      <div className="p-6 max-w-7xl mx-auto w-full">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCustomerView(CUSTOMER_VIEWS.MASTER)}
            className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50 transition"
          >
            Master Customer
          </button>
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm shadow-sm">
            Data Customer
          </button>
        </div>
        <CustomerPartNumbers />
      </div>
    );
  }

  /* ── Tab: Master Customer / Supplier ── */
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Tab switcher */}
      {isCustomer && (
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm shadow-sm">
            Master Customer
          </button>
          <button
            onClick={() => setCustomerView(CUSTOMER_VIEWS.DATA)}
            className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50 transition"
          >
            Data Customer
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master {label}</h2>
          <p className="text-sm text-slate-500">Kelola data {label.toLowerCase()} sebagai master terpusat.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />Tambah {label}
          </button>
          <button onClick={load} className="p-2 border rounded-lg hover:bg-slate-50 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error   && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat data...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-600">Kode</th>
                <th className="text-left p-4 font-semibold text-slate-600">Nama</th>
                <th className="text-left p-4 font-semibold text-slate-600">Telepon</th>
                <th className="text-left p-4 font-semibold text-slate-600">Email</th>
                <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pagination.paginatedItems.map(row => (
                <tr key={row.id || row.customer_code} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="p-4 font-mono font-medium text-blue-600">{row[codeKey]}</td>
                  <td className="p-4 font-semibold text-slate-800">{row[nameKey]}</td>
                  <td className="p-4 text-slate-600">{row.phone || '-'}</td>
                  <td className="p-4 text-slate-600">{row.email || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                        onClick={() => deactivate(row)}
                        title="Hapus"
                      >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Controller */}
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* ─── Modal Form Tambah / Edit ─── */}
      {showModal && (
        <Modal
          title={editingId ? `Edit ${label}` : `Tambah ${label}`}
          icon={isCustomer ? Users : Building2}
          onClose={closeModal}
        >
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Kode {label} <span className="text-red-500">*</span></label>
                <input
                  required
                  placeholder={`Kode ${label}`}
                  value={form[codeKey]}
                  onChange={e => setForm({ ...form, [codeKey]: e.target.value.toUpperCase() })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nama {label} <span className="text-red-500">*</span></label>
                <input
                  required
                  placeholder={`Nama ${label}`}
                  value={form[nameKey]}
                  onChange={e => setForm({ ...form, [nameKey]: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Telepon</label>
                <input
                  placeholder="Telepon"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Alamat</label>
                <input
                  placeholder="Alamat lengkap"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>
            </div>

            {formError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 border py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
                Batal
              </button>
              <button
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : `Tambah ${label}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}