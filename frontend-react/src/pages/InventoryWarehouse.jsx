import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, ClipboardPlus, PackageMinus, RefreshCw, Save } from 'lucide-react';
import { getProducts, getWarehouses, receiveInventory, issueInventory, transferInventory } from '../services/api';

const EMPTY = { barcode: '', quantity: 1, warehouse_id: '', warehouse_location_id: '', source_warehouse_id: '', source_location_id: '', destination_warehouse_id: '', destination_location_id: '', reference_number: '', notes: '' };

export default function InventoryWarehouse({ operation = 'receive' }) {
  const [form, setForm] = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const [p, w] = await Promise.all([getProducts(), getWarehouses()]); setProducts(p.data?.data || []); setWarehouses(w.data?.data || []); } catch (e) { setError(e.response?.data?.message || 'Data master gagal dimuat.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const locations = (id) => warehouses.find(w => String(w.id) === String(id))?.locations || [];
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const data = { ...form, quantity: Number(form.quantity) };
      let response;
      if (operation === 'receive') response = await receiveInventory(data);
      else if (operation === 'issue') response = await issueInventory(data);
      else response = await transferInventory(data);
      setMessage(response.data?.message || 'Transaksi warehouse berhasil disimpan.'); setForm(EMPTY);
    } catch (e) { setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Transaksi gagal disimpan.'); }
    finally { setLoading(false); }
  };
  const title = operation === 'receive' ? 'Penerimaan Barang' : operation === 'issue' ? 'Pengeluaran Barang' : 'Transfer Lokasi';
  const Icon = operation === 'receive' ? ClipboardPlus : operation === 'issue' ? PackageMinus : ArrowRightLeft;
  const warehouseSelect = (key, locationKey) => <><select required value={form[key]} onChange={e => { set(key, e.target.value); set(locationKey, ''); }} className="border rounded-lg px-3 py-2 text-sm"><option value="">Pilih Warehouse</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select><select value={form[locationKey]} onChange={e => set(locationKey, e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">Saldo umum / tanpa lokasi</option>{locations(form[key]).map(l => <option key={l.id} value={l.id}>{l.code}{l.name ? ` — ${l.name}` : ''}</option>)}</select></>;
  return <div className="p-6 max-w-6xl mx-auto w-full space-y-6"><div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800">{title}</h2><p className="text-sm text-slate-500">Semua perubahan stok dicatat sebagai mutasi inventory.</p></div><button onClick={load} className="p-2 border rounded-lg"><RefreshCw className="w-4 h-4" /></button></div>{error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}{message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}<form onSubmit={submit} className="bg-white rounded-2xl border p-5 shadow-sm space-y-4"><div className="grid md:grid-cols-2 gap-3"><select required value={form.barcode} onChange={e => set('barcode', e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">Pilih Part Number / Barcode</option>{products.map(p => <option key={p.id} value={p.barcode || p.part_number || p.product_code}>{p.part_number || p.product_code} — {p.name} (stok {p.stock})</option>)}</select><input required type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Quantity" className="border rounded-lg px-3 py-2 text-sm" />{operation === 'transfer' ? <>{warehouseSelect('source_warehouse_id', 'source_location_id')}{warehouseSelect('destination_warehouse_id', 'destination_location_id')}</> : <>{warehouseSelect('warehouse_id', 'warehouse_location_id')}</>}<input value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Nomor dokumen" className="border rounded-lg px-3 py-2 text-sm" /><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Keterangan" className="border rounded-lg px-3 py-2 text-sm md:col-span-2" /></div><button disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" />{loading ? 'Menyimpan...' : `Simpan ${title}`}</button></form></div>;
}
