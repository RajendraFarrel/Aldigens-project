import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Trash2, CheckCircle2, Package } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { swalToast } from '../utils/swal';
import axios from 'axios';

export default function ProductResult() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [formError, setFormError] = useState(null); // State error dari backend

  const [productResults, setProductResults] = useState(() => {
    const saved = localStorage.getItem('aldigens_product_result');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    const savedWO = localStorage.getItem('aldigens_wo');
    if (savedWO) {
      setWorkOrders(JSON.parse(savedWO));
    }
  }, []);

  const [formData, setFormData] = useState({
    prNo: `PRST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    refWO: '',
    date: new Date().toISOString().split('T')[0],
    product: '',
    qtyIn: 1,
    unit: 'Unit',
    status: 'Disetujui'
  });

  const filteredResult = useMemo(() => {
    return productResults.filter(
      (item) =>
        item.prNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.refWO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productResults, searchTerm]);

  const pagination = usePagination(filteredResult, 10);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Draft':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleOpenForm = () => {
    setFormError(null);
    setFormData({
      prNo: `PRST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      refWO: '',
      date: new Date().toISOString().split('T')[0],
      product: '',
      qtyIn: 1,
      unit: 'Unit',
      status: 'Disetujui'
    });
    setViewMode('form');
  };

  const handleWoChange = (e) => {
    const selectedWoNo = e.target.value;
    const wo = workOrders.find(w => w.woNo === selectedWoNo);
    
    if (wo) {
      setFormData(prev => ({
        ...prev,
        refWO: selectedWoNo,
        product: wo.product || wo.items?.[0]?.description || 'Produk Hasil Produksi',
        qtyIn: Number(wo.targetQty || wo.items?.[0]?.target_qty || 1)
      }));
    } else {
      setFormData(prev => ({ ...prev, refWO: '', product: '', qtyIn: 1 }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.refWO) {
      setFormError('Pilih referensi Work Order terlebih dahulu!');
      return;
    }

    try {
      // 1. KIRIM DATA KE BACKEND LARAVEL
      const response = await axios.post('http://localhost:8000/api/product-results', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (typeof swalToast === 'function') {
        swalToast('Hasil produksi dicatat, stok barang jadi bertambah!', 'success');
      } else {
        alert('Sukses! Hasil produksi dicatat & stok bertambah.');
      }
      
      // Update UI state sementara (sebagai fallback local)
      const payload = { id: formData.prNo, ...formData };
      const updated = [payload, ...productResults];
      setProductResults(updated);
      localStorage.setItem('aldigens_product_result', JSON.stringify(updated));
      
      setViewMode('list');

    } catch (error) {
      console.error("Gagal menyimpan ke backend:", error);

      // --- TANGKAP ERROR DARI LARAVEL ---
      if (error.response) {
        const responseData = error.response.data;
        if (responseData.errors) {
          const messages = Object.values(responseData.errors).flat().join(' ');
          setFormError(`Validasi Gagal: ${messages}`);
        } else if (responseData.message) {
          setFormError(responseData.message);
        } else {
          setFormError(`Kesalahan Server (Status: ${error.response.status})`);
        }
      } else if (error.request) {
        setFormError('Tidak dapat terhubung ke server Laravel. Pastikan backend menyala!');
      } else {
        setFormError(`Gagal mengirim: ${error.message}`);
      }
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus data hasil produksi ini?')) {
      const updated = productResults.filter(item => item.id !== id);
      setProductResults(updated);
      localStorage.setItem('aldigens_product_result', JSON.stringify(updated));
      setActiveMenuId(null);
    }
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Catat Hasil Produksi (Product Result)</h2>
                <p className="text-xs text-slate-500">Setor barang jadi ke gudang berdasarkan Work Order</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.prNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* KOTAK ERROR DARI BACKEND */}
            {formError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
                <span className="font-bold">⚠️ Gagal:</span>
                <div className="flex-1">{formError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pilih Work Order (WO)</label>
                <select required value={formData.refWO} onChange={handleWoChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="">-- Pilih Referensi WO --</option>
                  {workOrders.map(wo => (
                    <option key={wo.id || wo.woNo} value={wo.woNo}>
                      {wo.woNo} - {wo.product || 'Produk WO'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal Setor</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Produk Jadi</label>
                <input required type="text" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Qty Masuk</label>
                  <input required type="number" min="1" value={formData.qtyIn} onChange={e => setFormData({...formData, qtyIn: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Satuan</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status Dokumen</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="Disetujui">Disetujui (Tambah Stok Gudang)</option>
                  <option value="Draft">Draft (Belum Update Stok)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition cursor-pointer">
                <Save className="h-4 w-4" /> Simpan Hasil Produksi
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
                placeholder="Cari no. hasil atau WO..." 
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <button onClick={handleOpenForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Catat Hasil Produksi
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. Hasil Produksi</th>
                <th className="px-6 py-4 font-medium">Ref. WO</th>
                <th className="px-6 py-4 font-medium">Produk Jadi</th>
                <th className="px-6 py-4 font-medium">Qty Masuk</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data hasil produksi.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition relative">
                    <td className="px-6 py-4">{item.date}</td>
                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      {item.prNo}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.refWO}</td>
                    <td className="px-6 py-4 font-medium">{item.product}</td>
                    <td className="px-6 py-4">{item.qtyIn} {item.unit || 'Unit'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 w-max ${getStatusBadge(item.status)}`}>
                        {item.status === 'Disetujui' && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <MoreVertical className="h-5 w-5 inline" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-12 top-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-20 text-left">
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Hapus
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