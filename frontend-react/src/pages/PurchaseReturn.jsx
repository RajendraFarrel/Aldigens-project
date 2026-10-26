import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, MoreVertical, ArrowLeft, Save, Trash2, Printer, FileDown, CheckCircle2, RotateCcw } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api from '../services/api';

const emptyItem = () => ({ part_number: '', description: '', qty: 1, reason: 'Rusak / Cacat' });

export default function PurchaseReturn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const rowSeq = useRef(0);

  const [formData, setFormData] = useState({
    return_number: `PRT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    ref_document: '',
    status: 'Diproses',
    notes: '',
    items: [emptyItem()]
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await api.get('/purchase-returns').catch(() => null);
      const apiData = response?.data?.data || response?.data;
      if (Array.isArray(apiData) && apiData.length > 0) {
        setReturns(apiData);
      } else {
        setReturns(JSON.parse(localStorage.getItem('aldigens_purchase_returns') || '[]'));
      }
    } catch {
      setReturns(JSON.parse(localStorage.getItem('aldigens_purchase_returns') || '[]'));
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(item =>
      item.return_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [returns, searchTerm]);

  const pagination = usePagination(filteredReturns, 10);

  const handleOpenAddForm = () => {
    setFormData({
      return_number: `PRT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      supplier_name: '',
      ref_document: '',
      status: 'Diproses',
      notes: '',
      items: [{ id: Date.now(), ...emptyItem() }]
    });
    setViewMode('form');
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now() + (rowSeq.current++), ...emptyItem() }]
    }));
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== id)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { id: Date.now(), ...formData };

    try {
      await api.post('/purchase-returns', payload).catch(() => console.log('Fallback ke Local Storage'));
      const existing = JSON.parse(localStorage.getItem('aldigens_purchase_returns') || '[]');
      const updatedList = [payload, ...existing];
      localStorage.setItem('aldigens_purchase_returns', JSON.stringify(updatedList));
      
      setReturns(updatedList);
      setViewMode('list');
    } catch (error) {
      alert('Terjadi kesalahan saat menyimpan data retur.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus dokumen retur ini?')) {
      try {
        await api.delete(`/purchase-returns/${id}`).catch(() => {});
      } catch {}
      const updated = returns.filter(item => item.id !== id);
      setReturns(updated);
      localStorage.setItem('aldigens_purchase_returns', JSON.stringify(updated));
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Purchase Return - ${item.return_number}</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head>
      <body>
        <h2>PT. ALDIGENS PUTERA PERSADA</h2>
        <h3>FORM RETUR PEMBELIAN (PURCHASE RETURN)</h3>
        <p><strong>No. Retur:</strong> ${item.return_number} | <strong>Tanggal:</strong> ${item.date}</p>
        <p><strong>Supplier:</strong> ${item.supplier_name} | <strong>Ref Dokumen:</strong> ${item.ref_document || '-'}</p>
        <p><strong>Keterangan:</strong> ${item.notes || '-'}</p>
        <h4>Daftar Barang Diretur:</h4>
        <table>
          <thead><tr><th>No</th><th>Part Number</th><th>Deskripsi</th><th>Kuantitas</th><th>Alasan Retur</th></tr></thead>
          <tbody>
            ${item.items.map((i, idx) => `<tr><td>${idx + 1}</td><td>${i.part_number}</td><td>${i.description}</td><td>${i.qty}</td><td>${i.reason}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Buat Retur Pembelian Baru</h2>
                <p className="text-xs text-slate-500">Pengembalian barang ke supplier akibat kerusakan atau ketidaksesuaian</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold">
              {formData.return_number}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">No. Retur</label>
                <input type="text" value={formData.return_number} disabled className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal Retur</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Supplier</label>
                <input required type="text" placeholder="Contoh: PT. Sumber Baja Perkasa" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Referensi Dokumen (No. PO / No. RI)</label>
                <input type="text" placeholder="Contoh: PO-2026-001" value={formData.ref_document} onChange={(e) => setFormData({ ...formData, ref_document: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Keterangan / Catatan</label>
                <textarea rows="2" placeholder="Tuliskan catatan tambahan..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"></textarea>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-rose-500" /> Daftar Barang yang Diretur
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold px-3 py-1.5 rounded-lg transition">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Retur
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Part Number</th>
                      <th className="px-4 py-3">Deskripsi Barang</th>
                      <th className="px-4 py-3 w-24">QTY</th>
                      <th className="px-4 py-3 w-48">Alasan Retur</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Part No..." value={item.part_number} onChange={(e) => handleItemChange(item.id, 'part_number', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Deskripsi..." value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <select value={item.reason} onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                            <option value="Rusak / Cacat">Rusak / Cacat</option>
                            <option value="Salah Spesifikasi">Salah Spesifikasi</option>
                            <option value="Kelebihan Kirim">Kelebihan Kirim</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveItemRow(item.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition" title="Hapus Baris">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-rose-500/25 transition">
                <Save className="h-4 w-4" /> Simpan Retur
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
                placeholder="Cari No. Retur atau Supplier..."
                className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-rose-500/25 transition cursor-pointer">
            <Plus className="h-4 w-4" />
            Buat Retur Baru
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">No. Retur</th>
                <th className="px-6 py-3.5">Supplier</th>
                <th className="px-6 py-3.5">Ref Dokumen</th>
                <th className="px-6 py-3.5">Keterangan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada data Retur Pembelian ditemukan.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">{item.return_number}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.supplier_name}</td>
                  <td className="px-6 py-4">{item.ref_document || '-'}</td>
                  <td className="px-6 py-4 text-slate-500">{item.notes || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                      {item.status === 'Selesai' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
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
                      <div className="absolute right-12 top-10 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                        <button
                          onClick={() => handlePrint(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Printer className="h-4 w-4 text-emerald-500" /> Cetak Dokumen
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus Retur
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