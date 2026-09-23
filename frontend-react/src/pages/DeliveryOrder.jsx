import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, ArrowLeft, Save, Trash2, Printer, Package, RefreshCw,
  FileText, MapPin, Calendar, User, CheckCircle2, X
} from 'lucide-react';
import {
  getDeliveryOrders, getDeliveryOrder, createDeliveryOrder, getSalesOrders, getSalesOrder
} from '../services/api';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { swalError } from '../utils/swal';

export default function DeliveryOrder() {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDO, setSelectedDO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    sales_order_id: '',
    do_number: `DO-${Math.floor(1000 + Math.random() * 9000)}`,
    do_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    delivery_address: '',
    vehicle_number: '',
    driver_name: '',
    notes: '',
    items: [],
  });

  const fetchDOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDeliveryOrders();
      const raw = res.data.data || res.data;
      setDeliveryOrders(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Gagal memuat DO:', e);
      setDeliveryOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSOs = useCallback(async () => {
    try {
      const res = await getSalesOrders();
      const raw = res.data.data || res.data;
      setSalesOrders(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Gagal memuat SO:', e);
    }
  }, []);

  useEffect(() => {
    fetchDOs();
    fetchSOs();
  }, [fetchDOs, fetchSOs]);

  // Pilih SO -> tarik jadwal & item untuk Surat Jalan
  const handleSelectSO = async (soId) => {
    setFormData((prev) => ({ ...prev, sales_order_id: soId, items: [] }));
    if (!soId) return;

    const so = salesOrders.find((s) => String(s.id) === String(soId));
    try {
      const res = await getSalesOrder(soId);
      const detail = res.data.data || res.data;
      const items = (detail.items || []).map((it) => ({
        part_number: it.part_number || it.product_id || '',
        description: it.description || '-',
        qty_sent: it.qty || 1,
        unit: it.unit || 'SET',
      }));

      setFormData((prev) => ({
        ...prev,
        sales_order_id: soId,
        customer_name: detail.customer_name || so?.customer_name || '',
        delivery_address: detail.customer_address || so?.customer_address || '',
        items: items.length ? items : [{ part_number: '', description: '-', qty_sent: 1, unit: 'SET' }],
      }));
    } catch (e) {
      console.error('Gagal ambil detail SO:', e);
      setError('Gagal mengambil detail SO.');
    }
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    setFormData({ ...formData, items });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', description: '-', qty_sent: 1, unit: 'SET' }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({
      sales_order_id: '',
      do_number: `DO-${Math.floor(1000 + Math.random() * 9000)}`,
      do_date: new Date().toISOString().split('T')[0],
      customer_name: '',
      delivery_address: '',
      vehicle_number: '',
      driver_name: '',
      notes: '',
      items: [],
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sales_order_id) {
      setError('Pilih Sales Order terlebih dahulu.');
      return;
    }
    if (formData.items.length === 0) {
      setError('Minimal ada 1 barang yang dikirim.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createDeliveryOrder(formData);
      setSuccessMsg('Surat Jalan (Delivery Order) berhasil dibuat!');
      setIsCreating(false);
      resetForm();
      fetchDOs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan Delivery Order.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await getDeliveryOrder(id);
      setSelectedDO(res.data.data || res.data);
    } catch (e) {
      swalError('Gagal Memuat', 'Gagal mengambil detail Delivery Order.');
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status) => {
    const map = {
      Shipped: 'bg-blue-50 text-blue-700 border-blue-200',
      Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // ---------------- CETAK SURAT JALAN ----------------
  const printSuratJalan = (doData) => {
    if (!doData) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      swalError('Popup Diblokir', 'Izinkan popup untuk mencetak Surat Jalan.');
      return;
    }
    const rows = (doData.items || []).map((it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.part_number || '-')}</td>
        <td>${escapeHtml(it.description || '-')}</td>
        <td class="c">${it.qty_sent}</td>
        <td class="c">${escapeHtml(it.unit || 'SET')}</td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Surat Jalan ${escapeHtml(doData.do_number)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
        .header { display:flex; align-items:center; gap:16px; border-bottom:3px solid #0f172a; padding-bottom:14px; }
        .header img { width:64px; height:64px; object-fit:cover; border-radius:8px; }
        .header h1 { margin:0; font-size:18px; }
        .header p { margin:2px 0 0; font-size:12px; color:#475569; }
        .title { text-align:center; margin:22px 0 6px; font-size:20px; font-weight:bold; text-decoration:underline; }
        .subtitle { text-align:center; font-size:12px; color:#475569; margin-bottom:20px; }
        .meta { display:flex; justify-content:space-between; font-size:13px; margin-bottom:16px; }
        .meta div { line-height:1.7; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th, td { border:1px solid #cbd5e1; padding:8px 10px; }
        th { background:#f1f5f9; text-align:left; }
        td.c, th.c { text-align:center; }
        .sign { display:flex; justify-content:space-between; margin-top:56px; font-size:13px; }
        .sign div { text-align:center; width:30%; }
        .sign .line { margin-top:64px; border-top:1px solid #0f172a; }
        .notes { margin-top:18px; font-size:12px; color:#475569; }
        @media print { body { padding:0; } }
      </style></head>
      <body>
        <div class="header">
          <img src="${logoPerusahaan}" alt="logo" />
          <div>
            <h1>PT. ALDIGENS PUTERA PERSADA</h1>
            <p>Sistem Terintegrasi PO &amp; Inventory</p>
          </div>
        </div>
        <div class="title">SURAT JALAN</div>
        <div class="subtitle">No. ${escapeHtml(doData.do_number)}</div>
        <div class="meta">
          <div>
            <strong>Kepada:</strong><br/>
            ${escapeHtml(doData.customer_name || '-')}<br/>
            ${escapeHtml(doData.delivery_address || '-')}
          </div>
          <div style="text-align:right">
            <strong>Tanggal:</strong> ${escapeHtml(doData.do_date || '-')}<br/>
            <strong>No. SO:</strong> ${escapeHtml(doData.so_number || doData.sales_order?.so_number || '-')}<br/>
            <strong>Kendaraan:</strong> ${escapeHtml(doData.vehicle_number || '-')}<br/>
            <strong>Driver:</strong> ${escapeHtml(doData.driver_name || '-')}
          </div>
        </div>
        <table>
          <thead><tr><th class="c" style="width:40px">No</th><th>Part Number</th><th>Deskripsi Barang</th><th class="c" style="width:70px">Qty</th><th class="c" style="width:70px">Unit</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="c">Tidak ada item</td></tr>'}</tbody>
        </table>
        ${doData.notes ? `<div class="notes"><strong>Catatan:</strong> ${escapeHtml(doData.notes)}</div>` : ''}
        <div class="sign">
          <div><p>Pengirim</p><div class="line"></div></div>
          <div><p>Pengemudi</p><div class="line"></div></div>
          <div><p>Penerima</p><div class="line"></div></div>
        </div>
        <script>window.onload = function(){ window.focus(); window.print(); };<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedDO && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-xl shadow">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Order (DO)</h1>
              <p className="text-sm text-slate-500 mt-1">Terbitkan Surat Jalan dari SO/SPK untuk mengawal pengiriman fisik barang.</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Surat Jalan</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {error && !isCreating && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* ---------- FORM BUAT DO ---------- */}
      {isCreating ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setIsCreating(false)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Formulir Surat Jalan Baru</h2>
                <p className="text-sm text-slate-500">Pilih Sales Order untuk menarik jadwal &amp; item pengiriman.</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan DO'}</span>
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Referensi Sales Order <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.sales_order_id}
                onChange={(e) => handleSelectSO(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
              >
                <option value="">-- Pilih SO --</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>{so.so_number} - {so.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Surat Jalan</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.do_number} onChange={(e) => setFormData({ ...formData, do_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Kirim</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.do_date} onChange={(e) => setFormData({ ...formData, do_date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Penerima / Customer</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Pengiriman</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nomor Kendaraan</label>
              <input type="text" placeholder="B 1234 XYZ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Pengemudi</label>
              <input type="text" placeholder="Nama driver" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Catatan</label>
              <input type="text" placeholder="Catatan pengiriman" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" /> Barang yang Dikirim
              </h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                Pilih Sales Order di atas untuk memuat daftar barang secara otomatis.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">PART NUMBER</label>
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" value={item.part_number} onChange={(e) => handleItemChange(index, 'part_number', e.target.value)} />
                    </div>
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">DESKRIPSI BARANG</label>
                      <input type="text" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">QTY KIRIM</label>
                      <input type="number" min="1" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-center" value={item.qty_sent} onChange={(e) => handleItemChange(index, 'qty_sent', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">UNIT</label>
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-center" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} />
                    </div>
                    <div className="md:col-span-1 text-right">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer mt-5 md:mt-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      ) : selectedDO ? (

        /* ---------- DETAIL DO ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedDO(null)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Surat Jalan: {selectedDO.do_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedDO.do_date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${statusBadge(selectedDO.status)}`}>
                {selectedDO.status}
              </span>
              <button
                onClick={() => printSuratJalan(selectedDO)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Surat Jalan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Penerima</p>
              <p className="font-semibold text-slate-800">{selectedDO.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Alamat Kirim</p>
              <p className="font-semibold text-slate-800 line-clamp-2">{selectedDO.delivery_address || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Kendaraan / Driver</p>
              <p className="font-semibold text-slate-800">{selectedDO.vehicle_number || '-'} / {selectedDO.driver_name || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Referensi SO</p>
              <p className="font-semibold text-slate-800">{selectedDO.so_number || selectedDO.sales_order?.so_number || '-'}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold w-40">Part Number</th>
                  <th className="p-4 font-bold">Deskripsi Barang</th>
                  <th className="p-4 font-bold text-center w-24">Qty Kirim</th>
                  <th className="p-4 font-bold text-center w-24">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedDO.items || []).length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-sm text-slate-400">Tidak ada item pengiriman.</td></tr>
                ) : selectedDO.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm font-semibold text-slate-700">{it.part_number || '-'}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{it.description}</td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">{it.qty_sent}</td>
                    <td className="p-4 text-sm text-center text-slate-600">{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ---------- LIST DO ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. Surat Jalan</th>
                  <th className="p-5 font-bold">Penerima</th>
                  <th className="p-5 font-bold">Ref. SO</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Kendaraan</th>
                  <th className="p-5 font-bold text-center">Status</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="7" className="text-center p-12 text-slate-400 text-sm">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...
                  </td></tr>
                ) : deliveryOrders.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-16 text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Truck className="w-12 h-12 text-slate-200" />
                      <p className="font-medium">Belum ada Surat Jalan yang diterbitkan.</p>
                    </div>
                  </td></tr>
                ) : deliveryOrders.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{d.do_number}</td>
                    <td className="p-5 text-slate-700 font-medium">{d.customer_name}</td>
                    <td className="p-5 text-slate-500">{d.so_number || d.sales_order?.so_number || '-'}</td>
                    <td className="p-5 text-slate-500">{d.do_date}</td>
                    <td className="p-5 text-slate-500">{d.vehicle_number || '-'}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleViewDetail(d.id)} className="text-orange-600 hover:text-white font-semibold text-xs bg-orange-50 hover:bg-orange-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
