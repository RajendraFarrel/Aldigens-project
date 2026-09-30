import { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw, Save, Users } from 'lucide-react';
import CustomerPartNumbers from './CustomerPartNumbers';
import {
  createCustomer, createSupplier, deleteCustomer, deleteSupplier, getCustomers, getSuppliers,
  updateCustomer, updateSupplier,
} from '../services/api';

const CUSTOMER_VIEWS = { MASTER: 'master', DATA: 'data' };

const EMPTY = { customer_code: '', customer_name: '', supplier_code: '', supplier_name: '', address: '', phone: '', email: '', status: 'AKTIF' };

// Data awal default customer dari file Excel mitra perusahaan
const DEFAULT_CUSTOMERS = [
  { id: 1, customer_code: 'CUST-001', customer_name: 'PT. UNITED TRACTORS Tbk', phone: '021-4605959', email: 'contact@unitedtractors.com', address: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', status: 'AKTIF' },
  { id: 2, customer_code: 'CUST-002', customer_name: 'PT KOBEXINDO TRACTORS', phone: '021-65310555', email: 'info@kobexindo.com', address: 'Complex Office Park JIEXPO Kemayoran, Jakarta', status: 'AKTIF' },
  { id: 3, customer_code: 'CUST-003', customer_name: 'PT CBC INDONESIA', phone: '021-88392011', email: 'sales@cbc-indonesia.com', address: 'Kawasan Industri MM2100 Bekasi', status: 'AKTIF' },
  { id: 4, customer_code: 'CUST-004', customer_name: 'PT BINA PERTIWI', phone: '021-4605977', email: 'binapertiwi@unitedtractors.com', address: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', status: 'AKTIF' },
  { id: 5, customer_code: 'CUST-005', customer_name: 'PT HCMI (HYUNDAI)', phone: '021-8937100', email: 'support@hyundai-motor.co.id', address: 'Deltasurya Cikarang Pusat, Bekasi', status: 'AKTIF' },
  { id: 6, customer_code: 'CUST-006', customer_name: 'PT SANY PERKASA', phone: '021-29083888', email: 'info@sanyperkasa.com', address: 'Cakung, Jakarta Timur', status: 'AKTIF' }
];

export default function MasterData({ type = 'customer' }) {
  const isCustomer = type === 'customer';
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [customerView, setCustomerView] = useState(CUSTOMER_VIEWS.MASTER);

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
            // Jika API kosong, ambil dari localStorage atau default excel
            const local = JSON.parse(localStorage.getItem('aldigens_master_customers') || JSON.stringify(DEFAULT_CUSTOMERS));
            setRows(local);
          }
        } catch (err) {
          // Fallback jika API gagal/tidak aktif
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
    } finally { setLoading(false); }
  }, [isCustomer]);

  useEffect(() => { 
    setForm(EMPTY); 
    setEditingId(null); 
    load(); 
  }, [load]);

  // Simpan perubahan customer ke localStorage agar persisten
  useEffect(() => {
    if (isCustomer && rows.length > 0) {
      localStorage.setItem('aldigens_master_customers', JSON.stringify(rows));
    }
  }, [rows, isCustomer]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
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
          setRows(rows.map(r => r.id === editingId ? { ...r, ...data } : r));
          try { await updateCustomer(editingId, data); } catch(e) {}
        } else {
          await updateSupplier(editingId, data);
        }
      } else {
        const newEntry = { id: Date.now(), ...data };
        if (isCustomer) {
          setRows([newEntry, ...rows]);
          try { await createCustomer(data); } catch(e) {}
        } else {
          await createSupplier(data);
        }
      }

      setForm(EMPTY); 
      setEditingId(null); 
      setMessage(`${isCustomer ? 'Customer' : 'Supplier'} berhasil disimpan.`); 
      if (!isCustomer) await load();
    } catch (err) { 
      setError(err.response?.data?.message || 'Data gagal disimpan.'); 
    } finally { 
      setSaving(false); 
    }
  };

  const codeKey = isCustomer ? 'customer_code' : 'supplier_code';
  const nameKey = isCustomer ? 'customer_name' : 'supplier_name';
  const label = isCustomer ? 'Customer' : 'Supplier';

  const deactivate = async (row) => {
    if (!window.confirm(`Nonaktifkan ${label} ${row[nameKey]}?`)) return;
    try {
      if (isCustomer) {
        setRows(rows.map(r => r.id === row.id ? { ...r, status: 'NONAKTIF' } : r));
        try { await deleteCustomer(row.id); } catch(e) {}
      } else {
        await deleteSupplier(row.id);
        await load();
      }
      setMessage(`${label} berhasil dinonaktifkan.`);
    } catch (err) {
      setError(err.response?.data?.message || `${label} gagal dinonaktifkan.`);
    }
  };

<<<<<<< HEAD
  if (isCustomer && customerView === CUSTOMER_VIEWS.DATA) return <div className="p-6 max-w-7xl mx-auto w-full"><div className="flex gap-2 mb-4"><button onClick={() => setCustomerView(CUSTOMER_VIEWS.MASTER)} className="px-4 py-2 rounded-xl border text-sm">Master Customer</button><button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">Data Customer</button></div><CustomerPartNumbers /></div>;

  return <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
    {isCustomer && <div className="flex gap-2"><button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">Master Customer</button><button onClick={() => setCustomerView(CUSTOMER_VIEWS.DATA)} className="px-4 py-2 rounded-xl border text-sm">Data Customer</button></div>}
    <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800">Master {label}</h2><p className="text-sm text-slate-500">Kelola data {label.toLowerCase()} sebagai master terpusat.</p></div><button onClick={load} className="p-2 border rounded-lg"><RefreshCw className="w-4 h-4" /></button></div>
    {error && <div className="p-3 rounded-lg bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}
    {message && <div className="p-3 rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">{message}</div>}
    <form onSubmit={submit} className="bg-white rounded-2xl border-slate-200 p-5 shadow-sm space-y-4">
      <h3 className="font-semibold flex items-center gap-2">{isCustomer ? <Users className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}{editingId ? `Edit ${label}` : `Tambah ${label}`}</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <input required placeholder={`Kode ${label}`} value={form[codeKey]} onChange={e => setForm({ ...form, [codeKey]: e.target.value.toUpperCase() })} className="border rounded-lg px-3 py-2 text-sm" />
        <input required placeholder={`Nama ${label}`} value={form[nameKey]} onChange={e => setForm({ ...form, [nameKey]: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Telepon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Alamat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm"><option value="AKTIF">AKTIF</option><option value="NONAKTIF">NONAKTIF</option></select>
=======
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master {label}</h2>
          <p className="text-sm text-slate-500">Kelola data {label.toLowerCase()} sebagai master terpusat.</p>
        </div>
        <button onClick={load} className="p-2 border rounded-lg hover:bg-slate-50 transition"><RefreshCw className="w-4 h-4" /></button>
>>>>>>> 30ec74ac8681bc9ae6f01a3f557bed0763093354
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          {isCustomer ? <Users className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
          {editingId ? `Edit ${label}` : `Tambah ${label}`}
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input required placeholder={`Kode ${label}`} value={form[codeKey]} onChange={e => setForm({ ...form, [codeKey]: e.target.value.toUpperCase() })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input required placeholder={`Nama ${label}`} value={form[nameKey]} onChange={e => setForm({ ...form, [nameKey]: e.target.value })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Telepon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Alamat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="AKTIF">AKTIF</option>
            <option value="NONAKTIF">NONAKTIF</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex gap-2 items-center transition shadow-sm">
            <Save className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 transition">Batal</button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Memuat data...</div>
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
              {rows.map(row => (
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
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(row.id || row.customer_code); setForm({ ...EMPTY, ...row }); }} className="text-blue-600 hover:underline font-medium text-xs">Edit</button>
                      {row.status === 'AKTIF' && (
                        <button onClick={() => deactivate(row)} className="text-red-600 hover:underline font-medium text-xs">Nonaktifkan</button>
                      )}
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
      </div>
    </div>
  );
}