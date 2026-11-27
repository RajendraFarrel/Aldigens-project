import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, ArrowLeft, Save, Trash2, Printer,
  CheckCircle2, RotateCcw, RefreshCw, Eye, PackageX, Calendar,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api, { getPurchaseInvoices } from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalSuccess, swalError } from '../utils/swal';

const RETURN_STORAGE_KEY = 'aldigens_purchase_returns';
const PI_STORAGE_KEY = 'aldigens_purchase_invoices';

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
  reason: 'Rusak / Cacat',
});

function buildReturnHtml(item, { autoPrint = false, logoUrl = '' } = {}) {
  const rows = Array.isArray(item.items) ? item.items : [];
  const totalValue = rows.reduce((sum, r) => sum + Number(r.qty || 0) * Number(r.unit_price || 0), 0);

  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Return ${pEsc(item.return_number)}</title>
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
      <div class="doc-title">NOTA RETUR PEMBELIAN</div>
      <div class="doc-no">No. ${pEsc(item.return_number)}</div>
    </div>
  </div>

  <div class="meta">
    <div><strong>Supplier:</strong> ${pEsc(item.supplier_name)}</div>
    <div><strong>Tanggal Retur:</strong> ${pEsc(item.date)}</div>
    <div><strong>Ref. Dokumen (PO/Invoice):</strong> ${pEsc(item.ref_document || '-')}</div>
    <div><strong>Jenis Penyelesaian:</strong> ${pEsc(item.settlement_type || 'Potong Tagihan')}</div>
    <div style="grid-column: 1 / -1;"><strong>Catatan:</strong> ${pEsc(item.notes || '-')}</div>
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
    <span>TOTAL NILAI RETUR PEMBELIAN :</span>
    <span>Rp ${pFmt(item.total_amount ?? totalValue)}</span>
  </div>

  <div class="sign-wrap">
    <div class="sign-col">
      <div>Penerima Barang Retur (Supplier),</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>${pEsc(item.supplier_name)}</div>
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

export default function PurchaseReturn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [returns, setReturns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RETURN_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [purchaseInvoices, setPurchaseInvoices] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PI_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState('list');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const rowSeq = useRef(1);

  const [formData, setFormData] = useState({
    return_number: `PRET-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    ref_document: '',
    settlement_type: 'Potong Tagihan',
    status: 'Diproses',
    notes: '',
    items: [emptyItem(0)],
  });

  const fetchAllData = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    try {
      const [retRes, invRes] = await Promise.allSettled([
        api.get('/purchase-returns', { timeout: 5000 }),
        getPurchaseInvoices(),
      ]);

      let apiReturns = [];
      if (retRes.status === 'fulfilled') {
        const raw = retRes.value?.data?.data || retRes.value?.data || [];
        apiReturns = Array.isArray(raw) ? raw : [];
      }
      const localReturns = JSON.parse(localStorage.getItem(RETURN_STORAGE_KEY) || '[]');
      const mergedMap = new Map();
      (Array.isArray(localReturns) ? localReturns : []).forEach((r) => {
        if (r?.return_number || r?.id) mergedMap.set(r.return_number || r.id, r);
      });
      apiReturns.forEach((r) => {
        if (r?.return_number || r?.id) mergedMap.set(r.return_number || r.id, r);
      });
      const uniqueReturns = Array.from(mergedMap.values());
      setReturns(uniqueReturns);
      localStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify(uniqueReturns));

      const localInv = JSON.parse(localStorage.getItem(PI_STORAGE_KEY) || '[]');
      if (invRes.status === 'fulfilled') {
        const rawInv = invRes.value?.data?.data ?? invRes.value?.data ?? invRes.value ?? [];
        const apiInvList = Array.isArray(rawInv) ? rawInv : [];
        const mergedInvMap = new Map();
        (Array.isArray(localInv) ? localInv : []).forEach((inv) => {
          const key = inv.invoice_number || inv.supplier_invoice_number || inv.id;
          if (key) mergedInvMap.set(key, inv);
        });
        apiInvList.forEach((inv) => {
          const key = inv.invoice_number || inv.supplier_invoice_number || inv.id;
          if (key) mergedInvMap.set(key, inv);
        });
        const uniqueInv = Array.from(mergedInvMap.values());
        setPurchaseInvoices(uniqueInv);
        localStorage.setItem(PI_STORAGE_KEY, JSON.stringify(uniqueInv));
      } else {
        setPurchaseInvoices(Array.isArray(localInv) ? localInv : []);
      }
    } catch {
      const localReturns = JSON.parse(localStorage.getItem(RETURN_STORAGE_KEY) || '[]');
      setReturns(Array.isArray(localReturns) ? localReturns : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  const calcTotalReturn = (items = []) =>
    items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0), 0);

  const filteredReturns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter(
      (item) =>
        String(item.return_number || '').toLowerCase().includes(q) ||
        String(item.supplier_name || '').toLowerCase().includes(q) ||
        String(item.ref_document || '').toLowerCase().includes(q)
    );
  }, [returns, searchTerm]);

  const pagination = usePagination(filteredReturns, 10);

  const handleOpenAddForm = () => {
    setFormData({
      return_number: `PRET-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split('T')[0],
      supplier_name: '',
      ref_document: '',
      settlement_type: 'Potong Tagihan',
      status: 'Diproses',
      notes: '',
      items: [emptyItem(rowSeq.current++)],
    });
    setViewMode('form');
  };

  const handleSelectReferenceInvoice = (invoiceNumber) => {
    if (!invoiceNumber) {
      setFormData((prev) => ({ ...prev, ref_document: '' }));
      return;
    }

    const found = purchaseInvoices.find(
      (inv) => (inv.invoice_number || inv.supplier_invoice_number) === invoiceNumber
    );
    if (!found) return;

    const supplierName = found.supplier?.supplier_name || found.supplier_name || '';
    const invItems = Array.isArray(found.items) ? found.items : [];
    const invNo = found.invoice_number || found.supplier_invoice_number;

    const mappedItems =
      invItems.length > 0
        ? invItems.map((it) => ({
            id: Date.now() + rowSeq.current++,
            part_number: it.part_number || it.product?.part_number || it.code || '',
            description: it.description || it.product_name || it.product?.name || it.name || '',
            qty: Number(it.qty ?? it.quantity ?? 1),
            unit_price: Number(it.unit_price ?? it.price ?? 0),
            reason: 'Rusak / Cacat',
          }))
        : [emptyItem(rowSeq.current++)];

    setFormData((prev) => ({
      ...prev,
      ref_document: invNo,
      supplier_name: supplierName || prev.supplier_name,
      notes: `Retur barang dari faktur ${invNo}`,
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const totalAmount = calcTotalReturn(formData.items);
    const payload = {
      id: `pret-${Date.now()}`,
      ...formData,
      total_amount: totalAmount,
    };

    try {
      try {
        const res = await api.post('/purchase-returns', payload);
        if (res.data?.data?.id) payload.id = res.data.data.id;
      } catch {
        // Fallback ke localStorage bila endpoint belum aktif
      }

      const existing = JSON.parse(localStorage.getItem(RETURN_STORAGE_KEY) || '[]');
      const updatedList = [payload, ...existing.filter((x) => x.return_number !== payload.return_number)];
      localStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify(updatedList));
      setReturns(updatedList);

      swalSuccess('Retur Tersimpan', `${payload.return_number} berhasil dicatat.`);
      fetchAllData(true);
      setViewMode('list');
    } catch {
      swalError('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data retur.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'Selesai' ? 'Diproses' : 'Selesai';
    try {
      await api.put(`/purchase-returns/${item.id}`, { status: nextStatus }).catch(() => {});
    } catch {
      // abaikan jika offline
    }
    const updated = returns.map((r) => (r.id === item.id ? { ...r, status: nextStatus } : r));
    setReturns(updated);
    localStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify(updated));
    if (selectedReturn?.id === item.id) {
      setSelectedReturn({ ...item, status: nextStatus });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus dokumen retur pembelian ini?')) return;
    try {
      await api.delete(`/purchase-returns/${id}`).catch(() => {});
    } catch {
      // abaikan jika offline
    }
    const updated = returns.filter((item) => item.id !== id);
    setReturns(updated);
    localStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify(updated));
    if (selectedReturn?.id === id) setSelectedReturn(null);
    swalSuccess('Terhapus', 'Dokumen retur pembelian berhasil dihapus.');
  };

  const handlePrint = (item) => {
    if (!item) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      swalError('Pop-up Diblokir', 'Izinkan pop-up pada browser untuk mencetak nota retur.');
      return;
    }
    printWindow.document.write(buildReturnHtml(item, { autoPrint: true, logoUrl }));
    printWindow.document.close();
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const totalReturnAll = returns.reduce(
    (sum, r) => sum + Number(r.total_amount ?? calcTotalReturn(r.items)),
    0
  );
  const totalReturnedUnits = returns.reduce(
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
              <div className="bg-amber-500/20 border border-amber-500/30 p-3 rounded-xl shadow">
                <PackageX className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Purchase Return</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Catat pengembalian barang rusak/tidak sesuai ke supplier &amp; penyesuaian stok/utang.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => fetchAllData(false)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                title="Muat ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Buat Retur Pembelian</span>
              </button>
            </div>
          </div>

          {/* 3 Kartu KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Nilai Retur Pembelian
                </p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">{formatRupiah(totalReturnAll)}</p>
                <p className="text-xs text-slate-500 mt-1">{returns.length} dokumen nota retur</p>
              </div>
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dokumen &amp; Item Diretur
                </p>
                <p className="text-xl font-extrabold text-sky-400 mt-1">
                  {returns.length} Nota Retur ({totalReturnedUnits} Unit)
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {returns.filter((r) => r.status !== 'Selesai').length} nota dalam proses penyelesaian
                </p>
              </div>
              <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl">
                <PackageX className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cari Retur / Supplier
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="No. Retur, No. PO/Invoice, atau Supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode Form Input Retur */}
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
                <h2 className="text-xl font-bold text-white">Formulir Purchase Return (Retur Pembelian)</h2>
                <p className="text-sm text-slate-400">
                  Pilih Purchase Invoice untuk menarik item otomatis atau isi daftar barang retur secara manual.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Retur Pembelian'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No. Retur</label>
              <input
                type="text"
                required
                value={formData.return_number}
                onChange={(e) => setFormData({ ...formData, return_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-amber-400 font-bold outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Retur *</label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tarik dari Purchase Invoice (Opsional)
              </label>
              <select
                value={formData.ref_document}
                onChange={(e) => handleSelectReferenceInvoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">-- Pilih No. Purchase Invoice ({purchaseInvoices.length}) --</option>
                {purchaseInvoices.map((inv, idx) => {
                  const invNo = inv.invoice_number || inv.supplier_invoice_number;
                  return (
                    <option key={inv.id || idx} value={invNo}>
                      {invNo} - {inv.supplier?.supplier_name || inv.supplier_name || 'Supplier'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Supplier *</label>
              <input
                required
                type="text"
                placeholder="Contoh: PT. Garda Teknik Mandiri"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ref. PO / Invoice Manual
              </label>
              <input
                type="text"
                placeholder="Contoh: PI-1042 / PO-2026-001"
                value={formData.ref_document}
                onChange={(e) => setFormData({ ...formData, ref_document: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Jenis Penyelesaian Retur
              </label>
              <select
                value={formData.settlement_type}
                onChange={(e) => setFormData({ ...formData, settlement_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Potong Tagihan">Potong Tagihan (Debit Note)</option>
                <option value="Tukar Barang Baru">Tukar Barang Baru (Replacement)</option>
                <option value="Refund Dana">Refund Dana ke Kas / Bank</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Keterangan / Catatan</label>
            <input
              type="text"
              placeholder="Catatan tambahan terkait pengembalian barang..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Tabel Item Diretur */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Daftar Barang yang Diretur
              </h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer"
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
                            required
                            type="text"
                            placeholder="Part No..."
                            value={item.part_number}
                            onChange={(e) => handleItemChange(item.id, 'part_number', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            required
                            type="text"
                            placeholder="Nama / deskripsi barang..."
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            required
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(item.id, 'unit_price', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-right text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.reason}
                            onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="Rusak / Cacat">Rusak / Cacat</option>
                            <option value="Salah Spesifikasi">Salah Spesifikasi</option>
                            <option value="Kelebihan Kirim">Kelebihan Kirim</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-400">
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
                <span className="text-xl font-black text-amber-400">
                  {formatRupiah(calcTotalReturn(formData.items))}
                </span>
              </div>
            </div>
          </div>
        </form>
      ) : selectedReturn ? (
        /* Mode Detail Nota Retur */
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
                  Retur: {selectedReturn.return_number}
                </h2>
                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedReturn.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleToggleStatus(selectedReturn)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                  selectedReturn.status === 'Selesai'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
                title="Klik untuk ubah status"
              >
                {selectedReturn.status === 'Selesai' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {selectedReturn.status || 'Diproses'}
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
              <p className="text-xs text-slate-500 uppercase font-bold">Supplier Tujuan Retur</p>
              <p className="text-base font-bold text-white mt-0.5">{selectedReturn.supplier_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Ref. Dokumen &amp; Penyelesaian</p>
              <p className="font-mono font-semibold text-indigo-400 mt-0.5">
                {selectedReturn.ref_document || '-'} &bull; {selectedReturn.settlement_type || 'Potong Tagihan'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Total Nilai Retur</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">
                {formatRupiah(selectedReturn.total_amount ?? calcTotalReturn(selectedReturn.items))}
              </p>
            </div>
          </div>

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
                {(selectedReturn.items || []).map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="p-4 font-mono text-slate-300">{it.part_number || '-'}</td>
                    <td className="p-4 font-semibold text-white">{it.description}</td>
                    <td className="p-4 text-center font-bold text-slate-200">{it.qty}</td>
                    <td className="p-4 text-right text-slate-300">{formatRupiah(it.unit_price)}</td>
                    <td className="p-4 text-slate-400">{it.reason}</td>
                    <td className="p-4 text-right font-bold text-amber-400">
                      {formatRupiah(Number(it.qty || 0) * Number(it.unit_price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <th className="p-5 font-bold">Supplier</th>
                  <th className="p-5 font-bold">Ref. PO / Invoice</th>
                  <th className="p-5 font-bold">Penyelesaian</th>
                  <th className="p-5 font-bold text-right">Nilai Retur</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {loading && returns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data retur pembelian...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-16 text-slate-500">
                      Belum ada dokumen Retur Pembelian (Purchase Return).
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((item) => {
                    const rowValue = Number(item.total_amount ?? calcTotalReturn(item.items));
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-5 font-mono font-bold text-amber-400">{item.return_number}</td>
                        <td className="p-5 text-slate-300">{item.date}</td>
                        <td className="p-5 font-semibold text-white">{item.supplier_name}</td>
                        <td className="p-5 font-mono text-indigo-400">{item.ref_document || '-'}</td>
                        <td className="p-5">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            {item.settlement_type || 'Potong Tagihan'}
                          </span>
                        </td>
                        <td className="p-5 text-right font-bold text-amber-400">
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