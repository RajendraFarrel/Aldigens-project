import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt, Plus, ArrowLeft, Save, Edit3, Trash2, Printer,
  RefreshCw, Search, Eye, Wallet, Calendar, CheckCircle2,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api, {
  getPurchasePayments,
  getPurchaseInvoices,
  createPurchasePayment,
  updatePurchasePayment,
  deletePurchasePayment,
} from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalSuccess, swalError } from '../utils/swal';

const PP_STORAGE_KEY = 'aldigens_purchase_payments';
const PI_STORAGE_KEY = 'aldigens_purchase_invoices';

const PRINT_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_SIGNER = { name: 'KHAFID YUSUF', title: 'Direktur' };

const pEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

function buildPaymentVoucherHtml(item, { autoPrint = false, logoUrl = '' } = {}) {
  const pNo = item.paymentNo || item.payment_no || '-';
  const vName = item.vendorName || item.vendor_name || '-';
  const pMethod = item.paymentMethod || item.payment_method || '-';
  const invRef = item.invoice_reference || '-';
  const amount = Number(item.amount || 0);

  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Payment ${pEsc(pNo)}</title>
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
    .lbl { width: 185px; font-weight: 700; }
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
      <div class="doc-title">BUKTI PENGELUARAN KAS / BANK</div>
      <div class="doc-no">No. ${pEsc(pNo)}</div>
    </div>
  </div>

  <div class="box">
    <div class="row"><div class="lbl">Tanggal Pembayaran</div><div class="val">: ${pEsc(item.date)}</div></div>
    <div class="row"><div class="lbl">Dibayarkan Kepada (Supplier)</div><div class="val">: <strong>${pEsc(vName)}</strong></div></div>
    <div class="row"><div class="lbl">Referensi Purchase Invoice</div><div class="val">: ${pEsc(invRef)}</div></div>
    <div class="row"><div class="lbl">Akun Kas / Bank Keluar</div><div class="val">: ${pEsc(pMethod)}</div></div>
    <div class="row"><div class="lbl">Keterangan</div><div class="val">: ${pEsc(item.notes || '-')}</div></div>
  </div>

  <div class="amount-box">
    <span>TOTAL DIBAYARKAN :</span>
    <span>Rp ${pFmt(amount)}</span>
  </div>

  <div class="sign-wrap">
    <div class="sign-col">
      <div>Penerima / Supplier,</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>${pEsc(vName)}</div>
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

export default function PurchasePayment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [payments, setPayments] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PP_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [allInvoices, setAllInvoices] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PI_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    paymentNo: `PP-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().split('T')[0],
    invoice_id: '',
    invoice_reference: '',
    vendorName: '',
    paymentMethod: 'Bank Permata (070.224.339-4)',
    invoiceTotal: 0,
    alreadyPaid: 0,
    remainingBalance: 0,
    amount: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, payRes] = await Promise.allSettled([
        getPurchaseInvoices(),
        getPurchasePayments(),
      ]);

      const localInv = JSON.parse(localStorage.getItem(PI_STORAGE_KEY) || '[]');
      if (invRes.status === 'fulfilled') {
        const rawInv = invRes.value?.data?.data ?? invRes.value?.data ?? invRes.value ?? [];
        const apiInvList = Array.isArray(rawInv) ? rawInv : [];
        const mergedInvMap = new Map();
        localInv.forEach((inv) => mergedInvMap.set(inv.invoice_number || inv.supplier_invoice_number || inv.id, inv));
        apiInvList.forEach((inv) => mergedInvMap.set(inv.invoice_number || inv.supplier_invoice_number || inv.id, inv));
        const mergedInv = Array.from(mergedInvMap.values());
        setAllInvoices(mergedInv);
        localStorage.setItem(PI_STORAGE_KEY, JSON.stringify(mergedInv));
      } else {
        setAllInvoices(Array.isArray(localInv) ? localInv : []);
      }

      const localPay = JSON.parse(localStorage.getItem(PP_STORAGE_KEY) || '[]');
      if (payRes.status === 'fulfilled') {
        const rawPay = payRes.value?.data?.data ?? payRes.value?.data ?? payRes.value ?? [];
        const apiPayList = Array.isArray(rawPay) ? rawPay : [];
        const mergedPayMap = new Map();
        localPay.forEach((p) => mergedPayMap.set(p.paymentNo || p.payment_no || p.id, p));
        apiPayList.forEach((p) => mergedPayMap.set(p.paymentNo || p.payment_no || p.id, p));
        const mergedPay = Array.from(mergedPayMap.values());
        setPayments(mergedPay);
        localStorage.setItem(PP_STORAGE_KEY, JSON.stringify(mergedPay));
      } else {
        setPayments(Array.isArray(localPay) ? localPay : []);
      }
    } catch {
      setError('Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paidByInvoiceMap = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (editingId && p.id === editingId) return;
      const ref = String(p.invoice_reference || '').trim();
      if (!ref) return;
      map[ref] = (map[ref] || 0) + Number(p.amount || 0);
    });
    return map;
  }, [payments, editingId]);

  const unpaidInvoices = useMemo(() => {
    return allInvoices
      .map((inv) => {
        const invNo = inv.invoice_number || inv.supplier_invoice_number || '';
        const total = Number(inv.grand_total ?? inv.total_amount ?? inv.amount ?? 0);
        const paid = paidByInvoiceMap[invNo] ?? Number(inv.paid_amount || 0);
        const remaining = Math.max(0, total - paid);
        const supplierName = inv.supplier?.supplier_name || inv.supplier_name || 'Supplier';
        return {
          ...inv,
          invoice_number: invNo,
          _total: total,
          _paid: paid,
          _remaining: remaining,
          _supplierName: supplierName,
        };
      })
      .filter((inv) => inv.status !== 'Paid' && inv.status !== 'Lunas' && inv.status !== 'PAID' && inv._remaining > 0);
  }, [allInvoices, paidByInvoiceMap]);

  const handleSelectInvoice = (invoiceNo) => {
    if (!invoiceNo) {
      setFormData((prev) => ({
        ...prev,
        invoice_id: '',
        invoice_reference: '',
        vendorName: '',
        invoiceTotal: 0,
        alreadyPaid: 0,
        remainingBalance: 0,
        amount: '',
        notes: '',
      }));
      return;
    }

    const selectedInv = unpaidInvoices.find((inv) => inv.invoice_number === invoiceNo);
    if (selectedInv) {
      setFormData((prev) => ({
        ...prev,
        invoice_id: selectedInv.id || '',
        invoice_reference: selectedInv.invoice_number,
        vendorName: selectedInv._supplierName,
        invoiceTotal: selectedInv._total,
        alreadyPaid: selectedInv._paid,
        remainingBalance: selectedInv._remaining,
        amount: selectedInv._remaining,
        notes: `Pembayaran Purchase Invoice ${selectedInv.invoice_number} - ${selectedInv._supplierName}`,
      }));
      setError('');
    }
  };

  const filteredPayments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (item) =>
        String(item.paymentNo || item.payment_no || '').toLowerCase().includes(q) ||
        String(item.vendorName || item.vendor_name || '').toLowerCase().includes(q) ||
        String(item.invoice_reference || '').toLowerCase().includes(q)
    );
  }, [payments, searchTerm]);

  const pagination = usePagination(filteredPayments, 10);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setError('');
    setFormData({
      paymentNo: `PP-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split('T')[0],
      invoice_id: '',
      invoice_reference: '',
      vendorName: '',
      paymentMethod: 'Bank Permata (070.224.339-4)',
      invoiceTotal: 0,
      alreadyPaid: 0,
      remainingBalance: 0,
      amount: '',
      notes: '',
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setError('');
    const matchedInv = allInvoices.find((inv) => (inv.invoice_number || inv.supplier_invoice_number) === item.invoice_reference);
    const total = Number(matchedInv?.grand_total ?? matchedInv?.amount ?? item.amount ?? 0);
    const alreadyPaid = paidByInvoiceMap[item.invoice_reference] || 0;

    setFormData({
      paymentNo: item.paymentNo || item.payment_no || '',
      date: item.date || new Date().toISOString().split('T')[0],
      invoice_id: matchedInv?.id || '',
      invoice_reference: item.invoice_reference || '',
      vendorName: item.vendorName || item.vendor_name || '',
      paymentMethod: item.paymentMethod || item.payment_method || 'Bank Permata (070.224.339-4)',
      invoiceTotal: total,
      alreadyPaid,
      remainingBalance: Math.max(0, total - alreadyPaid),
      amount: item.amount || '',
      notes: item.notes || '',
    });
    setViewMode('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payAmount = Number(formData.amount || 0);

    if (payAmount <= 0) {
      setError('Nominal pembayaran harus lebih besar dari Rp 0.');
      return;
    }
    if (formData.invoice_reference && formData.remainingBalance > 0 && payAmount > formData.remainingBalance + 1) {
      setError(`Nominal melebihi sisa utang tagihan (${formatRupiah(formData.remainingBalance)}).`);
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      paymentNo: formData.paymentNo,
      payment_no: formData.paymentNo,
      date: formData.date,
      invoice_reference: formData.invoice_reference,
      vendorName: formData.vendorName,
      vendor_name: formData.vendorName,
      paymentMethod: formData.paymentMethod,
      payment_method: formData.paymentMethod,
      amount: payAmount,
      notes: formData.notes,
    };

    const localRecord = {
      ...payload,
      id: editingId || Date.now(),
    };

    try {
      if (editingId) {
        await updatePurchasePayment(editingId, payload);
      } else {
        await createPurchasePayment(payload);
      }

      const existingPay = JSON.parse(localStorage.getItem(PP_STORAGE_KEY) || '[]');
      const updatedPay = editingId
        ? existingPay.map((p) => (p.id === editingId ? localRecord : p))
        : [localRecord, ...existingPay];
      localStorage.setItem(PP_STORAGE_KEY, JSON.stringify(updatedPay));
      setPayments(updatedPay);

      if (formData.invoice_id || formData.invoice_reference) {
        const totalPaidAfter = Number(formData.alreadyPaid || 0) + payAmount;
        const nextStatus = totalPaidAfter >= Number(formData.invoiceTotal || 0) ? 'Lunas' : 'Partial';

        const existingInv = JSON.parse(localStorage.getItem(PI_STORAGE_KEY) || '[]');
        const updatedInv = existingInv.map((inv) =>
          (inv.id === formData.invoice_id || inv.invoice_number === formData.invoice_reference || inv.supplier_invoice_number === formData.invoice_reference)
            ? { ...inv, status: nextStatus, paid_amount: totalPaidAfter }
            : inv
        );
        localStorage.setItem(PI_STORAGE_KEY, JSON.stringify(updatedInv));
        setAllInvoices(updatedInv);

        if (formData.invoice_id) {
          try {
            await api.put(`/purchase-invoices/${formData.invoice_id}`, {
              status: nextStatus === 'Lunas' ? 'Paid' : 'Partial',
              paid_amount: totalPaidAfter,
            });
          } catch {
            // abaikan jika endpoint put tidak tersedia
          }
        }
      }

      if (!editingId) {
        try {
          await api.post('/financial-mutations', {
            transaction_type: 'OUT',
            reference_number: formData.paymentNo,
            date: formData.date,
            bank_account: formData.paymentMethod,
            contact_name: formData.vendorName,
            amount: payAmount,
            description: formData.notes || `Pembayaran supplier ${formData.vendorName}`,
          });
        } catch {
          // abaikan jika endpoint mutasi tidak tersedia
        }
      }

      swalSuccess(
        editingId ? 'Pembayaran Diperbarui' : 'Pembayaran Tersimpan',
        `${formData.paymentNo} sebesar ${formatRupiah(payAmount)} berhasil dicatat.`
      );
      await loadData();
      setViewMode('list');
    } catch (err) {
      const msg = String(err.response?.data?.message || err.message || '');
      if (msg.includes('paymentNo')) {
        const existingPay = JSON.parse(localStorage.getItem(PP_STORAGE_KEY) || '[]');
        const updatedPay = editingId
          ? existingPay.map((p) => (p.id === editingId ? localRecord : p))
          : [localRecord, ...existingPay];
        localStorage.setItem(PP_STORAGE_KEY, JSON.stringify(updatedPay));
        setPayments(updatedPay);
        swalSuccess(
          'Tersimpan Lokal',
          `${formData.paymentNo} sebesar ${formatRupiah(payAmount)} tersimpan di lokal. Tambahkan 'paymentNo' ke $fillable model PurchasePayment di Laravel agar masuk ke MySQL.`
        );
        setViewMode('list');
      } else {
        swalError(
          'Gagal Menyimpan',
          err.response?.data?.message || err.response?.data?.error || err.message || 'Terjadi kesalahan saat menyimpan.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus Bukti Pembayaran ini?')) return;
    try {
      await deletePurchasePayment(id);
    } catch {
      // lanjut hapus lokal
    }
    const existingPay = JSON.parse(localStorage.getItem(PP_STORAGE_KEY) || '[]');
    const updatedPay = existingPay.filter((p) => p.id !== id);
    localStorage.setItem(PP_STORAGE_KEY, JSON.stringify(updatedPay));
    setPayments(updatedPay);

    swalSuccess('Terhapus', 'Data pembayaran pembelian berhasil dihapus.');
    if (selectedPayment?.id === id) setSelectedPayment(null);
    await loadData();
  };

  const handlePrint = (item) => {
    if (!item) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      swalError('Pop-up Diblokir', 'Izinkan pop-up pada browser untuk mencetak bukti pengeluaran kas.');
      return;
    }
    printWindow.document.write(buildPaymentVoucherHtml(item, { autoPrint: true, logoUrl }));
    printWindow.document.close();
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const totalPaidAll = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalUnpaidDebt = unpaidInvoices.reduce((sum, inv) => sum + Number(inv._remaining || 0), 0);

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {viewMode === 'list' && !selectedPayment && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500/20 border border-rose-500/30 p-3 rounded-xl shadow">
                <Receipt className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Purchase Payment</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Catat pembayaran tagihan &amp; termin ke supplier dari Kas / Bank.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadData}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                title="Muat ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenAddForm}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Input Pembayaran</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Pembayaran Ke Supplier
                </p>
                <p className="text-xl font-extrabold text-rose-400 mt-1">{formatRupiah(totalPaidAll)}</p>
                <p className="text-xs text-slate-500 mt-1">{payments.length} transaksi pembayaran</p>
              </div>
              <div className="p-3 bg-rose-500/15 text-rose-400 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sisa Utang Belum Lunas
                </p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">{formatRupiah(totalUnpaidDebt)}</p>
                <p className="text-xs text-slate-500 mt-1">{unpaidInvoices.length} invoice menunggu pelunasan</p>
              </div>
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cari Pembayaran / Invoice
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="No. Payment, No. Invoice, atau Supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

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
                  {editingId ? 'Edit Pembayaran Supplier' : 'Formulir Purchase Payment (Pengeluaran Kas/Bank)'}
                </h2>
                <p className="text-sm text-slate-400">
                  Pilih tagihan Purchase Invoice aktif untuk pelunasan penuh atau termin bertahap.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-rose-600/20 transition cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan & Update Utang'}</span>
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No. Payment (PP)</label>
              <input
                required
                type="text"
                name="paymentNo"
                value={formData.paymentNo}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Bayar *</label>
              <input
                required
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pilih Purchase Invoice Belum Lunas
              </label>
              <select
                value={formData.invoice_reference}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                disabled={!!editingId}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer disabled:opacity-60"
              >
                <option value="">-- Pilih No. Purchase Invoice ({unpaidInvoices.length} aktif) --</option>
                {unpaidInvoices.map((inv, idx) => (
                  <option key={inv.id || idx} value={inv.invoice_number}>
                    {inv.invoice_number} - {inv._supplierName} (Sisa: {formatRupiah(inv._remaining)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nama Supplier / Vendor *
              </label>
              <input
                required
                type="text"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleInputChange}
                placeholder="Nama Supplier penerima pembayaran..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Akun Sumber Dana (Kas &amp; Bank)
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="Bank Permata (070.224.339-4)">Bank Permata (070.224.339-4)</option>
                <option value="Kas Kecil (Petty Cash)">Kas Kecil (Petty Cash)</option>
                <option value="Transfer Bank (BCA)">Transfer Bank (BCA)</option>
                <option value="Transfer Bank (Mandiri)">Transfer Bank (Mandiri)</option>
                <option value="Cek / Giro">Cek / Giro</option>
              </select>
            </div>
          </div>

          {formData.invoice_reference && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div>
                <p className="text-xs text-slate-400">Total Tagihan Supplier</p>
                <p className="text-lg font-bold text-slate-200 mt-0.5">{formatRupiah(formData.invoiceTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Sudah Dibayar Sebelumnya</p>
                <p className="text-lg font-bold text-sky-400 mt-0.5">{formatRupiah(formData.alreadyPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Sisa Utang Tagihan</p>
                <p className="text-lg font-extrabold text-amber-400 mt-0.5">{formatRupiah(formData.remainingBalance)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Nominal Dibayarkan (Rp) *
              </label>
              <input
                required
                type="number"
                min="1"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Masukkan nominal pembayaran..."
                className="w-full bg-slate-950 border border-rose-500/50 rounded-xl px-4 py-3 text-base font-extrabold text-rose-400 outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Keterangan / Referensi
              </label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Contoh: Pelunasan Purchase Invoice / DP..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </form>
      ) : selectedPayment ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Payment: {selectedPayment.paymentNo || selectedPayment.payment_no}
                </h2>
                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {selectedPayment.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Dibayarkan
              </span>
              <button
                onClick={() => {
                  const target = selectedPayment;
                  setSelectedPayment(null);
                  handleOpenEditForm(target);
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-blue-400" /> Edit
              </button>
              <button
                onClick={() => handlePrint(selectedPayment)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Bukti Kas Keluar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Dibayarkan Ke (Supplier)</p>
                <p className="text-base font-bold text-white mt-0.5">
                  {selectedPayment.vendorName || selectedPayment.vendor_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Referensi Purchase Invoice</p>
                <p className="font-mono font-semibold text-indigo-400 mt-0.5">
                  {selectedPayment.invoice_reference || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Keterangan</p>
                <p className="text-slate-300 mt-0.5">{selectedPayment.notes || '-'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Akun Sumber Dana</p>
                <p className="text-slate-200 font-semibold mt-0.5">
                  {selectedPayment.paymentMethod || selectedPayment.payment_method}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-500 uppercase font-bold">Nominal Dibayar</p>
                <p className="text-2xl font-black text-rose-400 mt-1">
                  {formatRupiah(selectedPayment.amount)}
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
                  <th className="p-5 font-bold">No. Payment</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Supplier</th>
                  <th className="p-5 font-bold">Ref. Purchase Invoice</th>
                  <th className="p-5 font-bold">Akun Keluar</th>
                  <th className="p-5 font-bold text-right">Nominal Dibayar</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {loading && payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin inline mr-2" /> Memuat data pembayaran...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-16 text-slate-500">
                      Belum ada bukti pembayaran pembelian (Purchase Payment).
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-5 font-mono font-bold text-rose-400">
                        {item.paymentNo || item.payment_no}
                      </td>
                      <td className="p-5 text-slate-300">{item.date}</td>
                      <td className="p-5 font-semibold text-white">
                        {item.vendorName || item.vendor_name}
                      </td>
                      <td className="p-5 font-mono text-indigo-400">
                        {item.invoice_reference || '-'}
                      </td>
                      <td className="p-5 text-slate-400 text-xs">
                        {item.paymentMethod || item.payment_method}
                      </td>
                      <td className="p-5 text-right font-bold text-rose-400">
                        {formatRupiah(item.amount)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedPayment(item)}
                            className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                          <button
                            onClick={() => handlePrint(item)}
                            title="Cetak Bukti Pengeluaran Kas"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditForm(item)}
                            title="Edit Pembayaran"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Hapus Pembayaran"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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