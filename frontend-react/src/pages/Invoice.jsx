import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Plus, ArrowLeft, Save, Printer, RefreshCw, Package,
  Calendar, CheckCircle2, FileText, Truck
} from 'lucide-react';
import {
  getInvoices, getInvoice, createInvoice, updateInvoiceStatus,
  getSalesOrders, getDeliveryOrders
} from '../services/api';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';

export default function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    sales_order_id: '',
    delivery_order_id: '',
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_percentage: 11,
    notes: '',
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices();
      const raw = res.data.data || res.data;
      setInvoices(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Gagal memuat Invoice:', e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const openCreate = async () => {
    setError('');
    setFormData({
      sales_order_id: '',
      delivery_order_id: '',
      invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      tax_percentage: 11,
      notes: '',
    });
    setIsCreating(true);
    try {
      const [soRes, doRes] = await Promise.all([getSalesOrders(), getDeliveryOrders()]);
      const soRaw = soRes.data.data || soRes.data;
      const doRaw = doRes.data.data || doRes.data;
      setSalesOrders(Array.isArray(soRaw) ? soRaw : []);
      setDeliveryOrders(Array.isArray(doRaw) ? doRaw : []);
    } catch (e) {
      console.error(e);
    }
  };

  // DO yang relevan dengan SO terpilih (untuk menarik bukti pengiriman)
  const doOptions = deliveryOrders.filter(
    (d) => !formData.sales_order_id || String(d.sales_order_id) === String(formData.sales_order_id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sales_order_id) {
      setError('Pilih Sales Order (sumber harga) terlebih dahulu.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createInvoice({
        sales_order_id: formData.sales_order_id,
        delivery_order_id: formData.delivery_order_id || null,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        tax_percentage: parseFloat(formData.tax_percentage) || 0,
        notes: formData.notes,
      });
      setSuccessMsg('Invoice berhasil diterbitkan!');
      setIsCreating(false);
      fetchInvoices();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      const msg = e.response?.data?.message
        || (e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(' ') : 'Gagal menerbitkan Invoice.');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await getInvoice(id);
      setSelectedInv(res.data.data || res.data);
    } catch (e) {
      alert('Gagal mengambil detail Invoice.');
    }
  };

  const handleChangeStatus = async (id, status) => {
    try {
      await updateInvoiceStatus(id, status);
      setSelectedInv((prev) => (prev ? { ...prev, status } : prev));
      fetchInvoices();
      setSuccessMsg('Status Invoice diperbarui.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert('Gagal memperbarui status Invoice.');
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status) => {
    const map = {
      Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
      Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // ---------------- CETAK INVOICE ----------------
  const printInvoice = (inv) => {
    if (!inv) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Popup diblokir. Izinkan popup untuk mencetak Invoice.');
      return;
    }
    const rows = (inv.items || []).map((it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.part_number || '-')}</td>
        <td>${escapeHtml(it.description || '-')}</td>
        <td class="c">${it.qty}</td>
        <td class="c">${escapeHtml(it.unit || 'SET')}</td>
        <td class="r">${formatNumber(it.unit_price)}</td>
        <td class="r">${formatNumber(it.amount)}</td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoice_number)}</title>
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
        td.r, th.r { text-align:right; }
        .totals { margin-top:14px; display:flex; justify-content:flex-end; }
        .totals table { width:320px; }
        .totals td { border:none; padding:6px 10px; }
        .totals .grand td { border-top:2px solid #0f172a; font-weight:bold; font-size:15px; }
        .sign { margin-top:52px; text-align:right; font-size:13px; }
        .sign .line { margin-top:64px; border-top:1px solid #0f172a; width:220px; margin-left:auto; }
        .notes { margin-top:18px; font-size:12px; color:#475569; }
        .badge { display:inline-block; padding:4px 12px; border-radius:99px; font-size:12px; font-weight:bold; }
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
        <div class="title">INVOICE</div>
        <div class="subtitle">No. ${escapeHtml(inv.invoice_number)} &nbsp;|&nbsp; Status: ${escapeHtml(inv.status)}</div>
        <div class="meta">
          <div>
            <strong>Kepada:</strong><br/>
            ${escapeHtml(inv.customer_name || '-')}<br/>
            ${escapeHtml(inv.customer_address || '-')}
          </div>
          <div style="text-align:right">
            <strong>Tanggal Invoice:</strong> ${escapeHtml(inv.invoice_date || '-')}<br/>
            <strong>Jatuh Tempo:</strong> ${escapeHtml(inv.due_date || '-')}<br/>
            <strong>No. SO:</strong> ${escapeHtml(inv.so_number || '-')}<br/>
            <strong>No. DO (Bukti Kirim):</strong> ${escapeHtml(inv.do_number || '-')}
          </div>
        </div>
        <table>
          <thead><tr><th class="c" style="width:36px">No</th><th>Part Number</th><th>Deskripsi</th><th class="c" style="width:56px">Qty</th><th class="c" style="width:56px">Unit</th><th class="r" style="width:110px">Harga</th><th class="r" style="width:120px">Jumlah</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="c">Tidak ada item</td></tr>'}</tbody>
        </table>
        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td class="r">${formatNumber(inv.sub_total)}</td></tr>
            <tr><td>Pajak (${inv.tax_percentage || 0}%)</td><td class="r">${formatNumber(inv.tax_amount)}</td></tr>
            <tr class="grand"><td>Total Tagihan</td><td class="r">${formatNumber(inv.grand_total)}</td></tr>
          </table>
        </div>
        ${inv.notes ? `<div class="notes"><strong>Catatan:</strong> ${escapeHtml(inv.notes)}</div>` : ''}
        <div class="sign">
          <p>Hormat kami,</p>
          <div class="line"></div>
          <p>PT. Aldigens Putera Persada</p>
        </div>
        <script>window.onload = function(){ window.focus(); window.print(); };<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedInv && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-teal-600 p-3 rounded-xl shadow">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice</h1>
              <p className="text-sm text-slate-500 mt-1">Terbitkan tagihan resmi dari harga SO + bukti pengiriman DO.</p>
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-teal-500/20 transition-all cursor-pointer">
            <Plus className="w-5 h-5" />
            <span>Terbitkan Invoice</span>
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

      {/* ---------- FORM BUAT INVOICE ---------- */}
      {isCreating ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setIsCreating(false)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Formulir Invoice Baru</h2>
                <p className="text-sm text-slate-500">Harga otomatis ditarik dari SO; qty divalidasi terhadap bukti kirim (DO).</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Memproses...' : 'Terbitkan Invoice'}</span>
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sales Order (Sumber Harga) <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.sales_order_id}
                onChange={(e) => setFormData({ ...formData, sales_order_id: e.target.value, delivery_order_id: '' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition"
              >
                <option value="">-- Pilih SO --</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>{so.so_number} - {so.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Order (Bukti Kirim)</label>
              <select
                value={formData.delivery_order_id}
                onChange={(e) => setFormData({ ...formData, delivery_order_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition"
              >
                <option value="">-- Tanpa DO (opsional) --</option>
                {doOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.do_number} - {d.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Invoice</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Invoice</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jatuh Tempo</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pajak (%)</label>
              <input type="number" min="0" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.tax_percentage} onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Catatan</label>
            <input type="text" placeholder="Catatan / syarat pembayaran" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-5 text-sm text-teal-800 flex items-start gap-3">
            <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>Rincian item &amp; harga akan ditarik otomatis dari item Sales Order. Bila DO dipilih, jumlah yang ditagih mengikuti barang yang benar-benar dikirim sesuai Surat Jalan.</p>
          </div>
        </form>
      ) : selectedInv ? (

        /* ---------- DETAIL INVOICE ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedInv(null)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Invoice: {selectedInv.invoice_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedInv.invoice_date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedInv.status}
                onChange={(e) => handleChangeStatus(selectedInv.id, e.target.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border outline-none cursor-pointer ${statusBadge(selectedInv.status)}`}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button onClick={() => printInvoice(selectedInv)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer">
                <Printer className="w-4 h-4" /> Cetak Invoice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Customer</p>
              <p className="font-semibold text-slate-800">{selectedInv.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">No. SO</p>
              <p className="font-semibold text-slate-800">{selectedInv.so_number || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Truck className="w-3 h-3" /> No. DO</p>
              <p className="font-semibold text-slate-800">{selectedInv.do_number || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Jatuh Tempo</p>
              <p className="font-semibold text-slate-800">{selectedInv.due_date || '-'}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold w-36">Part Number</th>
                  <th className="p-4 font-bold">Deskripsi</th>
                  <th className="p-4 font-bold text-center w-20">Qty</th>
                  <th className="p-4 font-bold text-center w-20">Unit</th>
                  <th className="p-4 font-bold text-right w-40">Harga</th>
                  <th className="p-4 font-bold text-right w-44">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedInv.items || []).map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm font-semibold text-slate-700">{it.part_number || '-'}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{it.description}</td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">{it.qty}</td>
                    <td className="p-4 text-sm text-center text-slate-600">{it.unit}</td>
                    <td className="p-4 text-sm text-right text-slate-600">{formatRupiah(it.unit_price)}</td>
                    <td className="p-4 text-sm text-right font-bold text-slate-800">{formatRupiah(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-96 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-500">Subtotal</span>
                <span className="text-sm font-bold text-slate-800">{formatRupiah(selectedInv.sub_total)}</span>
              </div>
              <div className="flex justify-between items-center mb-5">
                <span className="text-sm font-medium text-slate-500">Pajak ({selectedInv.tax_percentage || 0}%)</span>
                <span className="text-sm font-bold text-slate-800">{formatRupiah(selectedInv.tax_amount)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-5">
                <span className="text-base font-extrabold text-slate-900">Total Tagihan</span>
                <span className="text-xl font-black text-teal-600">{formatRupiah(selectedInv.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ---------- LIST INVOICE ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. Invoice</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Ref. SO</th>
                  <th className="p-5 font-bold">Ref. DO</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold text-right">Total</th>
                  <th className="p-5 font-bold text-center">Status</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="8" className="text-center p-12 text-slate-400 text-sm">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...
                  </td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="8" className="text-center p-16 text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Receipt className="w-12 h-12 text-slate-200" />
                      <p className="font-medium">Belum ada Invoice yang diterbitkan.</p>
                    </div>
                  </td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{inv.invoice_number}</td>
                    <td className="p-5 text-slate-700 font-medium">{inv.customer_name}</td>
                    <td className="p-5 text-slate-500">{inv.so_number || '-'}</td>
                    <td className="p-5 text-slate-500">{inv.do_number || '-'}</td>
                    <td className="p-5 text-slate-500">{inv.invoice_date}</td>
                    <td className="p-5 text-right font-bold text-slate-800">{formatRupiah(inv.grand_total)}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(inv.status)}`}>{inv.status}</span>
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleViewDetail(inv.id)} className="text-teal-600 hover:text-white font-semibold text-xs bg-teal-50 hover:bg-teal-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
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

function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
