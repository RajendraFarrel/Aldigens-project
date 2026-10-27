import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer, Layers, Box, CheckCircle2, XCircle } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [boms, setBoms] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('aldigens_boms');
    if (saved) {
      setBoms(JSON.parse(saved));
    } else {
      // Data awal jika kosong
      const initialData = [{
        id: 'BOM-202609-001',
        bomNo: 'BOM-202609-001',
        model_bracket: 'Lotto 2 sistem horizontal',
        jobdesc: 'Pelatihan Pengelasan Loto 2 sistem horizontal Puzle',
        qtyResult: 1,
        status: 'Active',
        raw_materials: [
          { desc: 'Body Utama', supplier: '', part_no1: '', part_no2: '', unit: 'pcs' },
          { desc: 'Bahu bawah', supplier: '', part_no1: '', part_no2: '', unit: 'pcs' }
        ],
        consumables_b: [{ desc: 'Kawat Las', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }],
        consumables_c: [{ desc: 'Sarung Tangan', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }]
      }];
      setBoms(initialData);
      localStorage.setItem('aldigens_boms', JSON.stringify(initialData));
    }
  }, []);

  const filteredBOMs = useMemo(() => {
    return boms.filter(item =>
      item.bomNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model_bracket?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [boms, searchTerm]);

  const pagination = usePagination(filteredBOMs, 10);

  const [formData, setFormData] = useState({
    bomNo: `BOM-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    model_bracket: '',
    jobdesc: '',
    qtyResult: 1,
    status: 'Active',
    raw_materials: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'pcs' }],
    consumables_b: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }],
    consumables_c: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }]
  });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      bomNo: `BOM-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      model_bracket: '',
      jobdesc: '',
      qtyResult: 1,
      status: 'Active',
      raw_materials: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'pcs' }],
      consumables_b: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }],
      consumables_c: [{ desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'Ea' }]
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    let updatedList;
    if (editingId) {
      updatedList = boms.map(item => item.id === editingId ? { ...item, ...formData } : item);
    } else {
      updatedList = [{ id: formData.bomNo, ...formData }, ...boms];
    }
    
    setBoms(updatedList);
    localStorage.setItem('aldigens_boms', JSON.stringify(updatedList));
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus Formula BOM ini?')) {
      const updated = boms.filter(item => item.id !== id);
      setBoms(updated);
      localStorage.setItem('aldigens_boms', JSON.stringify(updated));
      setActiveMenuId(null);
    }
  };

  const renderMaterialFields = (category, label) => (
    <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</h4>
        <button type="button" onClick={() => setFormData({ ...formData, [category]: [...formData[category], { desc: '', supplier: '', part_no1: '', part_no2: '', unit: 'pcs' }] })} className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-700"><Plus className="h-3 w-3"/> Tambah Baris</button>
      </div>
      {formData[category].map((rm, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input type="text" value={rm.desc} onChange={e => { const newArr = [...formData[category]]; newArr[i].desc = e.target.value; setFormData({ ...formData, [category]: newArr }); }} placeholder="Deskripsi Barang..." className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
          <input type="text" value={rm.part_no1} onChange={e => { const newArr = [...formData[category]]; newArr[i].part_no1 = e.target.value; setFormData({ ...formData, [category]: newArr }); }} placeholder="Part No 1" className="w-24 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500" />
          <input type="text" value={rm.unit} onChange={e => { const newArr = [...formData[category]]; newArr[i].unit = e.target.value; setFormData({ ...formData, [category]: newArr }); }} placeholder="Unit" className="w-16 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-800 dark:text-white text-center focus:outline-none focus:border-blue-500" />
          <button type="button" onClick={() => { const newArr = formData[category].filter((_, idx) => idx !== i); setFormData({ ...formData, [category]: newArr }); }} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingId ? 'Edit Formula BOM' : 'Buat BOM Baru'}</h2>
                <p className="text-xs text-slate-500">Master data racikan bahan untuk ditarik ke Work Order</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">{formData.bomNo}</span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">No. BOM</label>
                <input type="text" value={formData.bomNo} disabled className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Model Bracket (Produk)</label>
                <input required type="text" value={formData.model_bracket} onChange={(e) => setFormData({...formData, model_bracket: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Jobdesc / Deskripsi</label>
                <input required type="text" value={formData.jobdesc} onChange={(e) => setFormData({...formData, jobdesc: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
            </div>

            {renderMaterialFields('raw_materials', 'A. Raw Material')}
            {renderMaterialFields('consumables_b', 'B. Consumable')}
            {renderMaterialFields('consumables_c', 'C. Consumable')}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition"><Save className="h-4 w-4" /> Simpan BOM</button>
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
              <input type="text" placeholder="Cari Model Bracket..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200" />
            </div>
          </div>
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition">
            <Plus className="h-4 w-4" /> Buat Formula (BOM) Baru
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">No. BOM</th>
                <th className="px-6 py-3.5">Model Bracket</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">Tidak ada Formula (BOM) ditemukan.</td></tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"><Box className="h-4 w-4 text-slate-400" />{item.bomNo}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.model_bracket}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> {item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"><MoreVertical className="h-4 w-4 inline" /></button>
                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                        <button onClick={() => handleOpenEditForm(item)} className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"><Edit3 className="h-4 w-4 text-blue-500" /> Edit BOM</button>
                        <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700 cursor-pointer"><Trash2 className="h-4 w-4" /> Hapus BOM</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={pagination.currentPage} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} />
      </div>
    </div>
  );
}