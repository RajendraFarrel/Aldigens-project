import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ClipboardList, Save } from 'lucide-react';
import { createPurchaseRequest, getProducts, getPurchaseRequests, updatePurchaseRequestStatus } from '../services/api';

export default function PurchaseRequisition() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ document_number: `PR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-4)}`, request_date: new Date().toISOString().slice(0, 10), request_type: 'PEMBELIAN', notes: '', items: [{ product_id: '', quantity: 1, unit: 'PCS', notes: '' }] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const [pr, p] = await Promise.all([getPurchaseRequests(), getProducts()]); setRows(pr.data?.data || []); setProducts(p.data?.data || []); } catch (e) { setError(e.response?.data?.message || 'Data PR gagal dimuat.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await createPurchaseRequest(form);
      setMessage('Purchase Request berhasil disimpan.');
      setForm({ ...form, document_number: `PR-${Date.now()}`, items: [{ product_id: '', quantity: 1, unit: 'PCS', notes: '' }] });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'PR gagal disimpan.');
    }
  };
  const setItem = (index, key, value) => setForm({ ...form, items: form.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const status = (value) => value === 'APPROVED' ? 'Disetujui' : value === 'REJECTED' ? 'Ditolak' : value === 'WAITING APPROVAL' ? 'Menunggu' : value;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Menunggu':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'Ditolak':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">

        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari no. PR atau departemen..."
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <button type="submit" form="purchase-request-form" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"><Plus className="h-4 w-4" />Simpan PR</button>
        </div>

        {error && <div className="m-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {message && <div className="m-5 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
        <form id="purchase-request-form" onSubmit={submit} className="p-5 grid md:grid-cols-3 gap-3 border-b border-slate-200"><input required value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} placeholder="Nomor PR" className="border rounded-lg px-3 py-2 text-sm" /><input required type="date" value={form.request_date} onChange={e => setForm({ ...form, request_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" /><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Keterangan" className="border rounded-lg px-3 py-2 text-sm" />{form.items.map((item, index) => <React.Fragment key={index}><select required value={item.product_id} onChange={e => setItem(index, 'product_id', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">Pilih Part Number</option>{products.map(p => <option key={p.id} value={p.id}>{p.part_number || p.product_code} — {p.name}</option>)}</select><input required min="0.001" type="number" value={item.quantity} onChange={e => setItem(index, 'quantity', e.target.value)} placeholder="Quantity" className="border rounded-lg px-3 py-2 text-sm" /><select value={item.unit} onChange={e => setItem(index, 'unit', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option>PCS</option><option>METER</option><option>LOT</option></select></React.Fragment>)}</form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. PR</th>
                <th className="px-6 py-4 font-medium">Departemen</th>
                <th className="px-6 py-4 font-medium">Pemohon</th>
                <th className="px-6 py-4 font-medium">Keterangan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {rows.filter(item => !searchTerm || `${item.document_number} ${item.notes || ''}`.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (<tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"><td className="px-6 py-4">{item.request_date}</td><td className="px-6 py-4 font-medium text-blue-600">{item.document_number}</td><td className="px-6 py-4">{item.request_type || '-'}</td><td className="px-6 py-4">{item.requester?.name || '-'}</td><td className="px-6 py-4 text-slate-500">{item.notes || '-'}</td><td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(status(item.status))}`}>{status(item.status)}</span></td><td className="px-6 py-4 text-right">{item.status === 'DRAFT' && <button onClick={() => updatePurchaseRequestStatus(item.id, 'WAITING APPROVAL').then(load)} className="text-blue-600 text-xs">Ajukan</button>}</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}