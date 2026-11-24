import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt, Plus, ArrowLeft, Save, Printer, CheckCircle2,
  RefreshCw, Calendar, Wallet, Search, Eye,
} from 'lucide-react';
import api from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalSuccess, swalError } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const RECEIPT_STORAGE_KEY = 'aldigens_sales_receipts';

const PRINT_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_SIGNER = { name: 'KHAFID YUSUF', title: 'Direktur' };

const pEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const calcInvoiceGrandTotal = (inv) => {
  if (!inv) return 0;
  const direct = Number(inv.grand_total ?? inv.total_amount ?? 0);
  if (direct > 0) return direct;
  const sub = (inv.items || []).reduce((acc, it) => {
    const qty = Number(it.qty ?? it.quantity ?? 0);
    const price = Number(it.unit_price ?? it.price ?? 0);
    const disc = Number(it.discount ?? it.discount_percent ?? 0);
    return acc + qty * price * (1 - disc / 100);
  }, 0);
  const taxPct = Number(inv.tax_percentage ?? 11);
  return Math.round(sub * (1 + taxPct / 100));
};

function buildReceiptHtml(rec, { autoPrint = false, logoUrl = '' } = {}) {
  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Receipt ${pEsc(rec.receipt_number)}</title>
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
    .box { margin-top: 14px; border: 1px solid #000; padding: 12px; }
    .row { display: flex; padding: 5px 0; border-bottom: 1px dashed #ccc; }
    .row:last-child { border-bottom: none; }
    .lbl { width: 170px; font-weight: 700; }
    .val { flex: 1; }
    .amount-box { margin-top: 14px; border: 2px solid #000; background: #f3f4f6; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; }
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
      <div class="doc-title">BUKTI PENERIMAAN PEMBAYARAN</div>
      <div class="doc-no">No. ${pEsc(rec.receipt_number)}</div>
    </div>
  </div>

  <div class="box">
    <div class="row"><div class="lbl">Tanggal Terima</div><div class="val">: ${pEsc(rec.date)}</div></div>
    <div class="row"><div class="lbl">Diterima Dari (Customer)</div><div class="val">: <strong>${pEsc(rec.customer_name)}</strong></div></div>
    <div class="row"><div class="lbl">Referensi No. Invoice</div><div class="val">: ${pEsc(rec.invoice_number)}</div></div>
    <div class="row"><div class="lbl">Metode Pembayaran</div><div class="val">: ${pEsc(rec.payment_method)}</div></div>
    <div class="row"><div class="lbl">Masuk Ke Akun</div><div class="val">: ${pEsc(rec.bank_account)}</div></div>
    <div class="row"><div class="lbl">Keterangan</div><div class="val">: ${pEsc(rec.notes || '-')}</div></div>
  </div>

  <div class="amount-box">
    <span>JUMLAH DITERIMA :</span>
    <span>Rp ${pFmt(rec.amount_received)}</span>
  </div>

  <div class="sign-wrap">
    <div class="sign-col">
      <div>Penyetor / Pelanggan,</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>${pEsc(rec.customer_name)}</div>
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

export default function SalesReceipt() {
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    receipt_number: `SR-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    invoice_id: '',
    invoice_number: '',
    customer_name: '',
    invoice_total: 0,
    already_paid: 0,
    remaining_balance: 0,
    amount_received: '',
    payment_method: 'Transfer Bank',
    bank_account: 'Bank Permata (070.224.339-4)',
    notes: '',
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, invRes] = await Promise.allSettled([
        api.get('/sales-receipts'),
        api.get('/invoices'),
      ]);

      let apiReceipts = [];
      if (recRes.status === 'fulfilled') {
        const raw = recRes.value.data?.data || recRes.value.data || [];
        apiReceipts = Array.isArray(raw) ? raw : [];
      }
      const localReceipts = JSON.parse(localStorage.getItem(RECEIPT_STORAGE_KEY) || '[]');
      const mergedReceipts = [...apiReceipts, ...localReceipts];
      const uniqueReceipts = Array.from(
        new Map(mergedReceipts.map((r) => [r.receipt_number || r.id, r])).values()
      );
      setReceipts(uniqueReceipts);

      if (invRes.status === 'fulfilled') {
        const rawInv = invRes.value.data?.data || invRes.value.data || [];
        setInvoices(Array.isArray(rawInv) ? rawInv : []);
      }
    } catch (e) {
      console.error('Gagal memuat Sales Receipt / Invoice:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Hitung total terbayar per nomor invoice dari riwayat Sales Receipt
  const paidByInvoiceMap = useMemo(() => {
    const map = {};
    receipts.forEach((r) => {
      const key = String(r.invoice_number || '').trim();
      if (!key) return;
      map[key] = (map[key] || 0) + Number(r.amount_received || r.amount || 0);
    });
    return map;
  }, [receipts]);

  // Hanya tampilkan Invoice yang statusnya belum Paid dan sisa tagihannya > 0
  const unpaidInvoices = useMemo(() => {
    return invoices
      .map((inv) => {
        const total = calcInvoiceGrandTotal(inv);
        const paid = paidByInvoiceMap[inv.invoice_number] ?? Number(inv.paid_amount || 0);
        const remaining = Math.max(0, total - paid);
        return { ...inv, _total: total, _paid: paid, _remaining: remaining };
      })
      .filter((inv) => inv.status !== 'Paid' && inv._remaining > 0);
  }, [invoices, paidByInvoiceMap]);

  const filteredReceipts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter(
      (r) =>
        String(r.receipt_number || '').toLowerCase().includes(q) ||
        String(r.invoice_number || '').toLowerCase().includes(q) ||
        String(r.customer_name || '').toLowerCase().includes(q)
    );
  }, [receipts, searchTerm]);

  const pagination = usePagination(filteredReceipts, 10);

  const resetForm = () => {
    setFormData({
      receipt_number: `SR-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split('T')[0],
      invoice_id: '',
      invoice_number: '',
      customer_name: '',
      invoice_total: 0,
      already_paid: 0,
      remaining_balance: 0,
      amount_received: '',
      payment_method: 'Transfer Bank',
      bank_account: 'Bank Permata (070.224.339-4)',
      notes: '',
    });
    setError('');
  };

  const handleSelectInvoice = (invoiceNumber) => {
    if (!invoiceNumber) {
      resetForm();
      return;
    }
    const found = unpaidInvoices.find((inv) => inv.invoice_number === invoiceNumber);
    if (!found) return;

    setFormData((prev) => ({
      ...prev,
      invoice_id: found.id || '',
      invoice_number: found.invoice_number,
      customer_name: found.customer_name || '',
      invoice_total: found._total,
      already_paid: found._paid,
      remaining_balance: found._remaining,
      amount_received: found._remaining,
      notes: `Pelunasan Invoice ${found.invoice_number} - ${found.customer_name}`,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const received = Number(formData.amount_received || 0);

    if (!formData.invoice_number && !formData.customer_name) {
      setError('Pilih nomor Invoice atau isi nama customer terlebih dahulu.');
      return;
    }
    if (received <= 0) {
      setError('Nominal pembayaran diterima harus lebih besar dari 0.');
      return;
    }
    if (formData.invoice_number && received > formData.remaining_balance + 1) {
      setError(`Nominal diterima melebihi sisa tagihan (${formatRupiah(formData.remaining_balance)}).`);
      return;
    }

    setSaving(true);
    setError('');

    const newReceipt = {
      id: `sr-${Date.now()}`,
      receipt_number: formData.receipt_number,
      date: formData.date,
      invoice_id: formData.invoice_id,
      invoice_number: formData.invoice_number || '-',
      customer_name: formData.customer_name,
      invoice_total: Number(formData.invoice_total || received),
      amount_received: received,
      payment_method: formData.payment_method,
      bank_account: formData.bank_account,
      notes: formData.notes,
    };

    try {
      // 1. Simpan Sales Receipt ke backend (dengan fallback localStorage jika endpoint belum ada)
      try {
        const res = await api.post('/sales-receipts', newReceipt);
        if (res.data?.data) newReceipt.id = res.data.data.id;
      } catch {
        const existingLocal = JSON.parse(localStorage.getItem(RECEIPT_STORAGE_KEY) || '[]');
        localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify([newReceipt, ...existingLocal]));
      }

      // 2. Perbarui status Invoice menjadi Paid atau Partial
      if (formData.invoice_id) {
        const newTotalPaid = Number(formData.already_paid || 0) + received;
        const nextStatus = newTotalPaid >= Number(formData.invoice_total || 0) ? 'Paid' : 'Partial';
        try {
          await api.put(`/invoices/${formData.invoice_id}`, {
            status: nextStatus,
            paid_amount: newTotalPaid,
          });
        } catch (invErr) {
          console.warn('Gagal update status invoice otomatis:', invErr);
        }
      }

      // 3. Catat otomatis ke mutasi Kas & Bank (Dashboard Keuangan)
      try {
        await api.post('/financial-mutations', {
          transaction_type: 'IN',
          reference_number: formData.receipt_number,
          date: formData.date,
          bank_account: formData.bank_account,
          contact_name: formData.customer_name,
          amount: received,
          description: formData.notes || `Penerimaan pembayaran ${formData.invoice_number}`,
        });
      } catch {
        // abaikan jika endpoint mutasi offline
      }

      swalSuccess('Pembayaran Tercatat', `${formData.receipt_number} berhasil disimpan & saldo piutang diperbarui.`);
      setIsCreating(false);
      resetForm();
      fetchAllData();
    } catch (err) {
      console.error(err);
      swalError('Gagal Menyimpan', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan Sales Receipt.');
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const printReceipt = (rec) => {
    if (!rec) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const win = window.open('', '_blank');
    if (!win) {
      swalError('Pop-up diblokir browser. Izinkan pop-up untuk mencetak bukti pembayaran.');
      return;
    }
    win.document.write(buildReceiptHtml(rec, { autoPrint: true, logoUrl }));
    win.document.close();
  };

  const totalReceivedAll = receipts.reduce((sum, r) => sum + Number(r.amount_received || r.amount || 0), 0);
  const totalOutstandingAll = unpaidInvoices.reduce((sum, inv) => sum + Number(inv._remaining || 0), 0);

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedReceipt && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-xl shadow">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Receipt</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Catat pelunasan &amp; termin pembayaran Invoice dari pelanggan ke Kas / Bank.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchAllData}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                title="Muat ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { resetForm(); setIsCreating(true); }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Input Penerimaan</span>
              </button>
            </div>
          </div>

          {/* Ringkasan Piutang & Penerimaan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pembayaran Diterima</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{formatRupiah(totalReceivedAll)}</p>
                <p className="text-xs text-slate-500 mt-1">{receipts.length} transaksi kwitansi</p>
              </div>
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sisa Piutang Belum Lunas</p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">{formatRupiah(totalOutstandingAll)}</p>
                <p className="text-xs text-slate-500 mt-1">{unpaidInvoices.length} invoice menunggu pelunasan</p>
              </div>
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cari Kwitansi / Invoice</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="No. Receipt, No. Invoice, atau Customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {isCreating ? (
        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Formulir Sales Receipt (Penerimaan Pembayaran)</h2>
                <p className="text-sm text-slate-400">Pilih nomor Invoice aktif untuk pelunasan penuh atau pembayaran bertahap.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan & Update Piutang'}</span>
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No. Sales Receipt</label>
              <input
                type="text"
                required
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Terima *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih Invoice Belum Lunas</label>
              <select
                value={formData.invoice_number}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">-- Pilih No. Invoice ({unpaidInvoices.length} aktif) --</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv.id || inv.invoice_number} value={inv.invoice_number}>
                    {inv.invoice_number} - {inv.customer_name} (Sisa: {formatRupiah(inv._remaining)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Customer *</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Metode Pembayaran</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai / Cash">Tunai / Cash</option>
                <option value="Cek / Giro">Cek / Giro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Akun Penerima (Kas &amp; Bank)</label>
              <select
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Bank Permata (070.224.339-4)">Bank Permata (070.224.339-4)</option>
                <option value="Kas Kecil (Petty Cash)">Kas Kecil (Petty Cash)</option>
              </select>
            </div>
          </div>

          {/* Kartu Ringkasan Tagihan vs Pembayaran */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div>
              <p className="text-xs text-slate-400">Total Tagihan Invoice</p>
              <p className="text-lg font-bold text-slate-200 mt-0.5">{formatRupiah(formData.invoice_total)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sudah Dibayar Sebelumnya</p>
              <p className="text-lg font-bold text-sky-400 mt-0.5">{formatRupiah(formData.already_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sisa Piutang Invoice</p>
              <p className="text-lg font-extrabold text-amber-400 mt-0.5">{formatRupiah(formData.remaining_balance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Jumlah Pembayaran Diterima (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Masukkan nominal yang diterima..."
                value={formData.amount_received}
                onChange={(e) => setFormData({ ...formData, amount_received: e.target.value })}
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-3 text-base font-extrabold text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Keterangan / Catatan</label>
              <input
                type="text"
                placeholder="Contoh: Pelunasan Invoice / Termin 1..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>
      ) : selectedReceipt ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Receipt: {selectedReceipt.receipt_number}
                </h2>
                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedReceipt.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Diterima
              </span>
              <button
                onClick={() => printReceipt(selectedReceipt)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Kwitansi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Diterima Dari</p>
                <p className="text-base font-bold text-white mt-0.5">{selectedReceipt.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Referensi Invoice</p>
                <p className="font-mono font-semibold text-indigo-400 mt-0.5">{selectedReceipt.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Keterangan</p>
                <p className="text-slate-300 mt-0.5">{selectedReceipt.notes || '-'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Metode &amp; Akun Penerima</p>
                <p className="text-slate-200 font-semibold mt-0.5">
                  {selectedReceipt.payment_method} &bull; {selectedReceipt.bank_account}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-500 uppercase font-bold">Jumlah Diterima</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {formatRupiah(selectedReceipt.amount_received || selectedReceipt.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="p-5 font-bold">No. Receipt</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Ref. Invoice</th>
                  <th className="p-5 font-bold">Akun Masuk</th>
                  <th className="p-5 font-bold text-right">Nominal Diterima</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data...
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-16 text-slate-500">
                      Belum ada bukti penerimaan pembayaran (Sales Receipt).
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((rec) => (
                    <tr key={rec.id || rec.receipt_number} className="hover:bg-slate-800/50 transition">
                      <td className="p-5 font-mono font-bold text-emerald-400">{rec.receipt_number}</td>
                      <td className="p-5 text-slate-300">{rec.date}</td>
                      <td className="p-5 font-semibold text-white">{rec.customer_name}</td>
                      <td className="p-5 font-mono text-indigo-400">{rec.invoice_number}</td>
                      <td className="p-5 text-slate-400 text-xs">{rec.bank_account}</td>
                      <td className="p-5 text-right font-bold text-emerald-400">
                        {formatRupiah(rec.amount_received || rec.amount)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedReceipt(rec)}
                            className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                          <button
                            onClick={() => printReceipt(rec)}
                            title="Cetak Kwitansi"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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