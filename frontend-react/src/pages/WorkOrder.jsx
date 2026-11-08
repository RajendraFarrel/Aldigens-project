import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit2, Printer, X, Save, FileText, Factory } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { swalToast } from '../utils/swal'; 

export default function WorkOrder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // State untuk menyimpan daftar BOM dari Local Storage
  const [bomList, setBomList] = useState([]);

  useEffect(() => {
    const savedBoms = localStorage.getItem('aldigens_boms');
    if (savedBoms) {
      setBomList(JSON.parse(savedBoms));
    }
  }, []);

  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem('aldigens_wo');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, date: '25 Sep 2026', woNo: 'WO-202609-001', refBOM: 'BOM-202609-001', product: 'Meja Belajar Kayu', targetQty: 50, status: 'Dalam Proses', man_power: 'Dicky', jobdesc: 'Pelatihan Pengelasan Loto 2 sistem horizontal Puzle', model_bracket: 'Lotto 2 sistem horizontal', start_date: '2026-10-20', finish_date: '', raw_materials: [{ desc: 'Body Utama', unit: 'pcs' }, { desc: 'Bahu bawah', unit: 'pcs' }], consumables_b: [], consumables_c: [] },
      { id: 2, date: '24 Sep 2026', woNo: 'WO-202609-002', refBOM: 'BOM-202609-002', product: 'Kursi Kantor Ergonomis', targetQty: 100, status: 'Selesai' },
      { id: 3, date: '26 Sep 2026', woNo: 'WO-202609-003', refBOM: 'BOM-202609-001', product: 'Meja Belajar Kayu', targetQty: 25, status: 'Menunggu' },
    ];
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
    raw_materials: [],
    consumables_b: [],
    consumables_c: []
  });

  const [newWO, setNewWO] = useState({
    woNo: `WO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    refBOM: '',
    product: '',
    man_power: '',
    jobdesc: '',
    model_bracket: '',
    targetQty: 1,
    start_date: new Date().toISOString().split('T')[0],
    finish_date: '',
    status: 'Menunggu',
    raw_materials: [],
    consumables_b: [],
    consumables_c: []
  });

  const filteredWO = workOrders.filter(
    (item) =>
      item.woNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredWO, 10);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Dalam Proses': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'Menunggu': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleOpenEdit = (wo) => {
    setEditingWO(wo);
    setForm({
      man_power: wo.man_power || '',
      jobdesc: wo.jobdesc || '',
      model_bracket: wo.model_bracket || '',
      start_date: wo.start_date || '',
      finish_date: wo.finish_date || '',
      qty: wo.targetQty || parseInt(wo.targetQty) || 0,
      raw_materials: wo.raw_materials?.length ? wo.raw_materials : [{ desc: '', unit: 'pcs' }],
      consumables_b: wo.consumables_b?.length ? wo.consumables_b : [{ desc: '', unit: 'Ea' }],
      consumables_c: wo.consumables_c?.length ? wo.consumables_c : [{ desc: '', unit: 'Ea' }],
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const updatedList = workOrders.map(wo => {
      if (wo.id === editingWO.id) {
        return { 
          ...wo, 
          man_power: form.man_power,
          jobdesc: form.jobdesc,
          model_bracket: form.model_bracket,
          start_date: form.start_date,
          finish_date: form.finish_date,
          targetQty: form.qty,
          raw_materials: form.raw_materials,
          consumables_b: form.consumables_b,
          consumables_c: form.consumables_c,
        };
      }
      return wo;
    });

    setWorkOrders(updatedList);
    localStorage.setItem('aldigens_wo', JSON.stringify(updatedList));
    setShowEditModal(false);
    
    if (typeof swalToast === 'function') {
      swalToast('Data Work Order berhasil diperbarui!', 'success');
    } else {
      alert('Data Work Order berhasil diperbarui!');
    }
  };

  // Menarik Data dari State bomList (Local Storage)
  const handleBomChange = (e) => {
    const bomId = e.target.value;
    const bom = bomList.find(b => b.id === bomId);
    
    if (bom) {
      setNewWO(prev => ({
        ...prev,
        refBOM: bomId,
        product: bom.productName || 'Produk dari BOM', 
        model_bracket: bom.model_bracket || '',
        jobdesc: bom.jobdesc || '',
        raw_materials: bom.raw_materials ? [...bom.raw_materials] : [],
        consumables_b: bom.consumables_b ? [...bom.consumables_b] : [],
        consumables_c: bom.consumables_c ? [...bom.consumables_c] : [],
      }));
    } else {
      setNewWO(prev => ({ ...prev, refBOM: '', product: '', model_bracket: '', jobdesc: '', raw_materials: [], consumables_b: [], consumables_c: [] }));
    }
  };

  const handleSaveNewWO = (e) => {
    e.preventDefault();
    const payload = { id: Date.now(), ...newWO };
    const updatedList = [payload, ...workOrders];
    
    setWorkOrders(updatedList);
    localStorage.setItem('aldigens_wo', JSON.stringify(updatedList));
    setViewMode('list');
    
    if (typeof swalToast === 'function') {
      swalToast('Work Order baru berhasil dibuat!', 'success');
    } else {
      alert('Work Order baru berhasil dibuat!');
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

    const rawRows = (wo.raw_materials || []).map((item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.unit || 'pcs'}</td>
        <td class="center">${item.unit || 'pcs'}</td>
      </tr>
    `).join('');

    const bRows = (wo.consumables_b || []).map((item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.unit || 'Ea'}</td>
        <td class="center">${item.unit || 'Ea'}</td>
      </tr>
    `).join('');

    const cRows = (wo.consumables_c || []).map((item, idx) => `
      <tr class="item-row">
        <td class="center">${idx + 1}</td>
        <td>${item.desc || ''}</td>
        <td>${item.supplier || ''}</td>
        <td>${item.part_no1 || ''}</td>
        <td>${item.part_no2 || ''}</td>
        <td class="center">${item.unit || 'Ea'}</td>
        <td class="center">${item.unit || 'Ea'}</td>
      </tr>
    `).join('');

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
              <td colspan="5" class="title-row">Work Of order</td>
              <td colspan="2" style="padding: 5px; font-weight: bold; text-align: right;">Issued : &nbsp;&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;&nbsp; / 25</td>
            </tr>
            <tr>
              <td colspan="5" class="header-col">
                <table class="no-border-table">
                  <tr><td class="col-label">Name Man Power</td><td>: ${wo.man_power || ''}</td></tr>
                  <tr><td class="col-label">Jobdesc</td><td>: ${wo.jobdesc || ''}</td></tr>
                  <tr><td class="col-label">Model Bracket</td><td>: ${wo.model_bracket || ''}</td></tr>
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
              <td style="width: 10.5%;">Usage Q'ty</td><td style="width: 10.5%;">Usage Q'ty</td>
            </tr>
            
            <tr><td colspan="7" class="section-title">Main Asay Parts<br/>A. Raw Material</td></tr>
            ${rawRows || renderEmptyRows(7, 'pcs')}
            ${(wo.raw_materials?.length > 0 && wo.raw_materials?.length < 7) ? renderEmptyRows(7 - wo.raw_materials.length, 'pcs') : ''}
            
            <tr><td colspan="7" class="section-title">B. Consumable</td></tr>
            ${bRows || renderEmptyRows(12, 'Ea')}
            ${(wo.consumables_b?.length > 0 && wo.consumables_b?.length < 12) ? renderEmptyRows(12 - wo.consumables_b.length, 'Ea') : ''}
            
            <tr><td colspan="7" class="section-title">C. Consumable</td></tr>
            ${cRows || renderEmptyRows(5, 'Ea')}
            ${(wo.consumables_c?.length > 0 && wo.consumables_c?.length < 5) ? renderEmptyRows(5 - wo.consumables_c.length, 'Ea') : ''}
            
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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Buat Work Order (WO)</h2>
              <p className="text-xs text-slate-500">Integrasi data BOM ke formulir perintah kerja produksi</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {newWO.woNo}
            </span>
          </div>

          <form onSubmit={handleSaveNewWO} className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                    <Factory className="h-4 w-4" /> Pilih Referensi BOM (Bill of Materials)
                </label>
                <select value={newWO.refBOM} onChange={handleBomChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    <option value="">-- Tarik Data dari BOM --</option>
                    {bomList.map(b => (
                        <option key={b.id} value={b.id}>{b.id} - {b.model_bracket}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Name Man Power</label>
                <input type="text" value={newWO.man_power} onChange={(e) => setNewWO({ ...newWO, man_power: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">QTY Produksi</label>
                <input type="number" value={newWO.targetQty} onChange={(e) => setNewWO({ ...newWO, targetQty: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Jobdesc</label>
                <input type="text" value={newWO.jobdesc} onChange={(e) => setNewWO({ ...newWO, jobdesc: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Model Bracket</label>
                <input type="text" value={newWO.model_bracket} onChange={(e) => setNewWO({ ...newWO, model_bracket: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Start Date</label>
                  <input type="date" value={newWO.start_date} onChange={(e) => setNewWO({ ...newWO, start_date: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Finish Date</label>
                  <input type="date" value={newWO.finish_date} onChange={(e) => setNewWO({ ...newWO, finish_date: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition">
                <Save className="h-4 w-4" /> Simpan Work Order
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. WO atau produk..." 
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <button onClick={() => setViewMode('form')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Buat Work Order
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. WO</th>
                <th className="px-6 py-4 font-medium">Ref. BOM</th>
                <th className="px-6 py-4 font-medium">Produk Target</th>
                <th className="px-6 py-4 font-medium">Target Qty</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data Work Order.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">{item.date}</td>
                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                      {item.woNo}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.refBOM}</td>
                    <td className="px-6 py-4 font-medium">{item.product}</td>
                    <td className="px-6 py-4">{item.targetQty} {String(item.targetQty).includes('Unit') ? '' : 'Unit'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenEdit(item)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition" title="Edit Data WO">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handlePrintWO(item)} className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 transition" title="Cetak Format Pabrik">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" /> Edit Dokumen Cetak WO
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Name Man Power</label>
                  <input type="text" value={form.man_power} onChange={e => setForm({...form, man_power: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" placeholder="Contoh: Dicky" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Qty (Set)</label>
                  <input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Model Bracket</label>
                  <input type="text" value={form.model_bracket} onChange={e => setForm({...form, model_bracket: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" placeholder="Contoh: Lotto 2 sistem horizontal" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Finish Date</label>
                    <input type="date" value={form.finish_date} onChange={e => setForm({...form, finish_date: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Jobdesc</label>
                  <textarea value={form.jobdesc} onChange={e => setForm({...form, jobdesc: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" rows="2" placeholder="Detail pekerjaan..."></textarea>
                </div>
              </div>

              {/* SECTION A: RAW MATERIAL */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">A. Raw Material</h4>
                  <button onClick={() => setForm({...form, raw_materials: [...form.raw_materials, {desc: '', unit: 'pcs'}]})} className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-700"><Plus className="h-3 w-3"/> Tambah Baris</button>
                </div>
                {form.raw_materials.map((rm, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={rm.desc} onChange={e => { const newRm = [...form.raw_materials]; newRm[i].desc = e.target.value; setForm({...form, raw_materials: newRm})}} placeholder={`Description ${i+1}`} className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                    <input type="text" value={rm.unit} onChange={e => { const newRm = [...form.raw_materials]; newRm[i].unit = e.target.value; setForm({...form, raw_materials: newRm})}} placeholder="Unit" className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>

              {/* SECTION B: CONSUMABLE */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">B. Consumable</h4>
                  <button onClick={() => setForm({...form, consumables_b: [...form.consumables_b, {desc: '', unit: 'Ea'}]})} className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-700"><Plus className="h-3 w-3"/> Tambah Baris</button>
                </div>
                {form.consumables_b.map((rm, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={rm.desc} onChange={e => { const newRm = [...form.consumables_b]; newRm[i].desc = e.target.value; setForm({...form, consumables_b: newRm})}} placeholder={`Description B ${i+1}`} className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                    <input type="text" value={rm.unit} onChange={e => { const newRm = [...form.consumables_b]; newRm[i].unit = e.target.value; setForm({...form, consumables_b: newRm})}} placeholder="Unit" className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>

              {/* SECTION C: CONSUMABLE */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">C. Consumable</h4>
                  <button onClick={() => setForm({...form, consumables_c: [...form.consumables_c, {desc: '', unit: 'Ea'}]})} className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-700"><Plus className="h-3 w-3"/> Tambah Baris</button>
                </div>
                {form.consumables_c.map((rm, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={rm.desc} onChange={e => { const newRm = [...form.consumables_c]; newRm[i].desc = e.target.value; setForm({...form, consumables_c: newRm})}} placeholder={`Description C ${i+1}`} className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
                    <input type="text" value={rm.unit} onChange={e => { const newRm = [...form.consumables_c]; newRm[i].unit = e.target.value; setForm({...form, consumables_c: newRm})}} placeholder="Unit" className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Batal</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 cursor-pointer"><Save className="h-4 w-4" /> Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}