import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, ArrowLeft, Save, Trash2, Printer, CheckCircle2, RefreshCw, Calendar, DollarSign } from 'lucide-react';
import api from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalError } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

// ============================================================
// TEMPLATE CETAK INVOICE (mengikuti format invoice fisik / Accurate)
// ============================================================
const PRINT_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_DOC_TITLE = 'INVOICE';
const PRINT_PARTY_LABEL = 'Pelanggan';
const PRINT_SHOW_PAYMENT_INFO = true;
const PRINT_PAYMENT_INFO = { accountName: 'PT. ALDIGENS PUTERA PERSADA', bankName: 'BANK PERMATA', accountNo: '070.224.339-4' };
const PRINT_SIGNER = { name: 'KHAFID YUSUF', title: 'Direktur' };

const P_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const P_ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const P_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const P_SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

const pEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pLines = (v) => pEsc(v).replace(/\r?\n/g, '<br/>');
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

const pDate = (value) => {
  if (!value) return '-';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${Number(m[3])} ${P_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const pDaysBetween = (a, b) => {
  const d1 = Date.parse(String(a || '').slice(0, 10));
  const d2 = Date.parse(String(b || '').slice(0, 10));
  return Number.isNaN(d1) || Number.isNaN(d2) ? null : Math.round((d2 - d1) / 86400000);
};

const pBelow1000 = (num) => {
  const words = [];
  let n = num;
  if (n >= 100) {
    words.push(`${P_ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    words.push(P_TENS[Math.floor(n / 10)] + (n % 10 ? `-${P_ONES[n % 10]}` : ''));
  } else if (n > 0) {
    words.push(P_ONES[n]);
  }
  return words.join(' ');
};

const pWords = (value) => {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'Zero Rupiah';
  const chunks = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) chunks.unshift(`${pBelow1000(chunk)}${P_SCALES[scale] ? ` ${P_SCALES[scale]}` : ''}`);
    n = Math.floor(n / 1000);
    scale += 1;
  }
  const text = chunks.join(' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} Rupiah`;
};

const pTerbilang = (value) => pWords(value);

const calcLineTotal = (item) => {
  const qty = Number(item.qty ?? item.quantity ?? 0);
  const price = Number(item.unit_price ?? item.price ?? 0);
  const disc = Number(item.discount ?? item.discount_percent ?? item.disc_percent ?? 0);
  return qty * price * (1 - disc / 100);
};

const normalizeInvoiceForPrint = (inv = {}) => {
  const rawItems = inv.items || inv.details || inv.lines || [];
  const items = rawItems.map((it) => {
    const qty = Number(it.qty ?? it.quantity ?? 0);
    const price = Number(it.unit_price ?? it.price ?? 0);
    const disc = Number(it.discount ?? it.discount_percent ?? it.disc_percent ?? 0);
    return {
      code: it.part_number || it.code || '',
      name: it.description || it.name || '',
      qty,
      price,
      disc,
      total: Number(qty * price * (1 - disc / 100)),
    };
  });

  const taxPct = Number(inv.tax_percentage ?? 11);
  let subTotal = inv.sub_total ?? inv.subtotal ?? (items.length ? items.reduce((s, i) => s + i.total, 0) : null);
  let tax = inv.tax_amount ?? inv.tax ?? null;
  let grand = inv.grand_total ?? inv.total_amount ?? null;

  if (subTotal == null) subTotal = grand != null ? (tax != null ? Number(grand) - Number(tax) : Math.round(Number(grand) / (1 + taxPct / 100))) : 0;
  if (tax == null) tax = Math.round(Number(subTotal) * taxPct / 100);
  if (grand == null) grand = Number(subTotal) + Number(tax);

  const invoiceDate = inv.invoice_date || inv.date;
  const days = pDaysBetween(invoiceDate, inv.due_date);

  return {
    number: inv.invoice_number || '-',
    date: pDate(invoiceDate),
    term: days == null ? 'Net 30' : days > 0 ? `Net ${days}` : 'Tunai',
    refPo: inv.do_reference || inv.do_number || '-',
    partyName: inv.customer_name || '-',
    partyAddress: inv.customer_address || '',
    items,
    subTotal: Number(subTotal),
    tax: Number(tax),
    taxPct,
    grand: Number(grand),
  };
};

const PRINT_INVOICE_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 10mm 14mm; }
  .script { font-family: 'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { width: 62mm; height: auto; display: block; margin-bottom: 2mm; filter: brightness(1.06); }
  .co-name { font-weight: 700; }
  .co-addr { line-height: 1.35; }
  .head-right { text-align: right; padding-top: 9mm; }
  .doc-title { font-size: 17px; font-weight: 700; text-decoration: underline; letter-spacing: .4px; }
  .doc-no { font-size: 12px; font-weight: 700; margin-top: 2px; }

  .party { display: flex; justify-content: space-between; margin-top: 10mm; }
  .party-left { flex: 0 0 56%; line-height: 1.4; }
  .party-left .name { font-weight: 700; margin: 3px 0 7px; }
  .meta { text-align: right; line-height: 2; }

  .items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 2mm; }
  .items th { border: 1px solid #000; padding: 4px; font-weight: 700; text-align: center; background: #ececec; }
  .items td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 1px 5px; vertical-align: top; word-wrap: break-word; }
  .items tr.fill td { border-bottom: 1px solid #000; }
  .items .r { text-align: right; }
  .items .c { text-align: center; }

  .totals { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .totals td { border: 1px solid #000; padding: 3px 8px; height: 6.2mm; }
  .totals tr.last td { height: 9mm; }
  .totals .l { width: 20.5%; text-align: right; }
  .totals .v { width: 21%; text-align: right; }
  .totals .words { width: 58.5%; vertical-align: middle; }
  .totals .strong { font-weight: 700; }

  .pay { margin-top: 3mm; line-height: 1.7; page-break-inside: avoid; }
  .pay table { border-collapse: collapse; }
  .pay td { padding: 2px 6px 2px 0; }
  .sign { margin-top: 10mm; page-break-inside: avoid; }
  .sign .space { height: 22mm; }
  .sign .line { border-top: 1px dashed #000; width: 52mm; margin: 2px 0; }
`;

function buildInvoiceHtml(rawInvoice, { autoPrint = false, logoUrl = '' } = {}) {
  const d = normalizeInvoiceForPrint(rawInvoice);

  const rows = d.items
    .map(
      (it, idx) => `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>${pEsc(it.code)}</td>
          <td>${pEsc(it.name)}</td>
          <td class="c">${pFmt(it.qty)}</td>
          <td class="r">${pFmt(it.price)}</td>
          <td class="c">${pFmt(it.disc)}</td>
          <td class="r">${pFmt(it.total)}</td>
        </tr>`
    )
    .join('');

  const fillHeightMm = Math.max(0, 78 - d.items.length * 5);

  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  const paymentBlock = PRINT_SHOW_PAYMENT_INFO
    ? `<div class="pay script">
        Mohon Pembayaran dilakukan ke Account kami sbb :
        <table class="script">
          <tr><td>Nama Account</td><td>: ${pEsc(PRINT_PAYMENT_INFO.accountName)}</td></tr>
          <tr><td>Nama Bank</td><td>: ${pEsc(PRINT_PAYMENT_INFO.bankName)}</td></tr>
          <tr><td>Account No</td><td>: ${pEsc(PRINT_PAYMENT_INFO.accountNo || '......................')}</td></tr>
        </table>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${pEsc(PRINT_DOC_TITLE)} ${pEsc(d.number)}</title>
  <style>${PRINT_INVOICE_STYLE}</style>
</head>
<body>
<div class="page">
  <div class="head">
    <div class="head-left">
      ${logoTag}
      <div class="co-name">${pEsc(PRINT_COMPANY.name)}</div>
      <div class="co-addr">${PRINT_COMPANY.address.map(pEsc).join('<br/>')}</div>
    </div>
    <div class="head-right">
      <div class="doc-title">${pEsc(PRINT_DOC_TITLE)}</div>
      <div class="doc-no">No. ${pEsc(d.number)}</div>
    </div>
  </div>

  <div class="party">
    <div class="party-left">
      <div>${pEsc(PRINT_PARTY_LABEL)} :</div>
      <div class="name">${pEsc(d.partyName)}</div>
      <div>${pLines(d.partyAddress)}</div>
    </div>
    <div class="meta">
      <div>Tanggal : ${pEsc(d.date)}</div>
      <div>Term Pembayaran : ${pEsc(d.term)}</div>
      <div>Reff D.O. No : ${pEsc(d.refPo)}</div>
      <div>Mata Uang : Rupiah</div>
    </div>
  </div>

  <table class="items">
    <colgroup>
      <col style="width:5.5%" /><col style="width:29%" /><col style="width:26.5%" />
      <col style="width:6%" /><col style="width:12.5%" /><col style="width:6.5%" /><col style="width:14%" />
    </colgroup>
    <thead>
      <tr><th>No.</th><th>Kode Barang</th><th>Nama Barang</th><th>Qty</th><th>Harga @</th><th>Disc %</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="fill"><td style="height:${fillHeightMm}mm"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="words"></td><td class="l">Sub Total :</td><td class="v">${pFmt(d.subTotal)}</td></tr>
    <tr><td class="words"></td><td class="l">PPN ${pEsc(d.taxPct)} % :</td><td class="v">${pFmt(d.tax)}</td></tr>
    <tr class="last"><td class="words">${pEsc(pTerbilang(d.grand))}</td><td class="l strong">TOTAL :</td><td class="v">${pFmt(d.grand)}</td></tr>
  </table>

  ${paymentBlock}

  <div class="sign script">
    <div>${pEsc(PRINT_COMPANY.name)}</div>
    <div class="space"></div>
    <div>${pEsc(PRINT_SIGNER.name)}</div>
    <div class="line"></div>
    <div>${pEsc(PRINT_SIGNER.title)}</div>
  </div>
</div>
${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 500); };</script>' : ''}
</body>
</html>`;
}
// ============================================================

export default function Invoice() {
  const [invoices, setInvoices] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
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
    tax_percentage: 11,
    notes: 'Pembayaran ditransfer ke rekening PT. Aldigens Putera Persada',
    items: [],
  });

  const taxPct = Number(formData.tax_percentage ?? 11);
  const formSubTotal = formData.items.reduce((acc, curr) => acc + calcLineTotal(curr), 0);
  const formTaxAmount = Math.round(formSubTotal * (taxPct / 100));
  const formGrandTotal = formSubTotal + formTaxAmount;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      const apiInvoices = res.data?.data || res.data || [];
      setInvoices(Array.isArray(apiInvoices) ? apiInvoices : []);
    } catch (e) {
      console.error('Gagal memuat Invoice:', e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDOsAndSOs = useCallback(async () => {
    try {
      let apiDOs = [];
      let apiSOs = [];

      const [doRes, soRes] = await Promise.allSettled([
        api.get('/delivery-orders'),
        api.get('/sales-orders'),
      ]);

      if (doRes.status === 'fulfilled') {
        apiDOs = doRes.value.data?.data || doRes.value.data || [];
      }
      if (soRes.status === 'fulfilled') {
        apiSOs = soRes.value.data?.data || soRes.value.data || [];
      }

      const localDOs = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || localStorage.getItem('delivery_orders') || '[]');
      const localSOs = JSON.parse(localStorage.getItem('aldigens_sales_orders') || localStorage.getItem('sales_orders') || '[]');

      const mergedDOs = [...(Array.isArray(apiDOs) ? apiDOs : []), ...localDOs];
      const uniqueDOs = Array.from(new Map(mergedDOs.map((d) => [d.do_number || d.id, d])).values());

      const mergedSOs = [...(Array.isArray(apiSOs) ? apiSOs : []), ...localSOs];
      const uniqueSOs = Array.from(new Map(mergedSOs.map((s) => [s.so_number || s.soNo || s.id, s])).values());

      setDeliveryOrders(uniqueDOs);
      setSalesOrders(uniqueSOs);
    } catch (e) {
      console.error('Gagal memuat DO / SO:', e);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchDOsAndSOs();
  }, [fetchInvoices, fetchDOsAndSOs]);

  // Filter DO untuk dropdown: Jangan tampilkan yang sudah ada di tabel invoices
  const availableDOs = deliveryOrders.filter(
    (doItem) => !invoices.some((inv) => inv.do_reference === doItem.do_number || inv.do_number === doItem.do_number)
  );

  useEffect(() => {
    const activeRef = localStorage.getItem('active_invoice_ref');
    if (activeRef) {
      try {
        const parsedRef = JSON.parse(activeRef);
        setIsCreating(true);

        setFormData((prev) => ({
          ...prev,
          do_reference: parsedRef.do_number || parsedRef.commissioning_code || '',
          customer_name: parsedRef.customer_name || '',
          notes: `Referensi BAST: ${parsedRef.commissioning_code} | PO: ${parsedRef.ref_po || '-'} | SO: ${parsedRef.so_number || '-'}`,
          items: [
            {
              part_number: parsedRef.part_number || '',
              description: `Pekerjaan Proyek / Komisioning: ${parsedRef.project_name || parsedRef.commissioning_code} (PO: ${parsedRef.ref_po || '-'})`,
              qty: 1,
              unit_price: Number(parsedRef.unit_price || parsedRef.total_amount || 0),
              discount: 0,
            },
          ],
        }));

        localStorage.removeItem('active_invoice_ref');
      } catch (err) {
        console.error('Gagal memparsing referensi BAST:', err);
      }
    }
  }, []);

  const handleSelectDO = (doNumber) => {
    setFormData((prev) => ({ ...prev, do_reference: doNumber, items: [] }));
    if (!doNumber) return;

    const selDO = deliveryOrders.find((d) => d.do_number === doNumber);
    if (!selDO) return;

    const normalizeText = (v) => String(v || '').trim().toLowerCase();

    // Cari Sales Order terkait baik dari relasi nested selDO.sales_order maupun daftar salesOrders
    const relatedSO =
      selDO.sales_order ||
      salesOrders.find(
        (so) =>
          (selDO.so_number && (normalizeText(so.so_number) === normalizeText(selDO.so_number) || normalizeText(so.soNo) === normalizeText(selDO.so_number))) ||
          (selDO.sales_order_id && String(so.id) === String(selDO.sales_order_id))
      );

    const soItems = relatedSO?.items || relatedSO?.details || [];
    const doItems = selDO.items || selDO.details || [];

    const mappedItems = doItems.map((it, idx) => {
      const doCode = normalizeText(it.part_number || it.code || it.product?.part_number);
      const doDesc = normalizeText(it.description || it.name || it.product?.name);

      const matchedSoItem =
        soItems.find(
          (soItem) =>
            (doCode && [soItem.part_number, soItem.code, soItem.product?.part_number].some((c) => normalizeText(c) === doCode)) ||
            (doDesc && [soItem.description, soItem.name, soItem.product?.name].some((d) => normalizeText(d) === doDesc))
        ) || soItems[idx];

      // Prioritaskan harga asli dari Sales Order (karena DO sudah murni fisik tanpa harga)
      const soPrice = Number(
        matchedSoItem?.unit_price ?? matchedSoItem?.price ?? matchedSoItem?.harga ?? matchedSoItem?.selling_price ?? 0
      );
      const doPrice = Number(it.unit_price ?? it.price ?? it.harga ?? 0);
      const finalPrice = soPrice > 0 ? soPrice : doPrice;

      const finalDisc = Number(
        matchedSoItem?.discount ?? matchedSoItem?.discount_percent ?? matchedSoItem?.disc_percent ?? it.discount ?? 0
      );

      return {
        part_number: it.part_number || it.code || matchedSoItem?.part_number || matchedSoItem?.code || '',
        description: it.description || it.name || matchedSoItem?.description || matchedSoItem?.name || it.part_number || '-',
        qty: Number(it.qty_sent ?? it.qty ?? it.quantity ?? 1),
        unit_price: finalPrice,
        discount: finalDisc,
      };
    });

    const resolvedTax = Number(relatedSO?.tax_percentage ?? relatedSO?.tax_rate ?? selDO.tax_percentage ?? 11);

    setFormData((prev) => ({
      ...prev,
      customer_name: selDO.customer_name || relatedSO?.customer_name || '',
      customer_address:
        selDO.delivery_address ||
        selDO.customer_address ||
        relatedSO?.billing_address ||
        relatedSO?.customer_address ||
        '',
      tax_percentage: Number.isNaN(resolvedTax) ? 11 : resolvedTax,
      items: mappedItems,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = ['qty', 'unit_price', 'discount'].includes(field) ? Number(value) : value;
    setFormData({ ...formData, items });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', description: '', qty: 1, unit_price: 0, discount: 0 }],
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
      tax_percentage: 11,
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
      const payload = {
        ...formData,
        sub_total: formSubTotal,
        tax_amount: formTaxAmount,
        grand_total: formGrandTotal,
      };
      await api.post('/invoices', payload);

      setSuccessMsg('Invoice berhasil dibuat!');
      setIsCreating(false);
      resetForm();
      fetchInvoices();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message;
      const errorFile = err.response?.data?.file || 'Tidak diketahui';
      const errorLine = err.response?.data?.line || 'Tidak diketahui';

      alert('ERROR DARI BACKEND LARAVEL:\n\n' + errorMsg + '\n\nFile: ' + errorFile + '\nBaris: ' + errorLine);
      setError('Gagal: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedInvoice) return;

    try {
      await api.put(`/invoices/${selectedInvoice.id}`, { status: newStatus });

      const updatedInvoice = { ...selectedInvoice, status: newStatus };
      setSelectedInvoice(updatedInvoice);

      setSuccessMsg(`Status invoice berhasil diubah menjadi ${newStatus}!`);
      fetchInvoices();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah status invoice di Database.');
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status) => {
    const map = {
      Unpaid: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      Partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      Paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
    return map[status] || 'bg-slate-700/60 text-slate-200 border-slate-600';
  };

  const printInvoice = (invData) => {
    if (!invData) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      swalError('Pop-up diblokir browser. Izinkan pop-up untuk mencetak invoice.');
      return;
    }

    printWindow.document.write(buildInvoiceHtml(invData, { autoPrint: true, logoUrl }));
    printWindow.document.close();
  };

  const selectedSubTotal = (selectedInvoice?.items || []).reduce((acc, curr) => acc + calcLineTotal(curr), 0);
  const selectedTaxPct = Number(selectedInvoice?.tax_percentage ?? 11);
  const selectedTaxAmount = Math.round(selectedSubTotal * (selectedTaxPct / 100));
  const selectedGrandTotal = selectedSubTotal + selectedTaxAmount;

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedInvoice && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-3 rounded-xl shadow">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice</h1>
              <p className="text-sm text-slate-500 mt-1">Terbitkan tagihan resmi ke pelanggan berdasarkan Surat Jalan (DO) atau BAST.</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Invoice</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
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
                <p className="text-sm text-slate-500">Kuantitas ditarik dari D.O dan harga otomatis mengikuti Sales Order terkait.</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Invoice'}</span>
            </button>
          </div>

          {error && <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Referensi D.O / BAST</label>
              <select
                value={formData.do_reference}
                onChange={(e) => handleSelectDO(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="">-- Pilih D.O --</option>
                {availableDOs.map((d) => (
                  <option key={d.id || d.do_number} value={d.do_number}>
                    {d.do_number} - {d.customer_name}
                  </option>
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
                Belum ada rincian tagihan. Tarik dari D.O / BAST atau tambah manual.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">PART NUMBER</label>
                      <input
                        type="text"
                        placeholder="Kode"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        value={item.part_number || ''}
                        onChange={(e) => handleItemChange(index, 'part_number', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">DESKRIPSI BARANG / PROYEK</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">QTY</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">HARGA SATUAN (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1 text-right">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer mt-5 md:mt-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.items.length > 0 && (
              <div className="rounded-2xl p-6 border border-slate-700/80 bg-slate-900/90 space-y-3 mt-6 shadow-inner">
                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                  <span>Sub Total:</span>
                  <span className="text-slate-200 font-semibold">{formatRupiah(formSubTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                  <span>PPN {taxPct}%:</span>
                  <span className="text-slate-200 font-semibold">{formatRupiah(formTaxAmount)}</span>
                </div>
                <div className="border-t border-slate-700/80 pt-3 flex justify-between items-center text-lg font-bold">
                  <span className="text-slate-100">Grand Total:</span>
                  <span className="text-indigo-400">{formatRupiah(formGrandTotal)}</span>
                </div>
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
                  <Calendar className="w-4 h-4" /> {selectedInvoice.date || selectedInvoice.invoice_date}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${statusBadge(selectedInvoice.status || 'Unpaid')}`}>
                {selectedInvoice.status || 'Unpaid'}
              </span>

              {selectedInvoice.status !== 'Paid' ? (
                <button
                  onClick={() => handleUpdateStatus('Paid')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-medium transition cursor-pointer shadow-sm"
                >
                  Tandai Lunas (Paid)
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus('Unpaid')}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2.5 rounded-xl font-medium transition cursor-pointer shadow-sm"
                >
                  Ubah ke Unpaid
                </button>
              )}

              <button
                onClick={() => printInvoice(selectedInvoice)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer shadow-sm"
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
              <p className="font-semibold text-slate-800">
                {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toISOString().split('T')[0] : '-'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Ref D.O / BAST</p>
              <p className="font-semibold text-slate-800">{selectedInvoice.do_reference || selectedInvoice.do_number || '-'}</p>
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
                ) : selectedInvoice.items.map((it, idx) => {
                  const safeQty = Number(it.qty ?? it.quantity) || 1;
                  const safePrice = Number(it.unit_price ?? it.price ?? 0);
                  const lineTotal = calcLineTotal(it);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-sm font-semibold text-slate-500 text-center">{idx + 1}</td>
                      <td className="p-4 text-sm font-medium text-slate-700">
                        {it.part_number && <span className="font-mono text-xs text-indigo-400 mr-2">[{it.part_number}]</span>}
                        {it.description}
                      </td>
                      <td className="p-4 text-sm text-center font-bold text-slate-800">{safeQty}</td>
                      <td className="p-4 text-sm text-right text-slate-600">{formatRupiah(safePrice)}</td>
                      <td className="p-4 text-sm text-right font-bold text-slate-800">{formatRupiah(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="bg-slate-900/90 border-t border-slate-700/80 p-5 space-y-2 text-sm">
                <div className="flex justify-end items-center gap-6">
                  <span className="font-semibold text-slate-400">Sub Total:</span>
                  <span className="font-bold text-slate-200 w-36 text-right">
                    {formatRupiah(selectedSubTotal)}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-6">
                  <span className="font-semibold text-slate-400">PPN {selectedTaxPct}%:</span>
                  <span className="font-bold text-slate-200 w-36 text-right">
                    {formatRupiah(selectedTaxAmount)}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-6 pt-3 mt-3 border-t border-slate-700/80">
                  <span className="font-bold text-slate-100 text-base">Grand Total:</span>
                  <span className="font-black text-indigo-400 text-base w-36 text-right">
                    {formatRupiah(selectedGrandTotal)}
                  </span>
                </div>
              </div>
            )}
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
                    <td className="p-5 text-slate-500">{inv.date || inv.invoice_date}</td>
                    <td className="p-5 text-slate-500">{inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : '-'}</td>
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