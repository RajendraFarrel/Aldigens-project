import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, ArrowLeft, Save, Trash2, Printer, CheckCircle2, RefreshCw, Calendar, DollarSign
} from 'lucide-react';
import api from '../services/api';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { swalError, swalSuccess } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const terbilang = (angka) => {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' Belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
  return '';
};

export default function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pagination = usePagination(invoices, 10);

  const [formData, setFormData] = useState({
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    do_reference: '',
    customer_name: '',
    customer_address: '',
    notes: 'Pembayaran ditransfer ke rekening PT. Aldigens Putera Persada',
    items: [],
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let apiInvoices = [];
      try {
        const res = await api.get('/invoices');
        apiInvoices = res.data?.data || res.data || [];
      } catch (err) {
        console.warn("API Invoice offline, menggunakan localStorage.");
      }
      const localInvoices = JSON.parse(localStorage.getItem('aldigens_invoices') || '[]');
      const combined = [...localInvoices, ...(Array.isArray(apiInvoices) ? apiInvoices : [])];
      setInvoices(combined);
    } catch (e) {
      console.error('Gagal memuat Invoice:', e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDOs = useCallback(async () => {
    try {
      let apiDOs = [];
      try {
        const res = await api.get('/delivery-orders');
        apiDOs = res.data?.data || res.data || [];
      } catch (err) {
        console.warn("API DO offline.");
      }
      const localDOs = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || localStorage.getItem('delivery_orders') || '[]');
      const combinedDOs = [...localDOs, ...(Array.isArray(apiDOs) ? apiDOs : [])];
      setDeliveryOrders(combinedDOs);
    } catch (e) {
      console.error('Gagal memuat DO:', e);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchDOs();
  }, [fetchInvoices, fetchDOs]);

  const handleSelectDO = (doNumber) => {
    setFormData((prev) => ({ ...prev, do_reference: doNumber, items: [] }));
    if (!doNumber) return;

    const selDO = deliveryOrders.find((d) => d.do_number === doNumber);
    if (selDO) {
      setFormData((prev) => ({
        ...prev,
        customer_name: selDO.customer_name || '',
        customer_address: selDO.delivery_address || '',
        items: (selDO.items || []).map(it => ({
          description: it.description || '-',
          qty: it.qty_sent || 1,
          unit_price: 0
        }))
      }));
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
      items: [...formData.items, { description: '', qty: 1, unit_price: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({
      invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      do_reference: '',
      customer_name: '',
      customer_address: '',
      notes: 'Pembayaran ditransfer ke rekening PT. Aldigens Putera Persada',
      items: [],
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError('Minimal ada 1 barang untuk ditagih.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const newInvoice = {
        id: Date.now(),
        ...formData,
        status: 'Unpaid'
      };

      const existing = JSON.parse(localStorage.getItem('aldigens_invoices') || '[]');
      localStorage.setItem('aldigens_invoices', JSON.stringify([newInvoice, ...existing]));

      try {
        await api.post('/invoices', formData);
      } catch (err) {
        // Backend opsional
      }

      setSuccessMsg('Invoice berhasil dibuat!');
      setIsCreating(false);
      resetForm();
      fetchInvoices();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError('Gagal menyimpan Invoice.');
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status) => {
    const map = {
      Unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
      Partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const printInvoice = (invData) => {
    if (!invData) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      swalError('Popup Diblokir', 'Izinkan popup untuk mencetak Invoice.');
      return;
    }

    const itemsList = invData.items || [];
    const subTotal = itemsList.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.unit_price || 0)), 0);
    const taxTotal = subTotal * 0.11;
    const grandTotal = subTotal + taxTotal;
    const textTerbilang = terbilang(grandTotal).trim() + ' Rupiah';

    const rows = itemsList.map((it, i) => `
      <tr>
        <td align="center">${i + 1}</td>
        <td>${escapeHtml(it.description || '-')}</td>
        <td align="center">${it.qty}</td>
        <td align="right">${Number(it.unit_price || 0).toLocaleString('id-ID')}</td>
        <td align="right">${(Number(it.qty) * Number(it.unit_price || 0)).toLocaleString('id-ID')}</td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${escapeHtml(invData.invoice_number)}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; margin: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area { width: 55%; vertical-align: top; }
            .company-address { font-size: 9px; line-height: 1.3; color: #333; margin-top: 4px; }
            .title-area { width: 45%; text-align: right; vertical-align: top; }
            .doc-title { font-size: 20px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 1px; color: #1e3a8a; }
            .info-box-table { width: 100%; margin-bottom: 12px; border: 1px solid #999; border-collapse: collapse; }
            .info-box-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #999; font-size: 10px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10px; }
            .items-table th { background: #f0f0f0; text-align: center; }
            .summary-table { width: 100%; margin-top: 10px; font-size: 10px; }
            .sign-container { margin-top: 40px; page-break-inside: avoid; }
            .sign-table { width: 100%; text-align: center; font-size: 10px; }
            .sign-box { height: 70px; }
            .terbilang-box { background: #f8fafc; padding: 6px; border: 1px solid #cbd5e1; font-style: italic; font-weight: bold; font-size: 10px; margin-bottom: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-area">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                  <img src="${logoPerusahaan}" alt="Logo" style="height: 45px; border-radius: 4px;" />
                  <span style="font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">PT. ALDIGENS PUTERA PERSADA</span>
                </div>
                <div class="company-address">
                  Ruko Bekasi Mas Blok C-25<br/>
                  Jl. Jend. Ahmad Yani, Margajaya, Bekasi Selatan - 17141
                </div>
              </td>
              <td class="title-area">
                <div class="doc-title">INVOICE / FAKTUR</div>
                <div><strong>No :</strong> ${escapeHtml(invData.invoice_number || '-')}</div>
              </td>
            </tr>
          </table>

          <table class="info-box-table">
            <tr>
              <td>
                <strong>Bill To :</strong><br/>
                <span style="font-size: 12px; font-weight: bold;">${escapeHtml(invData.customer_name || '-')}</span><br/>
                <span>${escapeHtml(invData.customer_address || '-')}</span>
              </td>
              <td style="vertical-align: middle;">
                <table style="width: 100%; font-size: 10px; border: none; margin: 0;">
                  <tr><td style="width: 40%; border: none; padding: 2px;"><strong>Invoice Date</strong></td><td style="border: none; padding: 2px;">: ${escapeHtml(invData.date || '-')}</td></tr>
                  <tr><td style="border: none; padding: 2px;"><strong>Due Date</strong></td><td style="border: none; padding: 2px;">: ${escapeHtml(invData.due_date || '-')}</td></tr>
                  <tr><td style="border: none; padding: 2px;"><strong>D.O Ref</strong></td><td style="border: none; padding: 2px;">: ${escapeHtml(invData.do_reference || '-')}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 50%;">Description</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 15%;">Unit Price</th>
                <th style="width: 20%;">Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5" align="center">Tidak ada item</td></tr>'}
            </tbody>
          </table>

          <div class="terbilang-box">
            Terbilang: <span># ${textTerbilang} #</span>
          </div>

          <table class="summary-table">
            <tr>
              <td style="width: 60%; vertical-align: top; padding-right: 15px;">
                <div style="line-height: 1.5; border: 1px solid #000; padding: 8px;">
                  <strong>Pembayaran mohon ditransfer ke rekening:</strong><br/>
                  Bank Permata<br/>
                  A/C : <strong>070.224.339-4</strong><br/>
                  A/N : <strong>PT. Aldigens Putera Persada</strong>
                </div>
                <div style="margin-top:8px; font-size:9px;">
                  Catatan: ${escapeHtml(invData.notes || '-')}
                </div>
              </td>
              <td style="width: 40%; vertical-align: bottom;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                  <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>Sub Total</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${subTotal.toLocaleString('id-ID')}</td></tr>
                  <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>PPN 11%</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${taxTotal.toLocaleString('id-ID')}</td></tr>
                  <tr><td style="padding: 6px; font-size: 13px; font-weight: bold; background: #e2e8f0;">Grand Total</td><td align="right" style="padding: 6px; font-size: 13px; font-weight: bold; background: #e2e8f0;">IDR ${grandTotal.toLocaleString('id-ID')}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="sign-container">
            <table class="sign-table">
              <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%;">
                  Bekasi, ${escapeHtml(invData.date)}<br/>
                  Hormat Kami,<br/>
                  <div class="sign-box"></div>
                  <strong>( FINANCE / DIREKTUR )</strong><br/>
                  <span style="font-size: 8px; color: #666;">PT. Aldigens Putera Persada</span>
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
      {!isCreating && !selectedInvoice && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-3 rounded-xl shadow">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice (Faktur Penjualan)</h1>
              <p className="text-sm text-slate-500 mt-1">Terbitkan tagihan resmi ke pelanggan berdasarkan Surat Jalan (DO) yang selesai.</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Invoice</span>
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
                <h2 className="text-xl font-bold text-slate-800">Formulir Invoice Baru</h2>
                <p className="text-sm text-slate-500">Tarik data dari D.O atau buat manual.</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Invoice'}</span>
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Referensi D.O (Opsional)</label>
              <select
                value={formData.do_reference}
                onChange={(e) => handleSelectDO(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="">-- Pilih D.O --</option>
                {deliveryOrders.map((d) => (
                  <option key={d.id} value={d.do_number}>{d.do_number} - {d.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Invoice</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Faktur</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jatuh Tempo (Due Date)</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Customer <span className="text-red-500">*</span></label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Penagihan <span className="text-red-500">*</span></label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition" value={formData.customer_address} onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-500" /> Rincian Tagihan
              </h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                Belum ada rincian tagihan. Tarik dari D.O atau tambah manual.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-6">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">DESKRIPSI BARANG</label>
                      <input type="text" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">QTY</label>
                      <input type="number" min="1" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-center" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">HARGA SATUAN (Rp)</label>
                      <input type="number" min="0" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-right" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} />
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
      ) : selectedInvoice ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedInvoice(null)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Invoice: {selectedInvoice.invoice_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedInvoice.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${statusBadge(selectedInvoice.status || 'Unpaid')}`}>
                {selectedInvoice.status || 'Unpaid'}
              </span>
              <button
                onClick={() => printInvoice(selectedInvoice)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Invoice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="col-span-2">
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Bill To</p>
              <p className="font-bold text-slate-800 text-base">{selectedInvoice.customer_name}</p>
              <p className="font-medium text-slate-600 text-sm mt-1">{selectedInvoice.customer_address || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Jatuh Tempo</p>
              <p className="font-semibold text-slate-800">{selectedInvoice.due_date || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Ref D.O</p>
              <p className="font-semibold text-slate-800">{selectedInvoice.do_reference || '-'}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold w-12 text-center">No</th>
                  <th className="p-4 font-bold">Deskripsi Barang</th>
                  <th className="p-4 font-bold text-center w-24">Qty</th>
                  <th className="p-4 font-bold text-right w-40">Harga Satuan</th>
                  <th className="p-4 font-bold text-right w-40">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedInvoice.items || []).length === 0 ? (
                  <tr><td colSpan="5" className="p-12 text-center text-sm text-slate-400">Tidak ada rincian.</td></tr>
                ) : selectedInvoice.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm font-semibold text-slate-500 text-center">{idx + 1}</td>
                    <td className="p-4 text-sm font-medium text-slate-700">{it.description}</td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">{it.qty}</td>
                    <td className="p-4 text-sm text-right text-slate-600">{formatRupiah(it.unit_price)}</td>
                    <td className="p-4 text-sm text-right font-bold text-slate-800">{formatRupiah(it.qty * it.unit_price)}</td>
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
                  <th className="p-5 font-bold">No. Invoice</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Jatuh Tempo</th>
                  <th className="p-5 font-bold text-center">Status</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center p-12 text-slate-400 text-sm">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...
                  </td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-16 text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText className="w-12 h-12 text-slate-200" />
                      <p className="font-medium">Belum ada Invoice yang diterbitkan.</p>
                    </div>
                  </td></tr>
                ) : pagination.paginatedItems.map((inv) => (
                  <tr key={inv.id || inv.invoice_number} className="hover:bg-slate-50/80 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{inv.invoice_number}</td>
                    <td className="p-5 text-slate-700 font-medium">{inv.customer_name}</td>
                    <td className="p-5 text-slate-500">{inv.date}</td>
                    <td className="p-5 text-slate-500">{inv.due_date}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(inv.status || 'Unpaid')}`}>{inv.status || 'Unpaid'}</span>
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => setSelectedInvoice(inv)} className="text-indigo-600 hover:text-white font-semibold text-xs bg-indigo-50 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
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