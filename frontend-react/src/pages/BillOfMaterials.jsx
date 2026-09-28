import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ListTree, Save } from 'lucide-react';
import { createBom, getBoms, getProducts } from '../services/api';

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]); const [products, setProducts] = useState([]); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [form, setForm] = useState({ document_number: `BOM-${Date.now()}`, product_id: '', output_quantity: 1, unit: 'PCS', items: [{ product_id: '', quantity: 1, unit: 'PCS' }] });
  const load = useCallback(async () => { try { const [b, p] = await Promise.all([getBoms(), getProducts()]); setRows(b.data?.data || []); setProducts(p.data?.data || []); } catch (e) { setError(e.response?.data?.message || 'Data BOM gagal dimuat.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try { await createBom(form); setMessage('BOM berhasil disimpan.'); setForm({ ...form, document_number: `BOM-${Date.now()}`, items: [{ product_id: '', quantity: 1, unit: 'PCS' }] }); await load(); }
    catch (e) { setError(e.response?.data?.message || 'BOM gagal disimpan.'); }
  };
  const setItem = (index, key, value) => setForm({ ...form, items: form.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Tidak Aktif':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
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
                placeholder="Cari no. BOM atau produk..."
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <button type="submit" form="bom-form" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"><Plus className="h-4 w-4" />Simpan BOM</button>
        </div>

        {error && <div className="m-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}{message && <div className="m-5 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}
        <form id="bom-form" onSubmit={submit} className="p-5 grid md:grid-cols-3 gap-3 border-b border-slate-200"><input required value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} placeholder="Nomor BOM" className="border rounded-lg px-3 py-2 text-sm" /><select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm"><option value="">Pilih produk jadi</option>{products.filter(p => p.item_type === 'PRODUK JADI' || p.item_type === 'PRODUKSI').map(p => <option key={p.id} value={p.id}>{p.part_number || p.product_code} — {p.name}</option>)}</select><input required min="0.001" type="number" value={form.output_quantity} onChange={e => setForm({ ...form, output_quantity: e.target.value })} placeholder="Qty hasil" className="border rounded-lg px-3 py-2 text-sm" />{form.items.map((item, index) => <React.Fragment key={index}><select required value={item.product_id} onChange={e => setItem(index, 'product_id', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">Pilih komponen</option>{products.map(p => <option key={p.id} value={p.id}>{p.part_number || p.product_code} — {p.name}</option>)}</select><input required min="0.001" type="number" value={item.quantity} onChange={e => setItem(index, 'quantity', e.target.value)} placeholder="Qty komponen" className="border rounded-lg px-3 py-2 text-sm" /><select value={item.unit} onChange={e => setItem(index, 'unit', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option>PCS</option><option>METER</option><option>LOT</option></select></React.Fragment>)}</form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal Dibuat</th>
                <th className="px-6 py-4 font-medium">No. BOM</th>
                <th className="px-6 py-4 font-medium">Produk Jadi</th>
                <th className="px-6 py-4 font-medium">Kuantitas Hasil</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {rows.filter(item => !searchTerm || item.document_number.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (<tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"><td className="px-6 py-4">{item.created_at?.slice(0, 10)}</td><td className="px-6 py-4 font-medium text-blue-600">{item.document_number}</td><td className="px-6 py-4 font-medium">{item.product?.name || '-'}</td><td className="px-6 py-4 text-slate-500">{item.output_quantity} {item.unit}</td><td className="px-6 py-4">{item.status}</td><td className="px-6 py-4 text-right"><MoreVertical className="h-5 w-5 inline text-slate-400" /></td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}