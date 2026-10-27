import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Trash2, Printer, FileText, CheckCircle2, Box } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { swalToast } from '../utils/swal';

export default function MaterialRelease() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);

  const [materialReleases, setMaterialReleases] = useState(() => {
    const saved = localStorage.getItem('aldigens_material_release');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'MR-202609-001', mrNo: 'MR-202609-001', refWO: 'WO-202609-001', date: '25 Sep 2026', pic: 'Budi Santoso', status: 'Dikeluarkan', materials: [{ desc: 'Body Utama', qty: 50, unit: 'pcs' }, { desc: 'Kawat Las', qty: 2, unit: 'Ea' }] },
      { id: 'MR-202609-002', mrNo: 'MR-202609-002', refWO: 'WO-202609-002', date: '24 Sep 2026', pic: 'Andi Wijaya', status: 'Dikeluarkan', materials: [{ desc: 'Kabel Utama', qty: 10, unit: 'Meter' }] },
      { id: 'MR-202609-003', mrNo: 'MR-202609-003', refWO: 'WO-202609-003', date: '26 Sep 2026', pic: 'Siti Aminah', status: 'Draft', materials: [] },
    ];
  });

  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    const savedWO = localStorage.getItem('aldigens_wo');
    if (savedWO) {
      setWorkOrders(JSON.parse(savedWO));
    }
  }, []);

  const [formData, setFormData] = useState({
    mrNo: `MR-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    refWO: '',
    date: new Date().toISOString().split('T')[0],
    pic: '',
    status: 'Dikeluarkan',
    materials: []
  });

  const filteredRelease = useMemo(() => {
    return materialReleases.filter(
      (item) =>
        item.mrNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.refWO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pic?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materialReleases, searchTerm]);

  const pagination = usePagination(filteredRelease, 10);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Dikeluarkan':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Draft':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleOpenAddForm = () => {
    setFormData({
      mrNo: `MR-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      refWO: '',
      date: new Date().toISOString().split('T')[0],
      pic: '',
      status: 'Dikeluarkan',
      materials: []
    });
    setViewMode('form');
  };

  const handleWoChange = (e) => {
    const selectedWoNo = e.target.value;
    const wo = workOrders.find(w => w.woNo === selectedWoNo);
    
    if (wo) {
      const combined = [
        ...(wo.raw_materials || []).map(m => ({ desc: m.desc || m.itemName || 'Material', qty: wo.targetQty || 1, unit: m.unit || 'pcs' })),
        ...(wo.consumables_b || []).map(m => ({ desc: m.desc || 'Consumable B', qty: 1, unit: m.unit || 'Ea' })),
        ...(wo.consumables_c || []).map(m => ({ desc: m.desc || 'Consumable C', qty: 1, unit: m.unit || 'Ea' }))
      ];
      setFormData(prev => ({
        ...prev,
        refWO: selectedWoNo,
        materials: combined
      }));
    } else {
      setFormData(prev => ({ ...prev, refWO: '', materials: [] }));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.refWO) {
      alert('Pilih referensi Work Order terlebih dahulu!');
      return;
    }

    const payload = { id: formData.mrNo, ...formData };
    const updated = [payload, ...materialReleases];
    setMaterialReleases(updated);
    localStorage.setItem('aldigens_material_release', JSON.stringify(updated));
    setViewMode('list');

    if (typeof swalToast === 'function') {
      swalToast('Material Release berhasil disimpan!', 'success');
    } else {
      alert('Material Release berhasil disimpan!');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen Material Release ini?')) {
      const updated = materialReleases.filter(item => item.id !== id);
      setMaterialReleases(updated);
      localStorage.setItem('aldigens_material_release', JSON.stringify(updated));
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Material Release - ${item.mrNo}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #000; }
            h2, h3 { text-align: center; margin: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; -webkit-print-color-adjust: exact; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>PT. ALDIGENS PUTERA PERSADA</h2>
          <h3>BUKTI PENGELUARAN MATERIAL (MATERIAL RELEASE)</h3>
          <p><strong>No. MR:</strong> ${item.mrNo} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Ref. WO:</strong> ${item.refWO}</p>
          <p><strong>Tanggal:</strong> ${item.date} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Penanggung Jawab:</strong> ${item.pic || '-'}</p>
          <table>
            <thead>
              <tr><th class="center" style="width: 40px;">No</th><th>Deskripsi Material / Komponen</th><th class="center" style="width: 80px;">Kuantitas</th><th class="center" style="width: 80px;">Satuan</th></tr>
            </thead>
            <tbody>
              ${(item.materials || []).map((m, idx) => `<tr><td class="center">${idx+1}</td><td>${m.desc}</td><td class="center">${m.qty}</td><td class="center">${m.unit}</td></tr>`).join('')}
            </tbody>
          </table>
          <br/><br/>
          <table style="border: none; width: 100%;">
            <tr>
              <td style="border: none; text-align: center; height: 60px; vertical-align: bottom;">Diserahkan Oleh (Gudang),<br/><br/>( ______________ )</td>
              <td style="border: none; text-align: center; height: 60px; vertical-align: bottom;">Diterima Oleh (Produksi),<br/><br/>( ______________ )</td>
            </tr>
          </table>
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
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Rilis Bahan Baku (Material Release)</h2>
                <p className="text-xs text-slate-500">Keluarkan material berdasarkan referensi Work Order</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.mrNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pilih Work Order (WO)</label>
                <select required value={formData.refWO} onChange={handleWoChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="">-- Pilih Referensi WO --</option>
                  {workOrders.map(wo => (
                    <option key={wo.id || wo.woNo} value={wo.woNo}>{wo.woNo} - {wo.product || wo.model_bracket}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Penanggung Jawab (PIC)</label>
                <input required type="text" placeholder="Nama petugas gudang..." value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status Dokumen</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="Dikeluarkan">Dikeluarkan</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Daftar Komponen Material</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Deskripsi Komponen</th>
                      <th className="px-4 py-3 w-36">Kuantitas</th>
                      <th className="px-4 py-3 w-32">Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.materials.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">Pilih Work Order di atas untuk memuat daftar material.</td></tr>
                    ) : (
                      formData.materials.map((m, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{m.desc}</td>
                          <td className="px-4 py-3">
                            <input type="number" min="0.01" step="any" value={m.qty} onChange={e => {
                              const updated = [...formData.materials];
                              updated[idx].qty = Number(e.target.value);
                              setFormData({...formData, materials: updated});
                            }} className="w-full px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-sm dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.unit}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition cursor-pointer">
                <Save className="h-4 w-4" /> Simpan Pengeluaran Bahan
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
                placeholder="Cari no. rilis, WO, atau PIC..." 
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Rilis Bahan Baku
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. Pengeluaran</th>
                <th className="px-6 py-4 font-medium">Ref. WO</th>
                <th className="px-6 py-4 font-medium">Penanggung Jawab</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data pengeluaran bahan baku.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition relative">
                    <td className="px-6 py-4">{item.date}</td>
                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Box className="h-4 w-4 text-slate-400" />
                      {item.mrNo}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.refWO}</td>
                    <td className="px-6 py-4">{item.pic}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 w-max ${getStatusBadge(item.status)}`}>
                        {item.status === 'Dikeluarkan' && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4 inline" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-12 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                          <button 
                            onClick={() => handlePrint(item)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <Printer className="h-4 w-4 text-emerald-500" /> Cetak Slip Rilis
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Hapus Data
                          </button>
                        </div>
                      )}
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
    </div>
  );
}