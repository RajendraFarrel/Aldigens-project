import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, ArrowLeft, Save, Trash2, Printer, Package, RefreshCw,
  Calendar, CheckCircle2
} from 'lucide-react';
import {
  getDeliveryOrders, getDeliveryOrder, createDeliveryOrder, getSalesOrders, getSalesOrder
} from '../services/api';
import { swalError } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function DeliveryOrder() {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDO, setSelectedDO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pagination = usePagination(deliveryOrders, 10);

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
      let apiData = [];
      try {
        const res = await getDeliveryOrders();
        apiData = res.data.data || res.data || [];
      } catch (err) {
        console.warn("API DO tidak aktif, menggunakan localStorage.");
      }

      const localSaved = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || localStorage.getItem('delivery_orders') || '[]');
      const combined = [...localSaved, ...(Array.isArray(apiData) ? apiData : [])];
      setDeliveryOrders(combined);
    } catch (e) {
      console.error('Gagal memuat DO:', e);
      setDeliveryOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSOs = useCallback(async () => {
    try {
      let apiSOs = [];
      try {
        const res = await getSalesOrders();
        apiSOs = res.data.data || res.data || [];
      } catch (err) {
        console.warn("API SO tidak aktif.");
      }

      const localSOs = JSON.parse(localStorage.getItem('aldigens_sales_orders') || localStorage.getItem('sales_orders') || '[]');
      const combinedSOs = [...localSOs, ...(Array.isArray(apiSOs) ? apiSOs : [])];
      setSalesOrders(combinedSOs);
    } catch (e) {
      console.error('Gagal memuat SO:', e);
    }
  }, []);

  useEffect(() => {
    fetchDOs();
    fetchSOs();
  }, [fetchDOs, fetchSOs]);

  const handleSelectSO = async (soId) => {
    setFormData((prev) => ({ ...prev, sales_order_id: soId, items: [] }));
    if (!soId) return;

    const so = salesOrders.find((s) => String(s.id) === String(soId) || String(s.soNo) === String(soId));
    if (!so) return;

    const items = (so.items || []).map((it) => ({
      part_number: it.code || it.part_number || '',
      description: it.name || it.description || '-',
      qty_sent: it.qty || it.qty_sent || 1,
      unit: it.unit || 'PCS',
    }));

    setFormData((prev) => ({
      ...prev,
      sales_order_id: soId,
      customer_name: so.customer || so.customer_name || '',
      delivery_address: so.shipTo || so.customer_address || '',
      vehicle_number: so.sentBy || '',
      items: items.length ? items : [{ part_number: '', description: '-', qty_sent: 1, unit: 'PCS' }],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    setFormData({ ...formData, items });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', description: '-', qty_sent: 1, unit: 'PCS' }],
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
      const newDO = {
        id: Date.now(),
        ...formData,
        status: 'Shipped',
        so_number: formData.sales_order_id
      };

      const existing = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]');
      localStorage.setItem('aldigens_delivery_orders', JSON.stringify([newDO, ...existing]));

      try {
        await createDeliveryOrder(formData);
      } catch (err) {
        // Backend opsional
      }

      setSuccessMsg('Surat Jalan (Delivery Order) berhasil dibuat!');
      setIsCreating(false);
      resetForm();
      fetchDOs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError('Gagal menyimpan Delivery Order.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = (item) => {
    setSelectedDO(item);
  };

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
        <td align="center">${i + 1}</td>
        <td>${escapeHtml(it.part_number || '-')}</td>
        <td>${escapeHtml(it.description || '-')}</td>
        <td align="center"><strong>${it.qty_sent} ${escapeHtml(it.unit || 'PCS')}</strong></td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Surat Jalan - ${escapeHtml(doData.do_number)}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; margin: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area { width: 60%; vertical-align: top; }
            .company-address { font-size: 9px; line-height: 1.3; color: #333; margin-top: 4px; }
            .title-area { width: 40%; text-align: right; vertical-align: top; }
            .doc-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
            .meta-table { width: 100%; font-size: 10px; margin-bottom: 12px; }
            .meta-table td { vertical-align: top; padding: 2px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 6px; font-size: 10px; }
            .items-table th { background: #f0f0f0; text-align: center; }
            .sign-container { margin-top: 50px; page-break-inside: avoid; }
            .sign-table { width: 100%; text-align: center; font-size: 10px; }
            .sign-box { height: 70px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-area">
                <div style="margin-bottom: 4px;">
                  <img src="/LOGO ALDIGENS2.jpeg" alt="Logo Aldigens" style="height: 45px; width: auto; object-fit: contain;" />
                </div>
                <div class="company-address">
                  Ruko Bekasi Mas Blok C-25<br/>
                  Jl. Jend. Ahmad Yani, Margajaya, Bekasi Selatan - 17141
                </div>
              </td>
              <td class="title-area">
                <div class="doc-title">DELIVERY ORDER</div>
                <div style="font-size: 11px;"><strong>Surat Jalan</strong></div>
              </td>
            </tr>
          </table>

          <table class="meta-table">
            <tr>
              <td style="width: 60%;">
                <table style="width: 100%; font-size: 10px;">
                  <tr><td style="width: 20%;"><strong>Deliver To</strong></td><td>: ${escapeHtml(doData.customer_name || '-')}</td></tr>
                  <tr><td><strong>Address</strong></td><td>: ${escapeHtml(doData.delivery_address || '-')}</td></tr>
                  <tr><td><strong>Driver</strong></td><td>: ${escapeHtml(doData.driver_name || '-')}</td></tr>
                </table>
              </td>
              <td style="width: 40%;">
                <table style="width: 100%; font-size: 10px;">
                  <tr><td style="width: 40%;"><strong>D.O Number</strong></td><td>: ${escapeHtml(doData.do_number || '-')}</td></tr>
                  <tr><td><strong>Date</strong></td><td>: ${escapeHtml(doData.do_date || '-')}</td></tr>
                  <tr><td><strong>SO Ref</strong></td><td>: ${escapeHtml(doData.so_number || '-')}</td></tr>
                  <tr><td><strong>Vehicle No.</strong></td><td>: ${escapeHtml(doData.vehicle_number || '-')}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">Item No.</th>
                <th style="width: 55%;">Description</th>
                <th style="width: 15%;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" align="center">Tidak ada item</td></tr>'}
            </tbody>
          </table>

          <div style="font-size: 10px; margin-bottom: 20px;">
            <strong>Keterangan:</strong><br/>
            ${escapeHtml(doData.notes || 'Barang diterima dalam kondisi baik dan lengkap sesuai pesanan.')}
          </div>

          <div class="sign-container">
            <table class="sign-table">
              <tr>
                <td style="width: 33%;">
                  Dibuat Oleh,<br/>
                  <div class="sign-box"></div>
                  <strong>( WAREHOUSE )</strong>
                </td>
                <td style="width: 33%;">
                  Pengirim / Supir,<br/>
                  <div class="sign-box"></div>
                  <strong>( LOGISTIK )</strong>
                </td>
                <td style="width: 33%;">
                  Diterima Oleh,<br/>
                  <div class="sign-box"></div>
                  <strong>( CUSTOMER )</strong><br/>
                  <span style="font-size: 8px; color: #666;">Tgl / Cap Perusahaan</span>
                </td>
              </tr>
            </table>
          </div>
          <script>window.onload = function(){ window.focus(); window.print(); };</script>
        </body>
      </html>
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
              <p className="text-sm text-slate-500 mt-1">Terbitkan Surat Jalan dari SO untuk mengawal pengiriman fisik barang.</p>
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
                  <option key={so.id || so.soNo} value={so.soNo || so.so_number || so.id}>
                    {so.soNo || so.so_number} - {so.customer || so.customer_name}
                  </option>
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
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">PART NUMBER / KODE</label>
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
              <p className="font-semibold text-slate-800">{selectedDO.so_number || '-'}</p>
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
                ) : pagination.paginatedItems.map((d, index) => (
                  <tr key={d.id || index} className="hover:bg-slate-50/80 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{d.do_number}</td>
                    <td className="p-5 text-slate-700 font-medium">{d.customer_name}</td>
                    <td className="p-5 text-slate-500">{d.so_number || '-'}</td>
                    <td className="p-5 text-slate-500">{d.do_date}</td>
                    <td className="p-5 text-slate-500">{d.vehicle_number || '-'}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleViewDetail(d)} className="text-orange-600 hover:text-white font-semibold text-xs bg-orange-50 hover:bg-orange-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controller */}
          <Pagination
            currentPage={pagination.currentPage}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
          />
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