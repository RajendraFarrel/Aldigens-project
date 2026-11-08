import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer, ShoppingCart, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { getProducts, getCustomers, getCustomerPartNumbers, createDeliveryOrder } from '../services/api';
import { swalError, swalToast } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import logoAldigens from '../../LOGO ALDIGENS2.jpeg';

// ============================================================
// TEMPLATE CETAK SALES ORDER (mengikuti format Sales Order fisik / Accurate)
// ============================================================
const PRINT_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_PRINTED_BY = 'ADMIN';

const P_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const pEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pLines = (v) => pEsc(v).replace(/\r?\n/g, '<br/>');
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const pad2 = (n) => String(n).padStart(2, '0');

const pDate = (value) => {
  if (!value) return '-';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${Number(m[3])} ${P_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const normalizeSalesOrderForPrint = (so = {}) => {
  const items = (so.items || []).map((i) => {
    const qty = Number(i.qty ?? i.qty_sent ?? i.quantity ?? 1);
    const price = Number(i.price ?? i.unit_price ?? 0);
    const disc = Number(i.disc ?? i.discount ?? 0);
    const gross = qty * price;
    return {
      code: i.code || i.part_number || '',
      name: i.name || i.description || '',
      qty,
      unit: i.unit || 'PCS',
      price,
      disc,
      tax: i.tax_code ? String(i.tax_code).toUpperCase() : '',
      gross,
      discAmount: gross * disc / 100,
      total: gross * (1 - disc / 100),
    };
  });

  const subTotal = items.reduce((s, i) => s + i.gross, 0);
  const discount = items.reduce((s, i) => s + i.discAmount, 0);
  const ppn = Number(so.tax_amount || 0);

  const customer = so.customer || so.customer_name || '-';
  const shipTo = so.shipTo || so.customer_address || '';

  return {
    number: so.soNo || so.so_number || '-',
    date: pDate(so.date || so.so_date),
    refPo: so.refPo || so.reff_po || so.customer_po || so.ref_po || '-',
    terms: so.terms || 'Net 30',
    estDate: pDate(so.estDate || so.est_delivery_date),
    sentBy: so.sentBy || '-',
    salesman: so.salesman || so.admin_sales || '-',
    customer,
    customerAddress: so.customer_address || shipTo,
    shipTo,
    memo: so.keterangan || so.subject || '',
    items,
    subTotal,
    discount,
    ppn,
    taxPct: so.tax_percentage ?? 11,
    total: subTotal - discount + ppn,
  };
};

const PRINT_SO_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 10mm 14mm; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { width: 62mm; height: auto; display: block; margin-bottom: 2mm; filter: brightness(1.06); }
  .co-name { font-weight: 700; }
  .co-addr { line-height: 1.35; }
  .head-right { text-align: right; padding-top: 7mm; }
  .doc-title { font-size: 19px; font-weight: 700; text-decoration: underline; letter-spacing: .5px; }
  .doc-no { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .mid { display: flex; justify-content: space-between; margin-top: 2mm; }
  .parties { display: flex; flex: 0 0 66%; padding-top: 9mm; }
  .party { flex: 0 0 52%; line-height: 1.4; padding-right: 6mm; }
  .party .name { font-weight: 700; margin: 3px 0 6px; }
  .meta { text-align: right; line-height: 2; }
  .items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 3mm; }
  .items th { border: 1px solid #000; padding: 4px 3px; font-weight: 700; text-align: center; background: #ececec; }
  .items td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 2px 5px; vertical-align: top; word-wrap: break-word; }
  .items tr.fill td { border-bottom: 1px solid #000; }
  .items .r { text-align: right; }
  .items .c { text-align: center; }
  .bottom { display: flex; justify-content: space-between; margin-top: 2mm; }
  .memo-wrap { flex: 0 0 63%; }
  .memo-box { border: 1px solid #000; min-height: 15mm; padding: 3px 4px; margin-top: 1mm; line-height: 1.4; }
  .sum-wrap { flex: 0 0 35%; }
  .sum { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 2mm; }
  .sum td { border: 1px solid #000; padding: 2px 6px; height: 5.2mm; }
  .sum .l { width: 55%; text-align: right; }
  .sum .v { text-align: right; }
  .printed { text-align: right; font-size: 7px; margin-top: 3mm; }
  .sign { display: flex; margin-top: 8mm; page-break-inside: avoid; }
  .sign .col { flex: 0 0 31%; padding-left: 3mm; }
  .sign .space { height: 22mm; }
  .sign .line { border-top: 1px solid #000; width: 28mm; margin-bottom: 2px; }
`;

function buildSalesOrderHtml(rawSO, { autoPrint = false, logoUrl = '' } = {}) {
  const d = normalizeSalesOrderForPrint(rawSO);

  const rows = d.items
    .map(
      (it, idx) => `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>${pEsc(it.code)}</td>
          <td>${pEsc(it.name)}</td>
          <td class="r">${pFmt(it.qty)}</td>
          <td class="c">${pEsc(it.unit)}</td>
          <td class="r">${pFmt(it.price)}</td>
          <td class="c">${pFmt(it.disc)}</td>
          <td class="c">${pEsc(it.tax)}</td>
          <td class="r">${pFmt(it.total)}</td>
        </tr>`
    )
    .join('');

  const fillHeightMm = Math.max(0, 92 - d.items.length * 5);

  const logoTag = logoUrl
    ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  const now = new Date();
  const printedAt = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()} &nbsp; ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Order - ${pEsc(d.number)}</title>
  <style>${PRINT_SO_STYLE}</style>
</head>
<body>
<div class="page">
  <div class="head">
    <div>
      ${logoTag}
      <div class="co-name">${pEsc(PRINT_COMPANY.name)}</div>
      <div class="co-addr">${PRINT_COMPANY.address.map(pEsc).join('<br/>')}</div>
    </div>
    <div class="head-right">
      <div class="doc-title">SALES ORDER</div>
      <div class="doc-no">No : ${pEsc(d.number)}</div>
    </div>
  </div>
  <div class="mid">
    <div class="parties">
      <div class="party">
        <div>Pelanggan :</div>
        <div class="name">${pEsc(d.customer)}</div>
        <div>${pLines(d.customerAddress)}</div>
      </div>
      <div class="party">
        <div>Dikirim Ke :</div>
        <div class="name">${pEsc(d.customer)}</div>
        <div>${pLines(d.shipTo)}</div>
      </div>
    </div>
    <div class="meta">
      <div>Tanggal : ${pEsc(d.date)}</div>
      <div>Reff. PO. No : ${pEsc(d.refPo)}</div>
      <div>Term Pembayaran : ${pEsc(d.terms)}</div>
      <div>Est. Tgl Kirim : ${pEsc(d.estDate)}</div>
      <div>Dikirim Oleh : ${pEsc(d.sentBy)}</div>
      <div>Salesman : ${pEsc(d.salesman)}</div>
      ${d.items.length <= 18 ? '<div>Halaman : 1 / 1</div>' : ''}
    </div>
  </div>
  <table class="items">
    <colgroup>
      <col style="width:4%" /><col style="width:20%" /><col style="width:30%" /><col style="width:5%" />
      <col style="width:7%" /><col style="width:12%" /><col style="width:6%" /><col style="width:4.5%" /><col style="width:11.5%" />
    </colgroup>
    <thead>
      <tr><th>No.</th><th>Kode Barang</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga @</th><th>Disc %</th><th>PPN</th><th>Jumlah</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="fill"><td style="height:${fillHeightMm}mm"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <div class="bottom">
    <div class="memo-wrap">
      <div>Keterangan :</div>
      <div class="memo-box">${pLines(d.memo)}</div>
    </div>
    <div class="sum-wrap">
      <table class="sum">
        <tr><td class="l">Sub Total :</td><td class="v">${pFmt(d.subTotal)}</td></tr>
        <tr><td class="l">Discount :</td><td class="v">${pFmt(d.discount)}</td></tr>
        <tr><td class="l">PPN ${pEsc(d.taxPct)} % :</td><td class="v">${pFmt(d.ppn)}</td></tr>
        <tr><td class="l">Total :</td><td class="v">${pFmt(d.total)}</td></tr>
      </table>
      <div class="printed">Dicetak oleh : ${pEsc(PRINT_PRINTED_BY)} &nbsp; ${printedAt}</div>
    </div>
  </div>
  <div class="sign">
    <div class="col">
      <div>Dibuat Oleh :</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>Tgl :</div>
    </div>
    <div class="col">
      <div>Disetujui Oleh :</div>
      <div class="space"></div>
      <div class="line"></div>
      <div>Tgl :</div>
    </div>
  </div>
</div>
${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 500); };</script>' : ''}
</body>
</html>`;
}

function printSalesOrderDocument(so, logoUrl) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak Sales Order.');
    return;
  }
  printWindow.document.write(buildSalesOrderHtml(so, { autoPrint: true, logoUrl }));
  printWindow.document.close();
}

export default function SalesOrder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  
  // State Master Data
  const [masterProducts, setMasterProducts] = useState([]);
  const [masterCustomers, setMasterCustomers] = useState([]);
  const [customerParts, setCustomerParts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [salesOrders, setSalesOrders] = useState(() => {
    const saved = localStorage.getItem('aldigens_sales_orders') || localStorage.getItem('sales_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Gagal parse localStorage SO", e); }
    }
    return [];
  });

  useEffect(() => {
    fetchMasterProducts();
    fetchMasterCustomers();
    fetchCustomerParts();
  }, []);

  useEffect(() => {
    localStorage.setItem('aldigens_sales_orders', JSON.stringify(salesOrders));
  }, [salesOrders]);

  const fetchMasterProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await getProducts('');
      let prods = res.data?.data || res.data || [];
      if (!Array.isArray(prods)) prods = Object.values(prods);
      setMasterProducts(prods);
    } catch (e) {
      const fallback = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      setMasterProducts(fallback);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchMasterCustomers = async () => {
    try {
      const res = await getCustomers();
      let dataCust = res.data?.data || res.data || [];
      if (!Array.isArray(dataCust)) dataCust = Object.values(dataCust);
      setMasterCustomers(dataCust);
    } catch (e) {
      const fallback = JSON.parse(localStorage.getItem('aldigens_master_customers') || '[]');
      setMasterCustomers(fallback);
    }
  };

  const fetchCustomerParts = async () => {
    try {
      const res = await getCustomerPartNumbers({ limit: 5000, per_page: 5000, all: true });
      let parts = res.data?.data || res.data || [];
      if (!Array.isArray(parts)) parts = Object.values(parts);
      setCustomerParts(parts);
    } catch (e) {
      const fallback = JSON.parse(localStorage.getItem('aldigens_customer_parts') || '[]');
      setCustomerParts(fallback);
    }
  };

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(item =>
      (item.soNo || item.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customer || item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.refPo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salesOrders, searchTerm]);

  const pagination = usePagination(filteredSalesOrders, 10);

  const generateNewSoNumber = () => {
    const today = new Date();
    const prefix = `SO-${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}-`;
    const sameMonth = salesOrders.filter(so => (so.soNo || '').startsWith(prefix));
    const urut = String(sameMonth.length + 1).padStart(3, '0');
    return prefix + urut;
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID').format(angka || 0);
  };

  const [formData, setFormData] = useState({
    soNo: '',
    date: new Date().toISOString().split('T')[0],
    customer: '',
    shipTo: '',
    refPo: '',
    terms: 'Net 30',
    estDate: new Date().toISOString().split('T')[0],
    sentBy: 'Kurir Perusahaan',
    salesman: 'Diah Ayu Komala',
    status: 'Disetujui',
    keterangan: '',
    items: [],
    tax_percentage: 11
  });

  const calculatedTotals = useMemo(() => {
    let subTotal = 0;
    let taxAmount = 0;
    
    formData.items.forEach(it => {
      const qty = Number(it.qty || 1);
      const price = Number(it.price || 0);
      const totalItem = qty * price;
      
      subTotal += totalItem;
      if ((it.tax_code || '').toUpperCase() === 'T') {
        taxAmount += totalItem * ((formData.tax_percentage || 11) / 100);
      }
    });
    
    return {
      subTotal,
      taxAmount,
      grandTotal: subTotal + taxAmount
    };
  }, [formData.items, formData.tax_percentage]);

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      soNo: generateNewSoNumber(),
      date: new Date().toISOString().split('T')[0],
      customer: '',
      shipTo: '',
      refPo: '',
      terms: 'Net 30',
      estDate: new Date().toISOString().split('T')[0],
      sentBy: 'Kurir Perusahaan',
      salesman: 'Diah Ayu Komala',
      status: 'Disetujui',
      keterangan: '',
      tax_percentage: 11,
      items: []
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({
      ...item,
      soNo: item.soNo || item.so_number || generateNewSoNumber(),
      customer: item.customer || item.customer_name || '',
      shipTo: item.shipTo || item.customer_address || '',
      refPo: item.refPo || item.reff_po || item.customer_po || '',
      salesman: item.salesman || item.admin_sales || 'Diah Ayu Komala',
      keterangan: item.keterangan || item.subject || '',
      tax_percentage: item.tax_percentage || 11,
      items: (item.items || []).map(i => ({
        id: i.id || Date.now() + Math.random(),
        code: i.code || i.part_number || '',
        name: i.name || i.description || '',
        qty: i.qty || i.qty_sent || 1,
        unit: i.unit || 'PCS',
        price: i.price || i.unit_price || 0,
        disc: i.disc || 0,
        tax_code: i.tax_code || '',
        current_stock: i.current_stock ?? 0
      }))
    });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const handleCustomerChange = (customerName) => {
    const selectedCust = masterCustomers.find(c => (c.customer_name || c.name) === customerName);
    setFormData({
      ...formData,
      customer: customerName,
      shipTo: selectedCust?.customer_address || selectedCust?.address || formData.shipTo,
      items: [] 
    });
  };

  const getFilteredProductsForCustomer = () => {
    if (!formData.customer) return [];

    let filteredParts = customerParts.filter(cp => {
      const cpName = cp.customer_name || (cp.customer && cp.customer.customer_name) || cp.customer || '';
      return String(cpName).toLowerCase() === String(formData.customer).toLowerCase();
    });

    if (filteredParts.length === 0) {
      const selectedCust = masterCustomers.find(c => (c.customer_name || c.name) === formData.customer);
      if (selectedCust) {
        filteredParts = selectedCust.part_numbers || selectedCust.customer_part_numbers || selectedCust.items || [];
      }
    }

    return filteredParts.map(p => {
      const partNum = p.part_number || p.part_no || p.code || '';
      const invCode = p.inventory_part_number;

      let matchedInv = null;
      
      if (invCode) {
        matchedInv = masterProducts.find(mp => 
          String(mp.product_code || mp.part_number || mp.code || '').trim().toLowerCase() === String(invCode).trim().toLowerCase()
        );
      }
      
      if (!matchedInv) {
        matchedInv = masterProducts.find(mp => 
          String(mp.part_number || mp.product_code || '').trim().toLowerCase() === String(partNum).trim().toLowerCase()
        );
      }

      if (!matchedInv) {
        const desc = (p.item_description || p.description || p.name || '').trim().toLowerCase();
        if (desc) {
          matchedInv = masterProducts.find(mp => 
            String(mp.name || mp.item_description || '').trim().toLowerCase() === desc
          );
        }
      }

      const stockQty = matchedInv 
          ? Number(matchedInv.stock || matchedInv.qty || 0) 
          : Number(p.inventory_product?.stock_gudang || p.inventory_product?.stock || p.stock_gudang || p.stock || p.inventory_stock_total || 0);

      return {
        ...p,
        _part_number: partNum,
        _description: p.item_description || p.description || p.name || matchedInv?.name || '',
        _price: p.selling_price || p.price || p.unit_price || 0,
        _unit: p.unit || 'PCS',
        _stock: stockQty
      };
    });
  };

  const handleAddItemRow = () => {
    if (!formData.customer) {
      swalError('Peringatan', 'Silakan pilih Nama Pelanggan terlebih dahulu sebelum menambah barang.');
      return;
    }
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), code: '', name: '', qty: 1, unit: 'PCS', price: 0, disc: 0, tax_code: '', current_stock: 0 }]
    });
  };

  const handleRemoveItemRow = (id) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    });
  };

  const handleItemChange = (id, field, value) => {
    setFormData({
      ...formData,
      items: formData.items.map(i => {
        if (i.id === id) {
          const updated = { ...i, [field]: value };
          if (field === 'code' || field === 'part_number') {
            const availableList = getFilteredProductsForCustomer();
            const matched = availableList.find(
              (p) => String(p._part_number).toLowerCase() === String(value).toLowerCase()
            );

            if (matched) {
              updated.code = matched._part_number || value;
              updated.name = matched._description || '';
              updated.unit = matched._unit || 'PCS';
              updated.price = matched._price || 0;
              updated.current_stock = matched._stock || 0;
            }
          }
          return updated;
        }
        return i;
      })
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.customer.trim()) {
      swalError('Perhatian', 'Nama Pelanggan wajib diisi!');
      return;
    }
    if (formData.items.length === 0) {
      swalError('Error', 'Minimal ada 1 barang/jasa dalam SO ini.');
      return;
    }

    const currentSoNo = formData.soNo || generateNewSoNumber();
    const { subTotal, taxAmount, grandTotal } = calculatedTotals;

    const payload = {
      ...formData,
      soNo: currentSoNo,
      so_number: currentSoNo,
      customer_name: formData.customer,
      customer_address: formData.shipTo,
      customer_po: formData.refPo,
      ref_po: formData.refPo,
      subject: formData.keterangan, 
      sub_total: subTotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      items: formData.items.map(it => ({
        ...it,
        part_number: it.code || it.part_number,
        description: it.name || it.description,
        qty_sent: it.qty || 1,
        unit_price: it.price || 0
      }))
    };

    if (editingId) {
      setSalesOrders(salesOrders.map(item => item.id === editingId ? { ...item, ...payload } : item));
      swalToast('Sales Order berhasil diperbarui', 'success');
    } else {
      setSalesOrders([{ id: Date.now(), ...payload }, ...salesOrders]);
      swalToast('Sales Order berhasil disimpan', 'success');
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Sales Order ini?')) {
      setSalesOrders(salesOrders.filter(item => item.id !== id));
      setActiveMenuId(null);
      swalToast('Sales Order dihapus', 'success');
    }
  };

  // ---------------------------------------------------------
  // PERBAIKAN: Penomoran DO Unik (Timestamp + Random) agar Bebas Error 422
  // ---------------------------------------------------------
  const handleConvertToDO = async (item) => {
    setActiveMenuId(null);
    
    // Menangkap berbagai kemungkinan nama variabel dari objek Sales Order
    const soNumber = item.soNo || item.so_number || item.id || 'SO-UNKNOWN';
    const customerPo = item.refPo || item.reff_po || item.customer_po || item.ref_po || '-';

    if (!window.confirm(`Proses Sales Order ${soNumber} menjadi Delivery Order (Surat Jalan)?`)) {
      return;
    }

    const uniqueDoNumber = 'DO-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);

    const payload = {
      sales_order_id: null,
      do_number: uniqueDoNumber,
      so_number: soNumber,      // Mengirim No. SO
      ref_po: customerPo,       // Mengirim No. PO Pelanggan
      customer_po: customerPo,  // Cadangan key PO Pelanggan
      do_date: new Date().toISOString().split('T')[0],
      customer_name: item.customer || item.customer_name || 'Pelanggan',
      delivery_address: item.shipTo || item.customer_address || 'Jakarta',
      vehicle_number: item.sentBy || 'B 1234 SZT',
      driver_name: 'Kurir Perusahaan',
      notes: 'Barang dikirim berdasarkan SO: ' + soNumber,
      status: 'Draft',
      items: (item.items || []).map(i => ({
        part_number: i.code || i.part_number || '-',
        description: i.name || i.description || '-',
        qty_sent: i.qty || i.qty_sent || 1,
        unit: i.unit || 'PCS'
      }))
    };

    try {
      await createDeliveryOrder(payload);
      swalToast(`Sales Order ${soNumber} berhasil diproses ke Delivery Order (DO)!`, 'success');
    } catch (error) {
      console.error("DETAIL ERROR API RESPONSE:", error.response?.data);
      const serverMessage = error.response?.data?.message || JSON.stringify(error.response?.data) || error.message;
      swalError('Gagal Total', `Pesan dari Server: ${serverMessage}`);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const logoUrl = new URL(logoAldigens, window.location.href).href;
    printSalesOrderDocument(item, logoUrl);
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit Sales Order (SO)' : 'Buat Sales Order Baru'}
                </h2>
                <p className="text-xs text-slate-500">Formulir pesanan penjualan terintegrasi stok gudang</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.soNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">No. SO Internal</label>
                <input 
                  type="text" 
                  value={formData.soNo} 
                  readOnly 
                  className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Pelanggan <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                  value={formData.customer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">-- Pilih Customer --</option>
                  {masterCustomers.map((cust, idx) => {
                    const cName = cust.customer_name || cust.name || '-';
                    return <option key={idx} value={cName}>{cName}</option>;
                  })}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Alamat Kirim (Ship To)</label>
                <input type="text" placeholder="Alamat pengiriman otomatis..." value={formData.shipTo} onChange={(e) => setFormData({...formData, shipTo: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">No. PO Pelanggan (Customer PO)</label>
                <input type="text" placeholder="Masukkan Nomor PO Pelanggan..." value={formData.refPo} onChange={(e) => setFormData({...formData, refPo: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Term Pembayaran</label>
                <input type="text" value={formData.terms} onChange={(e) => setFormData({...formData, terms: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Salesman</label>
                <input type="text" value={formData.salesman} onChange={(e) => setFormData({...formData, salesman: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>

              <div className="md:col-span-3 mt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Keterangan / Memo</label>
                <textarea 
                  rows="2"
                  placeholder="Tambahkan catatan khusus untuk Sales Order ini..." 
                  value={formData.keterangan} 
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" /> Detail Item Penjualan
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Barang
                </button>
              </div>

              {formData.items.length === 0 ? (
                <p className="text-sm text-slate-400 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
                  Belum ada item ditambahkan. Silakan klik "Tambah Baris Barang".
                </p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto mb-6">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">#</th>
                        <th className="px-4 py-3">Part No Pelanggan & Info Stok</th>
                        <th className="px-4 py-3">Nama Barang</th>
                        <th className="px-4 py-3 w-24">Qty</th>
                        <th className="px-4 py-3 w-24">Satuan</th>
                        <th className="px-4 py-3 w-32">Harga (Rp)</th>
                        <th className="px-4 py-3 w-24 text-center">Pajak (T)</th>
                        <th className="px-4 py-3 w-16 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {formData.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                          <td className="px-4 py-3">
                            <input 
                              required 
                              type="text" 
                              list={`master-parts-list-${item.id}`}
                              placeholder="Ketik Part No..."
                              value={item.code || item.part_number || ''} 
                              onChange={(e) => handleItemChange(item.id, 'code', e.target.value)} 
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono" 
                              disabled={!formData.customer}
                            />
                            <datalist id={`master-parts-list-${item.id}`}>
                              {getFilteredProductsForCustomer().map((p, idx) => (
                                <option key={idx} value={p._part_number}>
                                  {p._description} (Stok Gudang: {p._stock})
                                </option>
                              ))}
                            </datalist>

                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                Number(item.current_stock || 0) > 0 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                <AlertCircle className="w-3 h-3" />
                                Sisa Stok Gudang: <b>{item.current_stock || 0} Pcs</b>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input required type="text" placeholder="Nama barang..." value={item.name || item.description || ''} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                          </td>
                          <td className="px-4 py-3">
                            <input required type="number" min="1" value={item.qty || item.qty_sent || 1} onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-center" />
                          </td>
                          <td className="px-4 py-3">
                            <select value={item.unit || 'PCS'} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer">
                              <option value="PCS">PCS</option>
                              <option value="Unit">Unit</option>
                              <option value="Set">Set</option>
                              <option value="Batang">Batang</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input required type="number" min="0" value={item.price || item.unit_price || 0} onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-right" />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              maxLength="1"
                              placeholder="T"
                              value={item.tax_code || ''} 
                              onChange={(e) => handleItemChange(item.id, 'tax_code', e.target.value.toUpperCase())} 
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-center font-bold" 
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => handleRemoveItemRow(item.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition cursor-pointer" title="Hapus Baris">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {formData.items.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full md:w-1/2 ml-auto space-y-3">
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    <span>Sub Total:</span>
                    <span className="text-slate-700 dark:text-slate-200">Rp {formatRupiah(calculatedTotals.subTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>PPN (%):</span>
                      <select 
                        value={formData.tax_percentage} 
                        onChange={(e) => setFormData({...formData, tax_percentage: Number(e.target.value.toUpperCase())})}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-xs"
                      >
                        <option value={11}>11%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">(+ Rp {formatRupiah(calculatedTotals.taxAmount)})</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-1 flex justify-between items-center text-base font-bold">
                    <span className="text-slate-800 dark:text-slate-100">Grand Total:</span>
                    <span className="text-blue-600 dark:text-blue-400">Rp {formatRupiah(calculatedTotals.grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition cursor-pointer">
                <Save className="h-4 w-4" /> Simpan Sales Order
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. SO atau pelanggan..." 
                className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button type="button" onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer">
            <Plus className="h-4 w-4" />
            Buat Sales Order (SO) Baru
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">No. SO</th>
                <th className="px-6 py-3.5">Pelanggan</th>
                <th className="px-6 py-3.5">No. PO Pelanggan</th>
                <th className="px-6 py-3.5">Salesman</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada data Sales Order ditemukan.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4">{item.date || '-'}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{item.soNo || item.so_number}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.customer || item.customer_name}</td>
                  <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{item.refPo || item.reff_po || item.customer_po || '-'}</td>
                  <td className="px-6 py-4">{item.salesman || item.admin_sales || 'Administrator'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.status || 'Disetujui'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button 
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 inline" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                        <button 
                          type="button"
                          onClick={() => handleConvertToDO(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          <Truck className="h-4 w-4" /> Proses ke DO
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenEditForm(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4 text-blue-500" /> Edit SO
                        </button>
                        <button 
                          type="button"
                          onClick={() => handlePrint(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Printer className="h-4 w-4 text-emerald-500" /> Cetak Dokumen
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus SO
                        </button>
                      </div>
                    )}
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
    </div>
  );
}