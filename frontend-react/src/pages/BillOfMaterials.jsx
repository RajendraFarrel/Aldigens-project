import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer, Layers, Box, CheckCircle2, XCircle } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Data Dummy BOM yang kaya informasi
  const [dummyBOMs, setDummyBOMs] = useState([
    { 
      id: 1, 
      bomNo: 'BOM-APAR-6KG', 
      productName: 'Fire Extinguisher 6 KG (APAR)', 
      qtyResult: 1, 
      status: 'Active', 
      isDefault: true,
      createdAt: '2026-09-01',
      materials: [
        onMaterial('Tabung Besi 6kg', 1, 'Pcs'),
        onMaterial('Gas CO2 / Powder (kg)', 6, 'Kg'),
        onMaterial('Selang & Semprotan', 1, 'Set')
      ]
    },
    { 
      id: 2, 
      bomNo: 'BOM-WIRING-H01', 
      productName: 'Wiring Harness ESD H400', 
      qtyResult: 10, 
      status: 'Active', 
      isDefault: false,
      createdAt: '2026-09-10',
      materials: [
        onMaterial('Kabel Utama Tembaga', 50, 'Meter'),
        onMaterial('Konektor Pin 8-way', 20, 'Pcs')
      ]
    },
  ]);

  const filteredBOMs = useMemo(() => {
    return dummyBOMs.filter(item =>
      item.bomNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dummyBOMs, searchTerm]);

  const pagination = usePagination(filteredBOMs, 10);

  // Helper untuk format material awal
  function onMaterial(name, qty, unit) {
    return { id: Date.now() + Math.random(), itemName: name, quantity: qty, unit: unit };
  }

  // State Form Input
  const [formData, setFormData] = useState({
    bomNo: 'BOM-' + Math.floor(100000 + Math.random() * 900000),
    productName: '',
    qtyResult: 1,
    status: 'Active',
    isDefault: false,
    materials: [{ id: Date.now(), itemName: '', quantity: 1, unit: 'Pcs' }]
  });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      bomNo: 'BOM-' + Math.floor(100000 + Math.random() * 900000),
      productName: '',
      qtyResult: 1,
      status: 'Active',
      isDefault: false,
      materials: [{ id: Date.now(), itemName: '', quantity: 1, unit: 'Pcs' }]
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const handleAddMaterialRow = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { id: Date.now(), itemName: '', quantity: 1, unit: 'Pcs' }]
    });
  };

  const handleRemoveMaterialRow = (id) => {
    if (formData.materials.length === 1) {
      alert('Formula minimal harus memiliki 1 komponen bahan baku!');
      return;
    }
    setFormData({
      ...formData,
      materials: formData.materials.filter(m => m.id !== id)
    });
  };

  const handleMaterialChange = (id, field, value) => {
    setFormData({
      ...formData,
      materials: formData.materials.map(m => m.id === id ? { ...m, [field]: value } : m)
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      alert('Nama Produk Jadi wajib diisi!');
      return;
    }

    if (editingId) {
      setDummyBOMs(dummyBOMs.map(item => item.id === editingId ? { ...item, ...formData } : item));
    } else {
      setDummyBOMs([{ id: Date.now(), createdAt: new Date().toISOString().split('T')[0], ...formData }, ...dummyBOMs]);
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Formula Produk (BOM) ini?')) {
      setDummyBOMs(dummyBOMs.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>BOM - ${item.bomNo}</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head>
      <body>
        <h2>PT. ALDIGENS PUTERA PERSADA</h2>
        <h3>FORMULA PRODUK (BILL OF MATERIALS)</h3>
        <p><strong>No. BOM:</strong> ${item.bomNo}</p>
        <p><strong>Produk Jadi:</strong> ${item.productName} (Hasil: ${item.qtyResult} Unit)</p>
        <p><strong>Status:</strong> ${item.status} ${item.isDefault ? '(Default)' : ''}</p>
        <h4>Daftar Komponen Bahan Baku:</h4>
        <table>
          <thead><tr><th>No</th><th>Nama Komponen / Bahan</th><th>Kuantitas</th><th>Satuan</th></tr></thead>
          <tbody>
            ${item.materials.map((m, idx) => `<tr><td>${idx+1}</td><td>${m.itemName}</td><td>${m.quantity}</td><td>${m.unit}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  // --- TAMPILAN FORM MODERN ---
  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          
          {/* Header Form */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit Formula Produk (BOM)' : 'Buat Formula Produk Baru'}
                </h2>
                <p className="text-xs text-slate-500">Tentukan produk jadi dan racikan komponen bahan baku di bawah ini</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.bomNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Informasi Utama Produk */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">No. BOM</label>
                <input type="text" value={formData.bomNo} disabled className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Produk Jadi (Finished Good)</label>
                <input required type="text" placeholder="Contoh: Fire Extinguisher 6 KG" value={formData.productName} onChange={(e) => setFormData({...formData, productName: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Kuantitas Hasil (Yield Qty)</label>
                <input required type="number" min="1" value={formData.qtyResult} onChange={(e) => setFormData({...formData, qtyResult: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status Formula</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="Active">Active (Aktif)</option>
                  <option value="Suspended">Suspended (Ditangguhkan)</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.isDefault} onChange={(e) => setFormData({...formData, isDefault: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Jadikan BOM Utama (Default)</span>
                </label>
              </div>
            </div>

            {/* Tabel Komponen Bahan Baku (Materials) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" /> Komponen Bahan Baku / Material
                </h3>
                <button type="button" onClick={handleAddMaterialRow} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Bahan
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Nama Material / Komponen</th>
                      <th className="px-4 py-3 w-36">Kuantitas</th>
                      <th className="px-4 py-3 w-32">Satuan</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.materials.map((mat, index) => (
                      <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Nama bahan baku / part..." value={mat.itemName} onChange={(e) => handleMaterialChange(mat.id, 'itemName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="0.01" step="any" value={mat.quantity} onChange={(e) => handleMaterialChange(mat.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <select value={mat.unit} onChange={(e) => handleMaterialChange(mat.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                            <option value="Pcs">Pcs</option>
                            <option value="Kg">Kg</option>
                            <option value="Gram">Gram</option>
                            <option value="Meter">Meter</option>
                            <option value="Liter">Liter</option>
                            <option value="Set">Set</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveMaterialRow(mat.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition" title="Hapus Baris">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tombol Simpan Aksi */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition">
                <Save className="h-4 w-4" /> Simpan Formula BOM
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DAFTAR (LIST) MODERN ---
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        {/* Top Header & Search */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. BOM atau produk..." 
                className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition">
            <Plus className="h-4 w-4" />
            Buat Formula (BOM) Baru
          </button>
        </div>

        {/* Tabel Data BOM */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">No. BOM</th>
                <th className="px-6 py-3.5">Produk Jadi</th>
                <th className="px-6 py-3.5">Hasil (Yield)</th>
                <th className="px-6 py-3.5">Jumlah Komponen</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada Formula Produk (BOM) ditemukan.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Box className="h-4 w-4 text-slate-400" />
                    {item.bomNo}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                    {item.productName}
                    {item.isDefault && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold rounded-md">Default</span>}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.qtyResult} Unit</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {item.materials.length} Komponen Bahan
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                      {item.status === 'Active' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 inline" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                        <button 
                          onClick={() => handleOpenEditForm(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4 text-blue-500" /> Edit Formula
                        </button>
                        <button 
                          onClick={() => handlePrint(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Printer className="h-4 w-4 text-emerald-500" /> Cetak Dokumen
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus BOM
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controller */}
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