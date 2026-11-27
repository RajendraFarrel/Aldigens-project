import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, ArrowLeft, Save, Edit3, Trash2, Printer,
  RefreshCw, Eye, RotateCcw, Calendar, CheckCircle2, PackageCheck,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalSuccess, swalError } from '../utils/swal';

const SALES_RETURN_STORAGE_KEY = 'aldigens_sales_returns';
const INVOICE_STORAGE_KEY = 'aldigens_invoices';

const PRINT_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_SIGNER = { name: 'KHAFID YUSUF', title: 'Direktur' };

const pEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const emptyItem = (seq = 0) => ({
  id: Date.now() + seq,
  part_number: '',
  description: '',
  qty: 1,
  unit_price: 0,
  reason: 'Barang Cacat / Rusak',
});

function buildSalesReturnHtml(item, { autoPrint = false, logoUrl = '' } = {}) {
  const rows = Array.isArray(item.items) ? item.items : [];
  const totalValue = Number(
    item.amount ?? rows.reduce((sum, r) => sum + Number(r.qty || 0) * Number(r.unit_price || 0), 0)
  );

  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Return ${pEsc(item.returnNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; margin: 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .logo { width: 58mm; height: auto; display: block; margin-bottom: 4px; }
    .co-name { font-weight: 700; font-size: 12px; }
    .co-addr { line-height: 1.4; font-size: 10px; }
    .head-right { text-align: right; padding-top: 6mm; }
    .doc-title { font-size: 16px; font-weight: 700; text-decoration: underline; }
    .doc-no { font-size: 12px; font-weight: 700; margin-top: 3px; }
    .meta { margin-top: 12px; border: 1px solid #000; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
    .meta div { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #000; padding: 6px 8px; font-size: 10.5px; }
    th { background: #f3f4f6; text-align: left; }
    .r { text-align: right; }
    .c { text-align: center; }
    .total-box { margin-top: 12px; border: 2px solid #000; background: #f3f4f6; padding: 9px 14px; display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; }
    .sign-wrap { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; }
    .sign-col { width: 45%; }
    .space { height: 20mm; }
    .line { border-top: 1px dashed #000; width: 52mm; margin: 2px auto; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      ${logoTag}
      <div class="co-name">${pEsc(PRINT_COMPANY.name)}</div>
      <div class="co-addr">${PRINT_COMPANY.address.map(pEsc).join('<br/>')}</div>
    </div>
    <div class="head-right">
      <div class="doc-title">NOTA RETUR PENJUALAN</div>
      <div class="doc-no">No. ${pEsc(item.returnNo)}</div>
    </div>
  </div>

  <div class="meta">
    <div><strong>Pelanggan (Customer):</strong> ${pEsc(item.customerName)}</div>
    <div><strong>Tanggal Retur:</strong> ${pEsc(item.date)}</div>
    <div><strong>Referensi Invoice:</strong> ${pEsc(item.invoiceNo || '-')}</div>
    <div><strong>Jenis Penyelesaian:</strong> ${pEsc(item.settlementType || 'Potong Piutang')}</div>
    <div style="grid-column: 1 / -1;"><strong>Keterangan:</strong> ${pEsc(item.description || '-')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="c" style="width: 34px;">No</th>
        <th style="width: 120px;">Part Number</th>
        <th>Deskripsi Barang</th>
        <th class="c" style="width: 55px;">Qty</th>
        <th class="r" style="width: 105px;">Harga Satuan</th>
        <th style="width: 125px;">Alasan Retur</th>
        <th class="r" style="width: 115px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r, idx) => `<tr>
            <td class="c">${idx + 1}</td>
            <td>${pEsc(r.part_number || '-')}</td>
            <td>${pEsc(r.description || '-')}</td>
            <td class="c">${pEsc(r.qty)}</td>
            <td class="r">Rp ${pFmt(r.unit_price)}</td>
            <td>${pEsc(r.reason || '-')}</td>
            <td class="r">Rp ${pFmt(Number(r.qty || 0) * Number(r.unit_price || 0))}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="total-box">
    <span>TOTAL NILAI RETUR PENJUALAN :</span>
    <span>Rp ${pFmt(totalValue)}</span>
  </div>

  <div class="sign-wrap">
    <div class="sign-col">
      <div>Pelanggan,</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>${pEsc(item.customerName)}</div>
    </div>
    <div class="sign-col">
      <div>${pEsc(PRINT_COMPANY.name)}</div>
      <div class="space"></div>
      <div><strong>${pEsc(PRINT_SIGNER.name)}</strong></div>
      <div class="line"></div>
      <div>${pEsc(PRINT_SIGNER.title)}</div>
    </div>
  </div>
  ${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 400); };</script>' : ''}
</body>
</html>`;
}

export default function SalesReturn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [returns, setReturns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SALES_RETURN_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const rowSeq = useRef(1);

  const [formData, setFormData] = useState({
    returnNo: `SRET-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    invoiceNo: '',
    settlementType: 'Potong Piutang',
    status: 'Selesai',
    description: '',
    items: [emptyItem(0)],
  });

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    try {
      const [retRes, invRes] = await Promise.allSettled([
        api.get('/sales-returns', { timeout: 5000 }),
        api.get('/invoices', { timeout: 5000 }),
      ]);

      let apiReturns = [];
      if (retRes.status === 'fulfilled') {
        const raw = retRes.value?.data?.data || retRes.value?.data || [];
        apiReturns = Array.isArray(raw) ? raw : [];
      }
      const localReturns = JSON.parse(localStorage.getItem(SALES_RETURN_STORAGE_KEY) || '[]');
      const retMap = new Map();
      (Array.isArray(localReturns) ? localReturns : []).forEach((r) => {
        const key = r?.returnNo || r?.return_no || r?.id;
        if (key) retMap.set(key, r);
      });
      apiReturns.forEach((r) => {
        const key = r?.returnNo || r?.return_no || r?.id;
        if (key) retMap.set(key, r);
      });
      const unique = Array.from(retMap.values());
      setReturns(unique);
      localStorage.setItem(SALES_RETURN_STORAGE_KEY, JSON.stringify(unique));

      let apiInvoices = [];
      if (invRes.status === 'fulfilled') {
        const rawInv = invRes.value?.data?.data || invRes.value?.data || [];
        apiInvoices = Array.isArray(rawInv) ? rawInv : [];
      }
      const localInvoices = JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) || '[]');
      const invMap = new Map();
      (Array.isArray(localInvoices) ? localInvoices : []).forEach((inv) => {
        const key = inv?.invoice_number || inv?.invoiceNo || inv?.id;
        if (key) invMap.set(key, inv);
      });
      apiInvoices.forEach((inv) => {
        const key = inv?.invoice_number || inv?.invoiceNo || inv?.id;
        if (key) invMap.set(key, inv);
      });
      const uniqueInv = Array.from(invMap.values());
      setInvoices(uniqueInv);
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(uniqueInv));
    } catch {
      // Gunakan cache lokal jika offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const calcTotalReturn = (items = []) =>
    items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0), 0);

  const filteredReturns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter(
      (item) =>
        String(item.returnNo || item.return_no || '').toLowerCase().includes(q) ||
        String(item.customerName || item.customer_name || '').toLowerCase().includes(q) ||
        String(item.invoiceNo || item.invoice_no || '').toLowerCase().includes(q)
    );
  }, [returns, searchTerm]);

  const pagination = usePagination(filteredReturns, 10);

  const handleSelectInvoice = (invoiceNumber) => {
    if (!invoiceNumber) {
      setFormData((prev) => ({ ...prev, invoiceNo: '' }));
      return;
    }

    const found = invoices.find((inv) => (inv.invoice_number || inv.invoiceNo) === invoiceNumber);
    if (!found) return;

    const custName = found.customer?.customer_name || found.customer_name || found.customerName || '';
    const invItems = Array.isArray(found.items) ? found.items : [];

    const mappedItems =
      invItems.length > 0
        ? invItems.map((it) => ({
            id: Date.now() + rowSeq.current++,
            part_number: it.part_number || it.product?.part_number || it.code || '',
            description: it.description || it.product_name || it.product?.name || it.name || '',
            qty: Number(it.qty ?? it.quantity ?? 1),
            unit_price: Number(it.unit_price ?? it.price ?? 0),
            reason: 'Barang Cacat / Rusak',
          }))
        : [emptyItem(rowSeq.current++)];

    setFormData((prev) => ({
      ...prev,
      invoiceNo: invoiceNumber,
      customerName: custName || prev.customerName,
      description: `Retur penjualan atas Invoice ${invoiceNumber}`,
      items: mappedItems,
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }));
  };

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem(rowSeq.current++)],
    }));
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      returnNo: `SRET-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      invoiceNo: '',
      settlementType: 'Potong Piutang',
      status: 'Selesai',
      description: '',
      items: [emptyItem(rowSeq.current++)],
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    const existingItems =
      Array.isArray(item.items) && item.items.length > 0
        ? item.items
        : [
            {
              id: Date.now(),
              part_number: '-',
              description: item.description || 'Retur Barang',
              qty: 1,
              unit_price: Number(item.amount || 0),
              reason: item.description || 'Barang Cacat / Rusak',
            },
          ];

    setFormData({
      returnNo: item.returnNo || item.return_no || '',
      date: item.date || new Date().toISOString().split('T')[0],
      customerName: item.customerName || item.customer_name || '',
      invoiceNo: item.invoiceNo || item.invoice_no || '',
      settlementType: item.settlementType || 'Potong Piutang',
      status: item.status || 'Selesai',
      description: item.description || '',
      items: existingItems,
    });
    setViewMode('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const totalAmount = calcTotalReturn(formData.items);
    const payload = {
      id: editingId || `sret-${Date.now()}`,
      ...formData,
      amount: totalAmount,
    };

    try {
      if (editingId) {
        await api.put(`/sales-returns/${editingId}`, payload).catch(() => {});
      } else {
        const res = await api.post('/sales-returns', payload).catch(() => null);
        if (res?.data?.data?.id) payload.id = res.data.data.id;
      }

      const existing = JSON.parse(localStorage.getItem(SALES_RETURN_STORAGE_KEY) || '[]');
      const updatedList = editingId
        ? existing.map((x) => (x.id === editingId ? payload : x))
        : [payload, ...existing.filter((x) => x.returnNo !== payload.returnNo)];
      localStorage.setItem(SALES_RETURN_STORAGE_KEY, JSON.stringify(updatedList));
      setReturns(updatedList);

      swalSuccess(
        editingId ? 'Retur Diperbarui' : 'Sales Return Tersimpan',
        `${payload.returnNo} sebesar ${formatRupiah(totalAmount)} berhasil dicatat.`
      );
      loadData(true);
      setViewMode('list');
    } catch {
      swalError('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan retur penjualan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data retur penjualan ini?')) return;
    try {
      await api.delete(`/sales-returns/${id}`).catch(() => {});
    } catch {
      // abaikan jika offline
    }
    const updated = returns.filter((item) => item.id !== id);
    setReturns(updated);
    localStorage.setItem(SALES_RETURN_STORAGE_KEY, JSON.stringify(updated));
    if (selectedReturn?.id === id) setSelectedReturn(null);
    swalSuccess('Terhapus', 'Data retur penjualan berhasil dihapus.');
  };

  const handlePrint = (item) => {
    if (!item) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      swalError('Pop-up Diblokir', 'Izinkan pop-up pada browser untuk mencetak nota retur.');
      return;
    }
    printWindow.document.write(buildSalesReturnHtml(item, { autoPrint: true, logoUrl }));
    printWindow.document.close();
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const totalReturnAll = returns.reduce(
    (sum, r) => sum + Number(r.amount ?? calcTotalReturn(r.items)),
    0
  );
  const totalUnitsAll = returns.reduce(
    (sum, r) => sum + (Array.isArray(r.items) ? r.items.reduce((s, i) => s + Number(i.qty || 0), 0) : 0),
    0
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {viewMode === 'list' && !selectedReturn && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-sky-500/20 border border-sky-500/30 p-3 rounded-xl shadow">
                <RotateCcw className="h-6 w-6 text-sky-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Return</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Catat pengembalian barang dari pelanggan &amp; penyesuaian piutang Invoice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => loadData(false)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                title="Muat ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Buat Sales Return</span>
              </button>
            </div>
          </div>

          {/* 3 Kartu KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Nilai Retur Penjualan
                </p>
                <p className="text-xl font-extrabold text-sky-400 mt-1">{formatRupiah(totalReturnAll)}</p>
                <p className="text-xs text-slate-500 mt-1">{returns.length} nota retur pelanggan</p>
              </div>
              <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dokumen &amp; Barang Kembali
                </p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">
                  {returns.length} Dokumen ({totalUnitsAll} Unit)
                </p>
                <p className="text-xs text-slate-500 mt-1">Masuk kembali ke stok / credit note</p>
              </div>
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
                <PackageCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cari Retur / Pelanggan / Invoice
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="No. Retur, No. Invoice, atau Customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode Form Input / Edit */}
      {viewMode === 'form' ? (
        <form onSubmit={handleSave} className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingId ? 'Edit Sales Return' : 'Formulir Sales Return (Retur Penjualan)'}
                </h2>
                <p className="text-sm text-slate-400">
                  Pilih Invoice pelanggan untuk menarik item otomatis atau input barang yang diretur secara manual.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-slate-950 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Sales Return'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No. Sales Return</label>
              <input
                required
                type="text"
                value={formData.returnNo}
                onChange={(e) => setFormData({ ...formData, returnNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-sky-400 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Retur *</label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tarik dari Invoice Pelanggan (Opsional)
              </label>
              <select
                value={formData.invoiceNo}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">-- Pilih No. Invoice ({invoices.length}) --</option>
                {invoices.map((inv, idx) => {
                  const invNo = inv.invoice_number || inv.invoiceNo;
                  const cust = inv.customer?.customer_name || inv.customer_name || inv.customerName || 'Pelanggan';
                  return (
                    <option key={inv.id || idx} value={invNo}>
                      {invNo} - {cust}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Pelanggan *</label>
              <input
                required
                type="text"
                placeholder="Nama Pelanggan..."
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ref. No. Invoice Manual
              </label>
              <input
                type="text"
                placeholder="Contoh: INV-2085"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Jenis Penyelesaian
              </label>
              <select
                value={formData.settlementType}
                onChange={(e) => setFormData({ ...formData, settlementType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="Potong Piutang">Potong Piutang (Credit Note)</option>
                <option value="Tukar Barang Baru">Tukar Barang Baru (Replacement)</option>
                <option value="Refund Dana">Refund Dana ke Pelanggan</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Keterangan / Alasan Retur</label>
            <input
              type="text"
              placeholder="Catatan alasan pengembalian barang oleh pelanggan..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Tabel Barang Diretur */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Daftar Barang yang Dikembalikan Pelanggan
              </h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 text-xs bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris Retur
              </button>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5 w-40">Part Number</th>
                    <th className="px-4 py-3.5">Deskripsi Barang</th>
                    <th className="px-4 py-3.5 w-24 text-center">Qty</th>
                    <th className="px-4 py-3.5 w-40 text-right">Harga Satuan (Rp)</th>
                    <th className="px-4 py-3.5 w-44">Alasan Retur</th>
                    <th className="px-4 py-3.5 w-36 text-right">Subtotal</th>
                    <th className="px-4 py-3.5 w-14 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {formData.items.map((item, index) => {
                    const sub = Number(item.qty || 0) * Number(item.unit_price || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-center text-slate-500 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Part No..."
                            value={item.part_number}
                            onChange={(e) => handleItemChange(item.id, 'part_number', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            required
                            type="text"
                            placeholder="Nama / deskripsi barang..."
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            required
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(item.id, 'unit_price', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-right text-white outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.reason}
                            onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                          >
                            <option value="Barang Cacat / Rusak">Barang Cacat / Rusak</option>
                            <option value="Salah Kirim Tipe">Salah Kirim Tipe</option>
                            <option value="Tidak Sesuai Spesifikasi">Tidak Sesuai Spesifikasi</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sky-400">
                          {formatRupiah(sub)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(item.id)}
                            disabled={formData.items.length === 1}
                            className="p-1.5 hover:bg-rose-500/20 text-rose-400 disabled:opacity-30 rounded-lg transition cursor-pointer"
                            title="Hapus Baris"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 flex items-center gap-8">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Nilai Retur</span>
                <span className="text-xl font-black text-sky-400">
                  {formatRupiah(calcTotalReturn(formData.items))}
                </span>
              </div>
            </div>
          </div>
        </form>
      ) : selectedReturn ? (
        /* Mode Detail Sales Return */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedReturn(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Sales Return: {selectedReturn.returnNo}
                </h2>
                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedReturn.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {selectedReturn.status || 'Selesai'}
              </span>
              <button
                onClick={() => {
                  const target = selectedReturn;
                  setSelectedReturn(null);
                  handleOpenEditForm(target);
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-blue-400" /> Edit
              </button>
              <button
                onClick={() => handlePrint(selectedReturn)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Nota Retur
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Pelanggan (Customer)</p>
              <p className="text-base font-bold text-white mt-0.5">{selectedReturn.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Ref. Invoice &amp; Penyelesaian</p>
              <p className="font-mono font-semibold text-indigo-400 mt-0.5">
                {selectedReturn.invoiceNo || '-'} &bull; {selectedReturn.settlementType || 'Potong Piutang'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Total Nilai Retur</p>
              <p className="text-xl font-black text-sky-400 mt-0.5">
                {formatRupiah(selectedReturn.amount ?? calcTotalReturn(selectedReturn.items))}
              </p>
            </div>
          </div>

          {Array.isArray(selectedReturn.items) && selectedReturn.items.length > 0 && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Part Number</th>
                    <th className="p-4">Deskripsi Barang</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4 text-right">Harga Satuan</th>
                    <th className="p-4">Alasan</th>
                    <th className="p-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedReturn.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="p-4 font-mono text-slate-300">{it.part_number || '-'}</td>
                      <td className="p-4 font-semibold text-white">{it.description}</td>
                      <td className="p-4 text-center font-bold text-slate-200">{it.qty}</td>
                      <td className="p-4 text-right text-slate-300">{formatRupiah(it.unit_price)}</td>
                      <td className="p-4 text-slate-400">{it.reason}</td>
                      <td className="p-4 text-right font-bold text-sky-400">
                        {formatRupiah(Number(it.qty || 0) * Number(it.unit_price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tabel Daftar Utama */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="p-5 font-bold">No. Retur</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Ref. Invoice</th>
                  <th className="p-5 font-bold">Penyelesaian</th>
                  <th className="p-5 font-bold text-right">Nilai Retur</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {loading && returns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data retur penjualan...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-16 text-slate-500">
                      Belum ada dokumen Retur Penjualan (Sales Return).
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((item) => {
                    const rowValue = Number(item.amount ?? calcTotalReturn(item.items));
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-5 font-mono font-bold text-sky-400">{item.returnNo}</td>
                        <td className="p-5 text-slate-300">{item.date}</td>
                        <td className="p-5 font-semibold text-white">{item.customerName}</td>
                        <td className="p-5 font-mono text-indigo-400">{item.invoiceNo || '-'}</td>
                        <td className="p-5">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            {item.settlementType || 'Potong Piutang'}
                          </span>
                        </td>
                        <td className="p-5 text-right font-bold text-sky-400">
                          {formatRupiah(rowValue)}
                        </td>
                        <td className="p-5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedReturn(item)}
                              className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detail
                            </button>
                            <button
                              onClick={() => handlePrint(item)}
                              title="Cetak Nota Retur"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(item)}
                              title="Edit Retur"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Hapus Retur"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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