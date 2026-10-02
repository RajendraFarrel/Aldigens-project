import React, { useState, useEffect } from 'react';
import {
  FileSignature, Plus, ArrowLeft, Save, Trash2, Printer, CheckCircle2, RefreshCw, Calendar, Package, ArrowRightCircle, XCircle
} from 'lucide-react';
import { getProducts } from '../services/api';
import { swalError, swalToast } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function Quotation() {
  const [quotations, setQuotations] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const pagination = usePagination(quotations, 10);

  const [formData, setFormData] = useState({
    quotation_number: `AQ-${Math.floor(10000000 + Math.random() * 90000000)}`,
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    customer_name: '',
    customer_address: '',
    attention_person: '',
    subject: 'FABRICATION',
    model_unit: 'SY215H',
    admin_sales: 'Diah Ayu Komala',
    items: [],
  });

  useEffect(() => {
    fetchMasterProducts();
    const savedData = JSON.parse(localStorage.getItem('aldigens_quotations') || '[]');
    setQuotations(savedData);
  }, []);

  const fetchMasterProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await getProducts('');
      const dataProducts = res.data.data || res.data || [];
      setMasterProducts(dataProducts);
    } catch (e) {
      console.error("Gagal memuat produk dari API", e);
      const fallback = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      setMasterProducts(fallback);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;

    if (field === 'part_number') {
      const matched = masterProducts.find(
        (p) => 
          (p.part_number && p.part_number.toLowerCase() === value.toLowerCase()) || 
          (p.code && p.code.toLowerCase() === value.toLowerCase()) ||
          (p.name && p.name.toLowerCase() === value.toLowerCase())
      );

      if (matched) {
        items[index].part_number = matched.part_number || matched.code || value;
        items[index].description = matched.name || matched.description || '';
        items[index].unit = matched.unit || 'SET';
      }
    }

    setFormData({ ...formData, items });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', description: '', qty: 1, unit: 'SET', unit_price: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({
      quotation_number: `AQ-${Math.floor(10000000 + Math.random() * 90000000)}`,
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_name: '',
      customer_address: '',
      attention_person: '',
      subject: 'FABRICATION',
      model_unit: 'SY215H',
      admin_sales: 'Diah Ayu Komala',
      items: [],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      swalError('Error', 'Minimal ada 1 barang/jasa yang ditawarkan.');
      return;
    }
    setSaving(true);
    
    const newQuotation = {
      ...formData,
      id: Date.now(),
      status: 'Pending'
    };

    setTimeout(() => {
      const updatedList = [newQuotation, ...quotations];
      setQuotations(updatedList);
      localStorage.setItem('aldigens_quotations', JSON.stringify(updatedList));
      
      setSaving(false);
      setSuccessMsg('Quotation berhasil disimpan!');
      swalToast('Quotation berhasil disimpan', 'success');
      setIsCreating(false);
      resetForm();
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 400);
  };

  // --- DIUBAH AGAR LANGSUNG DIALIHKAN KE SALES ORDER (SO) ---
  const handleActionStatus = (q, newStatus, e) => {
    e.stopPropagation();
    
    if (newStatus === 'Deal') {
      const existingSOs = JSON.parse(localStorage.getItem('aldigens_sales_orders') || localStorage.getItem('sales_orders') || '[]');
      const filteredSOs = existingSOs.filter(so => so.quotation_number !== q.quotation_number && so.source_quotation !== q.quotation_number);
      
      const newSO = {
        ...q,
        id: Date.now(),
        so_number: `SO-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toISOString().split('T')[0],
        source_quotation: q.quotation_number,
        ref_po: '', // Bisa diisi nomor PO customer nantinya di form SO
        status: 'Open'
      };
      
      localStorage.setItem('aldigens_sales_orders', JSON.stringify([newSO, ...filteredSOs]));
      setSuccessMsg(`Penawaran ${q.quotation_number} berstatus Deal dan dialihkan ke Sales Order (SO)!`);
    } else {
      setSuccessMsg(`Penawaran ${q.quotation_number} ditandai Not Deal.`);
    }

    const updated = quotations.map(item => {
      if ((item.id && item.id === q.id) || (item.quotation_number === q.quotation_number)) {
        return { ...item, status: newStatus };
      }
      return item;
    });

    setQuotations(updated);
    localStorage.setItem('aldigens_quotations', JSON.stringify(updated));
    if (selectedQuotation && (selectedQuotation.quotation_number === q.quotation_number)) {
      setSelectedQuotation({ ...selectedQuotation, status: newStatus });
    }

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status) => {
    const map = {
      Pending: 'bg-amber-50 text-amber-700 border-amber-200',
      Deal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Not Deal': 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const printQuotation = (qData) => {
    if (!qData) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      swalError('Popup Diblokir', 'Izinkan popup untuk mencetak Quotation.');
      return;
    }

    const itemsList = qData.items || [];
    const subTotal = itemsList.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.unit_price || 0)), 0);
    const taxTotal = subTotal * 0.11;
    const grandTotal = subTotal + taxTotal;

    const rows = itemsList.map((it, i) => `
      <tr>
        <td align="center">${i + 1}</td>
        <td align="center">${escapeHtml(it.part_number || '-')}</td>
        <td>${escapeHtml(it.description || '-')}</td>
        <td align="center">${it.qty}</td>
        <td align="center">${escapeHtml(it.unit || 'SET')}</td>
        <td align="right">${Number(it.unit_price || 0).toLocaleString('id-ID')}</td>
        <td align="right">${(Number(it.qty) * Number(it.unit_price || 0)).toLocaleString('id-ID')}</td>
      </tr>`).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quotation - ${escapeHtml(qData.quotation_number)}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 15mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .logo-area { width: 60%; vertical-align: top; }
            .company-address { font-size: 9px; line-height: 1.3; color: #333; margin-top: 4px; }
            .title-area { width: 40%; text-align: right; vertical-align: top; }
            .doc-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
            .info-box-table { width: 100%; margin-bottom: 12px; border: 1px solid #000; border-collapse: collapse; }
            .info-box-table td { padding: 6px 8px; vertical-align: top; width: 50%; border: 1px solid #000; font-size: 10px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 6px; font-size: 10px; }
            .items-table th { background-color: #e2e8f0 !important; text-align: center; font-weight: bold; }
            .summary-table { width: 40%; float: right; font-size: 10px; border-collapse: collapse; border: 1px solid #000; }
            .summary-table td { padding: 5px; border: 1px solid #000; }
            .summary-table .total-row { background-color: #e2e8f0 !important; font-size: 12px; font-weight: bold; }
            .sign-container { margin-top: 70px; clear: both; page-break-inside: avoid; }
            .sign-table { width: 100%; text-align: center; font-size: 10px; }
            .sign-box { height: 60px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-area">
                <div style="margin-bottom: 3px;">
                  <img src="/LOGO ALDIGENS2.jpeg" alt="Logo" style="height: 45px; border-radius: 4px;" onerror="this.style.display='none'" />
                </div>
                <div class="company-address">
                  Ruko Bekasi Mas Blok C No. 25, Jl. Jend. A. Yani, Margajaya, Bekasi Selatan<br/>
                  Phone : (021) 89459445 | Email : aldigensppersada@gmail.com
                </div>
              </td>
              <td class="title-area">
                <div class="doc-title">QUOTATION</div>
                <div><strong>Reff :</strong> ${escapeHtml(qData.quotation_number || '-')}</div>
              </td>
            </tr>
          </table>

          <table class="info-box-table">
            <tr>
              <td>
                <strong>To :</strong><br/>
                <span style="font-size: 12px; font-weight: bold;">${escapeHtml(qData.customer_name || '-')}</span><br/>
                <span>${escapeHtml(qData.customer_address || '-')}</span><br/><br/>
                <span style="display:inline-block;"><strong>Up :</strong> ${escapeHtml(qData.attention_person || '-')}</span>
              </td>
              <td style="vertical-align: middle; padding: 0;">
                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                  <tr><td style="width: 35%; padding: 4px 8px; border-bottom: 1px solid #000; border-right: 1px solid #000;"><strong>Date</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #000;">${escapeHtml(qData.date || '-')}</td></tr>
                  <tr><td style="width: 35%; padding: 4px 8px; border-bottom: 1px solid #000; border-right: 1px solid #000;"><strong>Valid Until</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #000;">${escapeHtml(qData.valid_until || '-')}</td></tr>
                  <tr><td style="width: 35%; padding: 4px 8px; border-bottom: 1px solid #000; border-right: 1px solid #000;"><strong>Model Unit</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #000;">${escapeHtml(qData.model_unit || 'SY215H')}</td></tr>
                  <tr><td style="width: 35%; padding: 4px 8px; border-bottom: 1px solid #000; border-right: 1px solid #000;"><strong>Admin Sales</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #000;">${escapeHtml(qData.admin_sales || 'Diah Ayu Komala')}</td></tr>
                  <tr><td style="width: 35%; padding: 4px 8px; border-right: 1px solid #000;"><strong>Currency</strong></td><td style="padding: 4px 8px;">IDR (Rupiah)</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="font-size: 10px; margin-bottom: 8px;">
            <strong>Subject :</strong> ${escapeHtml(qData.subject || 'FABRICATION')}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">NO.</th>
                <th style="width: 20%;">PART NUMBER</th>
                <th style="width: 35%;">DESCRIPTION</th>
                <th style="width: 8%;">QTY</th>
                <th style="width: 7%;">UNIT</th>
                <th style="width: 12%;">UNIT PRICE</th>
                <th style="width: 13%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="7" align="center">Tidak ada item</td></tr>'}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; width: 100%;">
            <div style="width: 55%; font-size: 9px; line-height: 1.4; padding-right: 15px;">
              <strong>GENERAL SALES TERMS & CONDITION:</strong><br/>
              - Place of Delivery: Franco Jakarta<br/>
              - Terms of Delivery: Indent 3-5 days<br/>
              - Terms of Payment: Full payment 30 days after invoice received<br/>
              - Terms of Warranty: 1 Year<br/>
              <em>* Harga di atas sudah termasuk PPN 11%.<br/>* Pembayaran ditransfer ke rekening PT. Aldigens Putera Persada.</em>
            </div>
            
            <table class="summary-table">
              <tr>
                <td><strong>Total</strong></td>
                <td align="right">${subTotal.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td><strong>PPN 11%</strong></td>
                <td align="right">${taxTotal.toLocaleString('id-ID')}</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total</td>
                <td align="right">IDR ${grandTotal.toLocaleString('id-ID')}</td>
              </tr>
            </table>
          </div>

          <div class="sign-container">
            <table class="sign-table">
              <tr>
                <td style="width: 50%;">
                  Disetujui Oleh,<br/>
                  <div class="sign-box"></div>
                  <strong>( CUSTOMER )</strong><br/>
                  <span style="font-size: 8px; color: #666;">Tanda Tangan & Cap Perusahaan</span>
                </td>
                <td style="width: 50%;">
                  Hormat Kami,<br/>
                  <div class="sign-box"></div>
                  <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/><br/>
                  <strong>( ${escapeHtml(qData.admin_sales || 'Diah Ayu Komala')} )</strong><br/>
                  <span style="font-size: 8px; color: #666;">Admin Sales</span>
                </td>
              </tr>
            </table>
          </div>
          <script>window.onload = function() { window.focus(); setTimeout(() => { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedQuotation && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-teal-500 p-3 rounded-xl shadow">
              <FileSignature className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quotation (Penawaran)</h1>
              <p className="text-sm text-slate-500 mt-1">Buat dan cetak surat penawaran harga resmi untuk calon pelanggan.</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Penawaran</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* ---------- FORM BUAT QUOTATION ---------- */}
      {isCreating ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setIsCreating(false)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Formulir Penawaran Harga</h2>
                <p className="text-sm text-slate-500">Sesuaikan dengan standar format penawaran.</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Quotation'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Penawaran (Reff)</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.quotation_number} onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Berlaku Sampai (Valid Until)</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Model Unit</label>
              <input type="text" required placeholder="SY215H" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.model_unit} onChange={(e) => setFormData({ ...formData, model_unit: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Customer / Perusahaan <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="PT Sany Perkasa" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Kontak (Up) <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="Bapak Yanuar" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.attention_person} onChange={(e) => setFormData({ ...formData, attention_person: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin Sales</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.admin_sales} onChange={(e) => setFormData({ ...formData, admin_sales: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Customer <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="Jl. Angkasa 1-3 Gunung Sahari Utara..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.customer_address} onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Perihal / Subject</label>
              <input type="text" required placeholder="FABRICATION" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-500" /> Rincian Barang / Jasa (Part Number & Deskripsi)
              </h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                Belum ada item yang ditambahkan. Silakan klik tombol "Tambah Baris".
              </p>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">PART NUMBER (Ketik / Pilih)</label>
                      <input
                        type="text"
                        list={`master-parts-${index}`}
                        placeholder={loadingProducts ? "Memuat produk..." : "Ketik atau pilih Part No..."}
                        value={item.part_number}
                        onChange={(e) => handleItemChange(index, 'part_number', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                      <datalist id={`master-parts-${index}`}>
                        {masterProducts.map((prod, idx) => {
                          const pNo = prod.part_number || prod.code || '';
                          const pName = prod.name || prod.description || '';
                          return (
                            <option key={idx} value={pNo}>
                              {pName}
                            </option>
                          );
                        })}
                      </datalist>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">DESCRIPTION (Auto-filled)</label>
                      <input type="text" required placeholder="REINFORCE MODIFICATION..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">QTY</label>
                      <input type="number" min="1" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">UNIT</label>
                      <input type="text" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">HARGA SATUAN (Rp)</label>
                      <input type="number" min="0" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-right" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} />
                    </div>
                    <div className="md:col-span-1 text-right">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer mt-4">
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
      ) : selectedQuotation ? (

        /* ---------- DETAIL QUOTATION ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedQuotation(null)} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Penawaran: {selectedQuotation.quotation_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> Dibuat: {selectedQuotation.date} | Model Unit: {selectedQuotation.model_unit || 'SY215H'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${statusBadge(selectedQuotation.status || 'Pending')}`}>
                {selectedQuotation.status || 'Pending'}
              </span>
              <button
                onClick={() => printQuotation(selectedQuotation)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Penawaran
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="col-span-2">
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">To (Customer)</p>
              <p className="font-bold text-slate-800 text-base">{selectedQuotation.customer_name}</p>
              <p className="font-medium text-slate-600 text-sm mt-1">Up: {selectedQuotation.attention_person}</p>
              <p className="font-medium text-slate-600 text-sm">{selectedQuotation.customer_address}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Masa Berlaku, Unit & Admin</p>
              <p className="font-semibold text-rose-600">Berlaku s/d: {selectedQuotation.valid_until || '-'}</p>
              <p className="font-medium text-slate-800 text-sm mt-1">Subject: {selectedQuotation.subject} | Admin: {selectedQuotation.admin_sales}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold w-12 text-center">No</th>
                  <th className="p-4 font-bold">Part Number</th>
                  <th className="p-4 font-bold">Description</th>
                  <th className="p-4 font-bold text-center w-24">Qty / Unit</th>
                  <th className="p-4 font-bold text-right w-40">Harga Satuan</th>
                  <th className="p-4 font-bold text-right w-40">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedQuotation.items || []).length === 0 ? (
                  <tr><td colSpan="6" className="p-12 text-center text-sm text-slate-400">Tidak ada rincian.</td></tr>
                ) : selectedQuotation.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm font-semibold text-slate-500 text-center">{idx + 1}</td>
                    <td className="p-4 text-sm font-mono text-slate-600">{it.part_number}</td>
                    <td className="p-4 text-sm font-medium text-slate-700">{it.description}</td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">{it.qty} {it.unit}</td>
                    <td className="p-4 text-sm text-right text-slate-600">{formatRupiah(it.unit_price)}</td>
                    <td className="p-4 text-sm text-right font-bold text-slate-800">{formatRupiah(it.qty * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* ---------- LIST QUOTATION ---------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. Reff</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Subject / Unit</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold text-center">Status</th>
                  <th className="p-5 font-bold text-center">Aksi / Keputusan</th>
                  <th className="p-5 font-bold text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-16 text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileSignature className="w-12 h-12 text-slate-200" />
                      <p className="font-medium">Belum ada Penawaran yang diterbitkan.</p>
                    </div>
                  </td></tr>
                ) : pagination.paginatedItems.map((q) => {
                  const uniqueKey = q.id || q.quotation_number;
                  const isFinished = q.status === 'Deal' || q.status === 'Not Deal';
                  return (
                    <tr key={uniqueKey} className="hover:bg-slate-50/80 transition text-sm">
                      <td className="p-5 font-bold text-slate-800">{q.quotation_number}</td>
                      <td className="p-5 text-slate-700 font-medium">{q.customer_name}</td>
                      <td className="p-5 text-slate-600">{q.subject} ({q.model_unit || 'SY215H'})</td>
                      <td className="p-5 text-slate-500">{q.date}</td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(q.status || 'Pending')}`}>{q.status || 'Pending'}</span>
                      </td>
                      <td className="p-5 text-center">
                        {isFinished ? (
                          <span className="text-xs font-semibold text-slate-400 italic">
                            {q.status === 'Deal' ? 'Dialihkan ke Sales Order' : 'Tidak dilanjutkan'}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleActionStatus(q, 'Deal', e)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow transition cursor-pointer"
                            >
                              <ArrowRightCircle className="w-3.5 h-3.5" /> Deal (ke SO)
                            </button>
                            <button
                              onClick={(e) => handleActionStatus(q, 'Not Deal', e)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Not Deal
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <button onClick={() => setSelectedQuotation(q)} className="text-teal-600 hover:text-white font-semibold text-xs bg-teal-50 hover:bg-teal-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}