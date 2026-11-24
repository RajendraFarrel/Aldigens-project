import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Edit2, Printer, X, Save, FileText, Factory,
  RefreshCw, Clock, CheckCircle2, Wrench,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { getBoms } from '../services/api';
import { swalToast } from '../utils/swal';

const WO_STORAGE_KEY = 'aldigens_wo';

export default function WorkOrder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [bomList, setBomList] = useState([]);
  const [loadingBoms, setLoadingBoms] = useState(false);

  const loadBomsFromApi = async () => {
    setLoadingBoms(true);
    try {
      const res = await getBoms();
      const apiBoms = res?.data?.data || res?.data || [];
      setBomList(Array.isArray(apiBoms) ? apiBoms : []);
    } catch (e) {
      console.error('Gagal memuat daftar BOM:', e);
    } finally {
      setLoadingBoms(false);
    }
  };

  useEffect(() => {
    loadBomsFromApi();
  }, []);

  const [workOrders, setWorkOrders] = useState(() => {
    const savedLocalWO = JSON.parse(localStorage.getItem('aldigens_work_orders') || '[]');
    const savedOldWO = JSON.parse(localStorage.getItem(WO_STORAGE_KEY) || '[]');

    const mappedDoWo = savedLocalWO.map((wo) => ({
      id: wo.id,
      date: wo.wo_date || new Date().toISOString().split('T')[0],
      woNo: wo.wo_number,
      refBOM: wo.ref_do ? `Ref DO: ${wo.ref_do}` : 'Manual',
      product_id: wo.items?.[0]?.product_id || null,
      product: wo.items?.[0]?.description || wo.customer_name || 'Produk Pesanan DO',
      targetQty: wo.items?.[0]?.target_qty || 1,
      status: wo.status || 'Menunggu',
      man_power: '-',
      jobdesc: `Pesanan untuk ${wo.customer_name} (SO: ${wo.ref_so})`,
      model_bracket: wo.items?.[0]?.description || '-',
      start_date: wo.wo_date,
      finish_date: '',
      raw_materials: wo.items || [],
      consumables_b: [],
      consumables_c: [],
    }));

    const combined = [
      ...mappedDoWo,
      ...savedOldWO.filter((o) => !mappedDoWo.some((m) => m.woNo === o.woNo)),
    ];
    localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(combined));
    return combined;
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWO, setEditingWO] = useState(null);
  const [form, setForm] = useState({
    man_power: '',
    jobdesc: '',
    model_bracket: '',
    start_date: '',
    finish_date: '',
    qty: 0,
    status: 'Dalam Proses',
    raw_materials: [],
    consumables_b: [],
    consumables_c: [],
  });

  const [newWO, setNewWO] = useState({
    woNo: `WO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    refBOM: '',
    product_id: '',
    product: '',
    man_power: '',
    jobdesc: '',
    model_bracket: '',
    targetQty: 1,
    start_date: new Date().toISOString().split('T')[0],
    finish_date: '',
    status: 'Dalam Proses',
    raw_materials: [],
    consumables_b: [],
    consumables_c: [],
  });

  const filteredWO = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return workOrders;
    return workOrders.filter(
      (item) =>
        String(item.woNo || '').toLowerCase().includes(q) ||
        String(item.product || '').toLowerCase().includes(q) ||
        String(item.refBOM || '').toLowerCase().includes(q)
    );
  }, [workOrders, searchTerm]);

  const pagination = usePagination(filteredWO, 10);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'Dalam Proses':
        return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
      default:
        return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
  };

  const handleOpenAddForm = () => {
    setNewWO({
      woNo: `WO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      refBOM: '',
      product_id: '',
      product: '',
      man_power: '',
      jobdesc: '',
      model_bracket: '',
      targetQty: 1,
      start_date: new Date().toISOString().split('T')[0],
      finish_date: '',
      status: 'Dalam Proses',
      raw_materials: [],
      consumables_b: [],
      consumables_c: [],
    });
    setViewMode('form');
  };

  const handleOpenEdit = (wo) => {
    setEditingWO(wo);
    setForm({
      man_power: wo.man_power || '',
      jobdesc: wo.jobdesc || '',
      model_bracket: wo.model_bracket || wo.product || '',
      start_date: wo.start_date || '',
      finish_date: wo.finish_date || '',
      qty: wo.targetQty || 1,
      status: wo.status || 'Dalam Proses',
      raw_materials: wo.raw_materials?.length ? wo.raw_materials : [{ desc: '', unit: 'pcs' }],
      consumables_b: wo.consumables_b?.length ? wo.consumables_b : [{ desc: '', unit: 'Ea' }],
      consumables_c: wo.consumables_c?.length ? wo.consumables_c : [{ desc: '', unit: 'Ea' }],
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const updatedList = workOrders.map((wo) => {
      if (wo.id === editingWO.id) {
        return {
          ...wo,
          man_power: form.man_power,
          jobdesc: form.jobdesc,
          model_bracket: form.model_bracket,
          product: form.model_bracket || wo.product,
          start_date: form.start_date,
          finish_date: form.finish_date,
          targetQty: Number(form.qty || 1),
          status: form.status,
          raw_materials: form.raw_materials,
          consumables_b: form.consumables_b,
          consumables_c: form.consumables_c,
        };
      }
      return wo;
    });

    setWorkOrders(updatedList);
    localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(updatedList));
    setShowEditModal(false);

    if (typeof swalToast === 'function') {
      swalToast('Data Work Order berhasil diperbarui!', 'success');
    }
  };

  // Mengambil nama produk asli & daftar komponen dari BOM API
  const handleBomChange = (e) => {
    const selectedDocNo = e.target.value;
    const bom = bomList.find((b) => String(b.document_number) === String(selectedDocNo));

    if (bom) {
      const realProductName = bom.product?.name || bom.product_name || '';
      const mappedRaw = (bom.items || []).map((it) => ({
        desc: it.product?.name || '',
        part_no1: it.product?.part_number || '',
        unit: it.unit || it.product?.unit || 'pcs',
        qty: Number(it.quantity || 1),
      }));

      setNewWO((prev) => ({
        ...prev,
        refBOM: bom.document_number,
        product_id: bom.product_id || bom.product?.id || '',
        product: realProductName,
        model_bracket: realProductName,
        jobdesc: bom.notes || `Perakitan ${realProductName}`,
        targetQty: Number(bom.output_quantity || 1),
        raw_materials: mappedRaw,
        consumables_b: [],
        consumables_c: [],
      }));
    } else {
      setNewWO((prev) => ({
        ...prev,
        refBOM: '',
        product_id: '',
        product: '',
        model_bracket: '',
        jobdesc: '',
        raw_materials: [],
      }));
    }
  };

  const handleSaveNewWO = (e) => {
    e.preventDefault();
    const finalProductName = newWO.product || newWO.model_bracket || 'Produk Rakitan';
    const payload = {
      id: Date.now(),
      ...newWO,
      product: finalProductName,
      model_bracket: newWO.model_bracket || finalProductName,
      targetQty: Number(newWO.targetQty || 1),
    };
    const updatedList = [payload, ...workOrders];

    setWorkOrders(updatedList);
    localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(updatedList));
    setViewMode('list');

    if (typeof swalToast === 'function') {
      swalToast(`Work Order ${payload.woNo} berhasil dibuat!`, 'success');
    }
  };

  const handlePrintWO = (wo) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const renderEmptyRows = (count, defaultUnit = 'Ea') => {
      let rows = '';
      for (let i = 0; i < count; i++) {
        rows += `<tr class="item-row"><td class="center"></td><td></td><td></td><td></td><td></td><td class="center">${defaultUnit}</td><td class="center">${defaultUnit}</td></tr>`;
      }
      return rows;
    };

    const rawRows = (wo.raw_materials || [])
      .map(
        (item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || item.description || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.qty || ''} ${item.unit || 'pcs'}</td>
        <td class="center">${item.unit || 'pcs'}</td>
      </tr>
    `
      )
      .join('');

    const bRows = (wo.consumables_b || [])
      .map(
        (item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.unit || 'Ea'}</td>
        <td class="center">${item.unit || 'Ea'}</td>
      </tr>
    `
      )
      .join('');

    const cRows = (wo.consumables_c || [])
      .map(
        (item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.unit || 'Ea'}</td>
        <td class="center">${item.unit || 'Ea'}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Work Order - ${wo.woNo}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
            .outer-table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
            .outer-table td, .outer-table th { border: 1px solid #000; }
            .no-border-table { width: 100%; border-collapse: collapse; }
            .no-border-table td { border: none !important; padding: 2px 5px; font-size: 11px; }
            .title-row { text-align: center; font-size: 18px; font-weight: bold; background-color: #f0f0f0; -webkit-print-color-adjust: exact; padding: 8px !important; }
            .header-col { vertical-align: top; padding: 5px; width: 50%; }
            .col-label { width: 110px; font-weight: bold; }
            .table-header { background-color: #e0e0e0; -webkit-print-color-adjust: exact; text-align: center; font-weight: bold; font-size: 10px; }
            .table-header td { padding: 5px; }
            .section-title { background-color: #f5f5f5; -webkit-print-color-adjust: exact; font-weight: bold; padding: 3px 5px; font-size: 10px; }
            .item-row td { height: 18px; padding: 2px 5px; font-size: 10px; }
            .center { text-align: center; }
            .signature-row td { height: 60px; vertical-align: top; padding: 5px; font-size: 10px; width: 33.33%; text-align: center; }
            .note-row td { height: 40px; vertical-align: top; padding: 5px; font-size: 10px; font-weight: bold; }
            .footer-text { margin-top: 20px; font-size: 14px; font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <table class="outer-table">
            <tr>
              <td colspan="5" class="title-row">Work Order (${wo.woNo})</td>
              <td colspan="2" style="padding: 5px; font-weight: bold; text-align: right;">Issued : ${wo.date || ''}</td>
            </tr>
            <tr>
              <td colspan="5" class="header-col">
                <table class="no-border-table">
                  <tr><td class="col-label">Name Man Power</td><td>: ${wo.man_power || ''}</td></tr>
                  <tr><td class="col-label">Jobdesc</td><td>: ${wo.jobdesc || ''}</td></tr>
                  <tr><td class="col-label">Produk / Model</td><td>: ${wo.product || wo.model_bracket || ''}</td></tr>
                </table>
              </td>
              <td colspan="2" class="header-col">
                <table class="no-border-table">
                  <tr><td class="col-label" style="width: 50px;">Qty</td><td>: ${wo.targetQty || 0} Set</td></tr>
                  <tr><td class="col-label">Start</td><td>: ${wo.start_date || ''}</td></tr>
                  <tr><td class="col-label">Finish</td><td>: ${wo.finish_date || ''}</td></tr>
                </table>
              </td>
            </tr>
            <tr class="table-header">
              <td style="width: 4%;">NO</td><td style="width: 30%;">DESCRIPTION</td><td style="width: 15%;">Supplier</td>
              <td style="width: 15%;">Part No.</td><td style="width: 15%;">Part No.</td>
              <td style="width: 10.5%;">Usage Q'ty</td><td style="width: 10.5%;">Unit</td>
            </tr>
            <tr><td colspan="7" class="section-title">Main Assay Parts<br/>A. Raw Material</td></tr>
            ${rawRows || renderEmptyRows(7, 'pcs')}
            <tr><td colspan="7" class="section-title">B. Consumable</td></tr>
            ${bRows || renderEmptyRows(10, 'Ea')}
            <tr><td colspan="7" class="section-title">C. Consumable</td></tr>
            ${cRows || renderEmptyRows(5, 'Ea')}
            <tr class="signature-row"><td colspan="3" style="border-right: none;">TTd</td><td colspan="2" style="border-right: none; border-left: none;">TTd</td><td colspan="2" style="border-left: none;">TTd</td></tr>
            <tr class="note-row"><td colspan="7">Note :</td></tr>
          </table>
          <div class="footer-text">PT. ALDIGENS Putera Persada</div>
          <script>window.onload = function() { window.focus(); setTimeout(() => { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-4 md:p-8 w-full max-w-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Buat Work Order (WO)</h2>
              <p className="text-sm text-slate-400">
                Tarik formula BOM dari database untuk perintah kerja perakitan produksi.
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-mono font-bold">
              {newWO.woNo}
            </span>
          </div>

          <form onSubmit={handleSaveNewWO} className="space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
                <Factory className="h-4 w-4" /> Pilih Referensi BOM (Bill of Materials)
              </label>
              <select
                value={newWO.refBOM}
                onChange={handleBomChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Tarik Data dari BOM ({bomList.length} tersedia) --</option>
                {bomList.map((b) => (
                  <option key={b.id} value={b.document_number}>
                    {b.document_number} — {b.product?.part_number ? `[${b.product.part_number}] ` : ''}
                    {b.product?.name || 'Produk Jadi'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Nama Produk Jadi Target *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Otomatis terisi saat pilih BOM..."
                  value={newWO.product}
                  onChange={(e) => setNewWO({ ...newWO, product: e.target.value, model_bracket: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Target Qty Produksi (Unit/Set) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newWO.targetQty}
                  onChange={(e) => setNewWO({ ...newWO, targetQty: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Name Man Power / Teknisi
                </label>
                <input
                  type="text"
                  placeholder="Nama operator / teknisi..."
                  value={newWO.man_power}
                  onChange={(e) => setNewWO({ ...newWO, man_power: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newWO.start_date}
                    onChange={(e) => setNewWO({ ...newWO, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Finish Date
                  </label>
                  <input
                    type="date"
                    value={newWO.finish_date}
                    onChange={(e) => setNewWO({ ...newWO, finish_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Jobdesc / Instruksi Kerja
                </label>
                <input
                  type="text"
                  value={newWO.jobdesc}
                  onChange={(e) => setNewWO({ ...newWO, jobdesc: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-6 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Save className="h-4 w-4" /> Simpan Work Order
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const inProgressCount = workOrders.filter((w) => w.status === 'Dalam Proses' || w.status === 'Menunggu').length;
  const completedCount = workOrders.filter((w) => w.status === 'Selesai').length;

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/20 border border-sky-500/30 p-3 rounded-xl shadow">
            <Wrench className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Work Order (WO)</h1>
            <p className="text-sm text-slate-400 mt-1">
              Surat perintah kerja produksi &amp; perakitan barang jadi berdasarkan BOM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadBomsFromApi}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Sinkronkan BOM"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBoms ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Work Order</span>
          </button>
        </div>
      </div>

      {/* 3 Kartu KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">WO Dalam Proses</p>
            <p className="text-xl font-extrabold text-sky-400 mt-1">{inProgressCount} Perintah Kerja</p>
            <p className="text-xs text-slate-500 mt-1">Sedang dikerjakan di workshop</p>
          </div>
          <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">WO Selesai</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">{completedCount} Selesai</p>
            <p className="text-xs text-slate-500 mt-1">Siap disetor di Product Result</p>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Cari No. WO / Produk Target
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="No. WO, Ref. BOM, atau Produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <th className="p-5 font-bold">Tanggal</th>
                <th className="p-5 font-bold">No. WO</th>
                <th className="p-5 font-bold">Ref. BOM</th>
                <th className="p-5 font-bold">Produk Target</th>
                <th className="p-5 font-bold">Target Qty</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-500">
                    Tidak ada data Work Order.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-5 text-slate-300">{item.date}</td>
                    <td className="p-5 font-mono font-bold text-sky-400">{item.woNo}</td>
                    <td className="p-5 font-mono text-indigo-400">{item.refBOM || '-'}</td>
                    <td className="p-5 font-semibold text-white">{item.product}</td>
                    <td className="p-5 text-slate-300">{item.targetQty} Unit</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition cursor-pointer"
                          title="Edit Data WO"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintWO(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                          title="Cetak Format Pabrik"
                        >
                          <Printer className="h-4 w-4" />
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

      {/* Modal Edit WO */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-800 my-8">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-400" /> Edit Dokumen Work Order ({editingWO?.woNo})
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Produk / Model</label>
                  <input
                    type="text"
                    value={form.model_bracket}
                    onChange={(e) => setForm({ ...form, model_bracket: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Target Qty</label>
                    <input
                      type="number"
                      value={form.qty}
                      onChange={(e) => setForm({ ...form, qty: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    >
                      <option value="Menunggu">Menunggu</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name Man Power</label>
                  <input
                    type="text"
                    value={form.man_power}
                    onChange={(e) => setForm({ ...form, man_power: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Finish Date</label>
                    <input
                      type="date"
                      value={form.finish_date}
                      onChange={(e) => setForm({ ...form, finish_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Jobdesc</label>
                  <textarea
                    value={form.jobdesc}
                    onChange={(e) => setForm({ ...form, jobdesc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-sm hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-sky-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-sky-600 flex items-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}