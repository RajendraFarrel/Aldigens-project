import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, ArrowLeft, Save, Trash2, Printer, Package, RefreshCw,
  Calendar, CheckCircle2, BadgeCheck, Factory, AlertTriangle, Wrench
} from 'lucide-react';
import api, { approveDeliveryOrder } from '../services/api';
import logoPerusahaan from '../../LOGO ALDIGENS2.jpeg';
import { swalConfirm, swalError, swalToast } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

// ============================================================
// TEMPLATE CETAK DELIVERY ORDER (mengikuti format fisik / Accurate)
// ============================================================
const DO_COMPANY = {
  name: 'PT. ALDIGENS PUTERA PERSADA',
  address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const DO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const dEsc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dLines = (v) => dEsc(v).replace(/\r?\n/g, '<br/>');
const dFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

const dPrintDate = (value) => {
  if (!value) return '-';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${Number(m[3])} ${DO_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const formatShipToHtml = (rawShipTo, fallbackName, fallbackAddr) => {
  const text = String(rawShipTo || '').trim();
  if (!text) {
    const nameHtml = fallbackName ? `<div class="bold">${dEsc(fallbackName)}</div>` : '';
    const addrHtml = fallbackAddr ? `<div>${dLines(fallbackAddr)}</div>` : '';
    return nameHtml + addrHtml || '-';
  }
  const lines = text.split(/\r?\n/);
  if (lines.length === 1) return `<div class="bold">${dEsc(lines[0])}</div>`;
  return `<div class="bold">${dEsc(lines[0])}</div><div>${lines.slice(1).map(dEsc).join('<br/>')}</div>`;
};

const PRINT_DO_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 10mm 14mm; }
  .bold { font-weight: 700; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { width: 62mm; height: auto; display: block; margin-bottom: 2mm; filter: brightness(1.06); }
  .co-name { font-weight: 700; }
  .co-addr { line-height: 1.35; }
  .head-right { text-align: right; padding-top: 7mm; }
  .doc-title { font-size: 17px; font-weight: 700; text-decoration: underline; letter-spacing: .4px; }
  .doc-no { font-size: 12px; font-weight: 700; margin-top: 2px; }

  .party-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8mm; gap: 4mm; }
  .party-col { flex: 0 0 33%; line-height: 1.4; }
  .ship-col { flex: 0 0 36%; line-height: 1.4; }
  .meta-col { flex: 0 0 29%; text-align: right; line-height: 1.75; }
  .party-label { margin-bottom: 2px; }

  .items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 3mm; }
  .items th { border: 1px solid #000; padding: 4px; font-weight: 700; text-align: center; background: #ececec; }
  .items td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 2px 5px; vertical-align: top; word-wrap: break-word; }
  .items tr.fill td { border-bottom: 1px solid #000; }
  .items .c { text-align: center; }

  .printed-by { text-align: right; font-size: 9px; margin-top: 2px; }

  .notes-section { margin-top: 2mm; page-break-inside: avoid; }
  .notes-label { margin-bottom: 2px; }
  .notes-box { border: 1px solid #000; width: 56%; min-height: 13mm; padding: 4px 6px; line-height: 1.35; }

  .sign-row { display: flex; justify-content: space-between; margin-top: 10mm; page-break-inside: avoid; }
  .sign-col { width: 30%; text-align: center; }
  .sign-header { height: 14px; }
  .sign-space { height: 22mm; }
  .sign-line { border-top: 1px solid #000; padding-top: 3px; font-weight: 700; }
`;

function buildDeliveryOrderHtml(doData = {}, { autoPrint = false, logoUrl = '' } = {}) {
  const rawItems = doData.items || [];
  const rows = rawItems
    .map(
      (it, idx) => `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>${dEsc(it.part_number || '')}</td>
          <td>${dEsc(it.description || '')}</td>
          <td class="c">${dFmt(it.qty_sent ?? it.qty ?? 0)} ${dEsc(it.unit || 'PCS')}</td>
          <td>${dEsc(it.notes || it.item_notes || '')}</td>
        </tr>`
    )
    .join('');

  const fillHeightMm = Math.max(12, 92 - rawItems.length * 6);
  const customerName = doData.customer_name || '-';
  const sentBy = doData.vehicle_number || doData.driver_name || '-';
  const warehouse = doData.warehouse || '-';

  const logoTag = logoUrl
    ? `<img class="logo" src="${dEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DELIVERY ORDER ${dEsc(doData.do_number || '')}</title>
  <style>${PRINT_DO_STYLE}</style>
</head>
<body>
<div class="page">
  <div class="head">
    <div class="head-left">
      ${logoTag}
      <div class="co-name">${dEsc(DO_COMPANY.name)}</div>
      <div class="co-addr">${DO_COMPANY.address.map(dEsc).join('<br/>')}</div>
    </div>
    <div class="head-right">
      <div class="doc-title">DELIVERY ORDER</div>
      <div class="doc-no">No. ${dEsc(doData.do_number || '-')}</div>
    </div>
  </div>

  <div class="party-row">
    <div class="party-col">
      <div class="party-label">Pelanggan :</div>
      <div class="bold">${dEsc(customerName)}</div>
      <div>${dLines(doData.customer_address || '')}</div>
    </div>
    <div class="ship-col">
      <div class="party-label">Dikirim Ke :</div>
      ${formatShipToHtml(doData.delivery_address, customerName, doData.customer_address)}
    </div>
    <div class="meta-col">
      <div>Tanggal : ${dEsc(dPrintDate(doData.do_date))}</div>
      <div>Reff PO No : ${dEsc(doData.ref_po || '-')}</div>
      <div>Dikirim Oleh : ${dEsc(sentBy)}</div>
      <div>Gudang : ${dEsc(warehouse)}</div>
    </div>
  </div>

  <table class="items">
    <colgroup>
      <col style="width:5.5%" />
      <col style="width:23.5%" />
      <col style="width:38%" />
      <col style="width:12%" />
      <col style="width:21%" />
    </colgroup>
    <thead>
      <tr>
        <th>No.</th>
        <th>Kode Barang</th>
        <th>Nama Barang</th>
        <th>Qty</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="fill"><td style="height:${fillHeightMm}mm"></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <div class="printed-by">Dicetak oleh ADMIN</div>

  <div class="notes-section">
    <div class="notes-label">Keterangan :</div>
    <div class="notes-box">${dLines(doData.notes || '')}</div>
  </div>

  <div class="sign-row">
    <div class="sign-col">
      <div class="sign-header">Dikirim Oleh</div>
      <div class="sign-space"></div>
      <div class="sign-line">${dEsc(DO_COMPANY.name)}</div>
    </div>
    <div class="sign-col">
      <div class="sign-header">Diterima dan Diperiksa Oleh :</div>
      <div class="sign-space"></div>
      <div class="sign-line">${dEsc(customerName)}</div>
    </div>
    <div class="sign-col">
      <div class="sign-header">&nbsp;</div>
      <div class="sign-space"></div>
      <div class="sign-line">${dEsc(customerName)}</div>
    </div>
  </div>
</div>
${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 450); };</script>' : ''}
</body>
</html>`;
}
// ============================================================

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
<<<<<<< HEAD
    ref_po: '',
    do_number: '',
=======
    do_number: `DO-${Math.floor(10000000 + Math.random() * 90000000)}`,
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
    do_date: new Date().toISOString().split('T')[0],
    ref_po: '',
    vehicle_number: '',
    warehouse: 'GUDANG ELECTRICAL',
    customer_name: '',
    customer_address: '',
    delivery_address: '',
    notes: '',
    items: [],
  });

  const formatDate = (val) => {
    if (!val) return '-';
    const match = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : String(val);
  };

  const fetchDOs = useCallback(async () => {
    setLoading(true);
    try {
      let apiData = [];
      try {
        const res = await api.get('/delivery-orders');
        apiData = res.data.data || res.data || [];
      } catch {
        console.warn('API DO offline, menggunakan localStorage.');
      }

      const localSaved = JSON.parse(
        localStorage.getItem('aldigens_delivery_orders') || localStorage.getItem('delivery_orders') || '[]'
      );

      // Gabungkan data API & localStorage agar field lengkap (customer_address, warehouse, notes item) tetap terjaga
      const mergedMap = new Map();
      localSaved.forEach((item) => {
        if (item?.do_number) mergedMap.set(item.do_number, item);
      });
      (Array.isArray(apiData) ? apiData : []).forEach((apiItem) => {
        if (!apiItem?.do_number) return;
        const localMatch = mergedMap.get(apiItem.do_number);
        if (localMatch) {
          mergedMap.set(apiItem.do_number, {
            ...localMatch,
            ...apiItem,
            customer_address: apiItem.customer_address || localMatch.customer_address || '',
            warehouse: apiItem.warehouse || localMatch.warehouse || '',
            items: (apiItem.items && apiItem.items.length ? apiItem.items : localMatch.items || []).map((it, idx) => ({
              ...(localMatch.items?.[idx] || {}),
              ...it,
              notes: it.notes || localMatch.items?.[idx]?.notes || '',
            })),
          });
        } else {
          mergedMap.set(apiItem.do_number, apiItem);
        }
      });

      setDeliveryOrders(Array.from(mergedMap.values()));
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
        const res = await api.get('/sales-orders');
        apiSOs = res.data.data || res.data || [];
      } catch {
        console.warn('API SO offline.');
      }

      const localSOs = JSON.parse(
        localStorage.getItem('aldigens_sales_orders') || localStorage.getItem('sales_orders') || '[]'
      );
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

  const handleSelectSO = (soId) => {
    setFormData((prev) => ({ ...prev, sales_order_id: soId, ref_po: '', items: [] }));
    if (!soId) return;

<<<<<<< HEAD
    const so = salesOrders.find((s) => String(s.id) === String(soId));
=======
    const so = salesOrders.find(
      (s) =>
        String(s.id) === String(soId) ||
        String(s.soNo) === String(soId) ||
        String(s.so_number) === String(soId)
    );
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
    if (!so) return;

    const custName = so.customer || so.customer_name || '';
    const custAddr = so.customer_address || so.address || '';
    const shipTo = so.shipTo || so.delivery_address || [custName, custAddr].filter(Boolean).join('\n');

    // Hanya tarik data barang, qty, satuan, dan keterangan (tanpa harga)
    const items = (so.items || []).map((it) => ({
      sales_order_item_id: it.id,
      product_id: it.product_id || '',
      part_number: it.code || it.part_number || it.inventory_part_number || '',
      description: it.name || it.description || '-',
      qty_sent: Number(it.qty || it.qty_sent || 1),
      unit: it.unit || 'PCS',
      notes: it.notes || it.keterangan || '',
    }));

    setFormData((prev) => ({
      ...prev,
      sales_order_id: soId,
      ref_po: so.refPo || so.reff_po || so.customer_po || '',
      customer_name: custName,
      customer_address: custAddr,
      delivery_address: shipTo,
      vehicle_number: so.sentBy || so.delivery_by || prev.vehicle_number,
      warehouse: so.warehouse || prev.warehouse || 'GUDANG ELECTRICAL',
      notes: so.notes || prev.notes,
      items: items.length
        ? items
        : [{ part_number: '', description: '-', qty_sent: 1, unit: 'PCS', notes: '' }],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = field === 'qty_sent' ? Number(value) : value;
    setFormData({ ...formData, items });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', description: '', qty_sent: 1, unit: 'PCS', notes: '' }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({
      sales_order_id: '',
<<<<<<< HEAD
      ref_po: '',
      do_number: '',
=======
      do_number: `DO-${Math.floor(10000000 + Math.random() * 90000000)}`,
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
      do_date: new Date().toISOString().split('T')[0],
      ref_po: '',
      vehicle_number: '',
      warehouse: 'GUDANG ELECTRICAL',
      customer_name: '',
      customer_address: '',
      delivery_address: '',
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
<<<<<<< HEAD
      const response = await api.post('/delivery-orders', {
        sales_order_id: Number(formData.sales_order_id),
        do_date: formData.do_date,
        customer_name: formData.customer_name,
        delivery_address: formData.delivery_address,
        vehicle_number: formData.vehicle_number,
        driver_name: formData.driver_name,
        notes: formData.notes,
        ref_po: formData.ref_po,
        items: formData.items,
      });
      const newDO = response.data?.data;
      if (!newDO) throw new Error('Backend tidak mengembalikan data Delivery Order.');
      setDeliveryOrders((prev) => [newDO, ...prev.filter((item) => item.do_number !== newDO.do_number)]);
=======
      const sanitizedItems = formData.items.map((it) => ({
        part_number: it.part_number || '',
        description: it.description || '-',
        qty_sent: Number(it.qty_sent || 1),
        unit: it.unit || 'PCS',
        notes: it.notes || '',
      }));

      const payload = {
        sales_order_id: null,
        so_number: formData.sales_order_id,
        do_number: formData.do_number,
        do_date: formData.do_date,
        ref_po: formData.ref_po,
        vehicle_number: formData.vehicle_number,
        driver_name: formData.vehicle_number,
        warehouse: formData.warehouse,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
        items: sanitizedItems,
      };

      const response = await api.post('/delivery-orders', payload);
      const apiCreated = response.data?.data || {};

      const createdDO = {
        ...payload,
        ...apiCreated,
        customer_address: formData.customer_address,
        warehouse: formData.warehouse,
        items: sanitizedItems,
      };
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b

      const existing = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]').filter(
        (d) => d.do_number !== createdDO.do_number
      );
      localStorage.setItem('aldigens_delivery_orders', JSON.stringify([createdDO, ...existing]));

      setSuccessMsg(response.data?.message || 'Surat Jalan berhasil dibuat.');
      setIsCreating(false);
      resetForm();
      fetchDOs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message;
      setError('Gagal menyimpan Delivery Order: ' + serverMsg);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      'Ready': 'bg-blue-50 text-blue-700 border-blue-200',
      'Shipped': 'bg-blue-50 text-blue-700 border-blue-200',
      'Waiting Production': 'bg-rose-50 text-rose-700 border-rose-200',
      'In Production': 'bg-amber-50 text-amber-700 border-amber-200',
      'Ready to Ship': 'bg-teal-50 text-teal-700 border-teal-200',
      'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Cancelled': 'bg-slate-100 text-slate-700 border-slate-300',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const updateDoStatusLocally = (doNumber, newStatus) => {
    setDeliveryOrders((prev) =>
      prev.map((d) => (d.do_number === doNumber ? { ...d, status: newStatus } : d))
    );
    if (selectedDO && selectedDO.do_number === doNumber) {
      setSelectedDO((prev) => ({ ...prev, status: newStatus }));
    }
    const updatedLocal = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]').map((d) =>
      d.do_number === doNumber ? { ...d, status: newStatus } : d
    );
    localStorage.setItem('aldigens_delivery_orders', JSON.stringify(updatedLocal));
  };

  const handleCreateWO = async (doData) => {
    const ok = await swalConfirm({
      title: 'Terbitkan Work Order?',
      text: `Stok gudang tidak cukup. Terbitkan Surat Perintah Kerja (WO) ke Manufaktur untuk pesanan ${doData.so_number}?`,
      confirmText: 'Ya, Buat WO',
      cancelText: 'Batal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      const newWO = {
        id: Date.now(),
        wo_number: `WO-MFG-${Math.floor(1000 + Math.random() * 9000)}`,
        wo_date: new Date().toISOString().split('T')[0],
        ref_do: doData.do_number,
        ref_so: doData.so_number,
        customer_name: doData.customer_name,
        status: 'Draft',
        items: doData.items.map((it) => ({
          part_number: it.part_number,
          description: it.description,
          target_qty: it.qty_sent,
          unit: it.unit,
        })),
      };

      const existingWO = JSON.parse(localStorage.getItem('aldigens_work_orders') || '[]');
      localStorage.setItem('aldigens_work_orders', JSON.stringify([newWO, ...existingWO]));

      try {
        await api.post('/work-orders', newWO);
      } catch {
        console.warn('API Work Order offline, data disimpan di lokal.');
      }

      swalToast(`Work Order ${newWO.wo_number} berhasil dikirim ke Pabrik!`, 'success');
      updateDoStatusLocally(doData.do_number, 'In Production');
    } catch {
      swalError('Gagal', 'Sistem gagal meneruskan perintah ke Manufaktur.');
    }
  };

  const simulateProductionFinish = (doData) => {
    swalToast('Simulasi: Produksi selesai. Barang disetor ke Gudang!', 'success');
    updateDoStatusLocally(doData.do_number, 'Ready to Ship');
  };

  const handleApprove = async (doData) => {
    const ok = await swalConfirm({
      title: 'Approve Delivery Order?',
      text: `DO "${doData.do_number || '-'}" akan disetujui dan stok Inventory otomatis berkurang sesuai barang yang dikirim.`,
      confirmText: 'Ya, Approve',
      cancelText: 'Batal',
      icon: 'question',
    });
    if (!ok) return;

    try {
<<<<<<< HEAD
      const targetId = doData.id;
      if (!targetId || String(targetId).length > 10) {
        throw new Error('DO ini belum tersimpan di server sehingga tidak dapat di-approve.');
=======
      let targetId = doData.id;

      if (String(targetId).length > 10 || String(targetId).startsWith('17')) {
        try {
          const response = await api.post('/delivery-orders', {
            sales_order_id: null,
            so_number: doData.so_number || doData.sales_order_id,
            do_number: doData.do_number,
            do_date: doData.do_date,
            customer_name: doData.customer_name,
            customer_address: doData.customer_address,
            delivery_address: doData.delivery_address,
            vehicle_number: doData.vehicle_number,
            driver_name: doData.driver_name || doData.vehicle_number,
            warehouse: doData.warehouse,
            notes: doData.notes,
            ref_po: doData.ref_po,
            items: doData.items,
          });
          targetId = response.data.data?.id;
        } catch {
          // Abaikan jika sudah pernah tersinkronisasi
        }

        try {
          const listRes = await api.get('/delivery-orders');
          const foundInApi = (listRes.data.data || listRes.data || []).find(
            (item) => item.do_number === doData.do_number
          );
          if (foundInApi) {
            targetId = foundInApi.id;
          }
        } catch {
          // Abaikan jika API offline
        }
      }

      if (!targetId) {
        updateDoStatusLocally(doData.do_number, 'Approved');
        swalToast('Mode Offline: DO di-approve secara lokal.', 'success');
        return;
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
      }

      await approveDeliveryOrder(targetId);
      swalToast('Delivery Order berhasil di-approve. Stok Inventory berkurang.', 'success');

      updateDoStatusLocally(doData.do_number, 'Approved');
      fetchDOs();
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message;
      swalError('Gagal Approve', `Pesan Server: ${serverMsg}`);
    }
  };

  const printSuratJalan = (doData) => {
    if (!doData) return;
    const logoUrl = new URL(logoPerusahaan, window.location.href).href;
    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) {
      swalError('Popup Diblokir', 'Izinkan popup untuk mencetak Surat Jalan.');
      return;
    }
    win.document.write(buildDeliveryOrderHtml(doData, { autoPrint: true, logoUrl }));
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
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Order</h1>
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
      {error && (
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
                <h2 className="text-xl font-bold text-slate-800">Formulir Delivery Order Baru</h2>
                <p className="text-sm text-slate-500">Isi sesuai format Surat Jalan (Pelanggan, Dikirim Ke, Reff PO, Gudang, dan Rincian Barang).</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan DO'}</span>
            </button>
          </div>

          {/* Baris 1: Referensi SO, No. DO, Tanggal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Referensi Sales Order <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.sales_order_id}
                onChange={(e) => handleSelectSO(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition cursor-pointer"
              >
                <option value="">-- Pilih SO --</option>
                {salesOrders.map((so) => {
                  const soNum = so.soNo || so.so_number || so.id;
                  const custName = so.customer || so.customer_name || '';
                  return (
<<<<<<< HEAD
                    <option key={so.id || soNum} value={so.id}>
                      {soNum} - {custName}
=======
                    <option key={so.id || soNum} value={soNum}>
                      {soNum} {custName ? `- ${custName}` : ''}
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-1.5">
<<<<<<< HEAD
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Surat Jalan</label>
              <input type="text" readOnly placeholder="Dibuat otomatis saat DO disimpan" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 outline-none" value={formData.do_number} />
=======
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Delivery Order <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="DO-26090012"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.do_number}
                onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
              />
>>>>>>> 1b308f855bef98e0753d30ec2e8aeb895ac92a9b
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.do_date}
                onChange={(e) => setFormData({ ...formData, do_date: e.target.value })}
              />
            </div>
          </div>

          {/* Baris 2: Reff PO No, Dikirim Oleh (Kendaraan/Kurir), Gudang */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reff PO No</label>
              <input
                type="text"
                placeholder="4600019767"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.ref_po}
                onChange={(e) => setFormData({ ...formData, ref_po: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dikirim Oleh (No. Kendaraan / Kurir)</label>
              <input
                type="text"
                placeholder="B 1234 SZT"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gudang</label>
              <input
                type="text"
                list="warehouse-options"
                placeholder="GUDANG ELECTRICAL"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
              />
              <datalist id="warehouse-options">
                <option value="GUDANG ELECTRICAL" />
                <option value="GUDANG UTAMA" />
                <option value="GUDANG MECHANICAL" />
              </datalist>
            </div>
          </div>

          {/* Baris 3: Pelanggan & Dikirim Ke */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pelanggan (Nama Perusahaan) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="PT. UNITED TRACTORS Tbk"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Pelanggan</label>
                <textarea
                  rows={3}
                  placeholder={'Jl. Raya Bekasi Km.22\nCakung, Jakarta Timur\nJAKARTA 13910'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dikirim Ke (Tujuan Pengiriman) <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      delivery_address: [prev.customer_name, prev.customer_address].filter(Boolean).join('\n'),
                    }))
                  }
                  className="text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  Salin dari Pelanggan
                </button>
              </div>
              <textarea
                rows={6}
                required
                placeholder={'PT. UNITED TRACTORS Tbk\nJl. Raya Bekasi Km.22\nCakung, Jakarta Timur\nJAKARTA 13910 021-24579999'}
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              />
            </div>
          </div>

          {/* Baris 4: Rincian Barang (Kode Barang, Nama Barang, Qty, Satuan, Keterangan) */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" /> Rincian Barang (Tanpa Harga)
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
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">KODE BARANG</label>
                      <input
                        type="text"
                        placeholder="A_FE6KG1PCE_KCME"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                        value={item.part_number}
                        onChange={(e) => handleItemChange(index, 'part_number', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">NAMA BARANG <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="FIRE EXTINGUISHER 6 KG 1 PCS"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">QTY</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-center"
                        value={item.qty_sent}
                        onChange={(e) => handleItemChange(index, 'qty_sent', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">SATUAN</label>
                      <input
                        type="text"
                        placeholder="SET"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-center uppercase"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">KETERANGAN ITEM</label>
                      <input
                        type="text"
                        placeholder="Opsional"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                        value={item.notes || ''}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1 text-right">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer mt-4 md:mt-4">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Baris 5: Keterangan (Kotak Keterangan Bawah DO) */}
          <div className="space-y-1.5 pt-4 border-t border-slate-100">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Keterangan (Kotak Catatan Bawah Surat Jalan)</label>
            <textarea
              rows={2}
              placeholder="Contoh: SPK 1X GD535 SN J10450"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
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
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Order: {selectedDO.do_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> {formatDate(selectedDO.do_date)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${statusBadge(selectedDO.status)}`}>
                {selectedDO.status}
              </span>

              {selectedDO.status === 'Waiting Production' && (
                <button
                  onClick={() => handleCreateWO(selectedDO)}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  <Factory className="w-4 h-4" /> Buat Work Order (WO)
                </button>
              )}

              {selectedDO.status === 'In Production' && (
                <>
                  <button disabled className="flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2.5 rounded-xl font-medium cursor-not-allowed">
                    <Wrench className="w-4 h-4" /> Sedang Dirakit...
                  </button>
                  <button
                    onClick={() => simulateProductionFinish(selectedDO)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer"
                    title="Simulasi penyelesaian produksi"
                  >
                    (Simulasi: Produksi Selesai)
                  </button>
                </>
              )}

              {['Ready', 'Ready to Ship', 'Shipped'].includes(selectedDO.status) && (
                <button
                  onClick={() => handleApprove(selectedDO)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
                >
                  <BadgeCheck className="w-4 h-4" /> Approve DO
                </button>
              )}

              <button
                onClick={() => printSuratJalan(selectedDO)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Delivery Order
              </button>
            </div>
          </div>

          {selectedDO.status === 'Waiting Production' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Stok Gudang Tidak Mencukupi!</h4>
                <p className="text-xs mt-1 text-rose-700">Delivery Order ini ditahan sementara. Silakan terbitkan Work Order (WO) agar bagian pabrik segera memproduksi barang pesanan ini.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Pelanggan</p>
              <p className="font-bold text-slate-800">{selectedDO.customer_name}</p>
              <p className="text-xs text-slate-600 whitespace-pre-line mt-1">{selectedDO.customer_address || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Dikirim Ke</p>
              <p className="text-xs font-medium text-slate-800 whitespace-pre-line">{selectedDO.delivery_address || '-'}</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reff PO No / Ref. SO</p>
                <p className="font-bold text-orange-600 text-sm">{selectedDO.ref_po || '-'} <span className="text-slate-400 font-normal">({selectedDO.so_number || '-'})</span></p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dikirim Oleh / Gudang</p>
                <p className="font-semibold text-slate-800 text-sm">{selectedDO.vehicle_number || selectedDO.driver_name || '-'} — {selectedDO.warehouse || '-'}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold w-14 text-center">No.</th>
                  <th className="p-4 font-bold w-48">Kode Barang</th>
                  <th className="p-4 font-bold">Nama Barang</th>
                  <th className="p-4 font-bold text-center w-32">Qty</th>
                  <th className="p-4 font-bold w-56">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedDO.items || []).length === 0 ? (
                  <tr><td colSpan="5" className="p-12 text-center text-sm text-slate-400">Tidak ada item pengiriman.</td></tr>
                ) : selectedDO.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-4 text-sm font-semibold text-slate-700">{it.part_number || '-'}</td>
                    <td className="p-4 text-sm font-medium text-slate-700">{it.description}</td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">{it.qty_sent} {it.unit || 'PCS'}</td>
                    <td className="p-4 text-sm text-slate-600">{it.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedDO.notes && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan</p>
              <p className="text-sm font-medium text-slate-700 whitespace-pre-line">{selectedDO.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. DO</th>
                  <th className="p-5 font-bold">Pelanggan</th>
                  <th className="p-5 font-bold">Ref. SO</th>
                  <th className="p-5 font-bold text-orange-600">Reff PO No</th>
                  <th className="p-5 font-bold">Tanggal</th>
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
                    <td className="p-5 text-orange-600 font-medium">{d.ref_po || '-'}</td>
                    <td className="p-5 text-slate-500">{formatDate(d.do_date)}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusBadge(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="p-5 text-center space-x-2 whitespace-nowrap">
                      <button onClick={() => setSelectedDO(d)} className="text-orange-600 hover:text-white font-semibold text-xs bg-orange-50 hover:bg-orange-600 px-4 py-2 rounded-xl transition-all cursor-pointer">
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