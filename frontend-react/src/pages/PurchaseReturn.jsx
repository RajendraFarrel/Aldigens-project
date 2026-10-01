import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function PurchaseReturn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [dummyReturns, setDummyReturns] = useState([
    { id: 1, returnNo: 'PR-202609-001', date: '2026-09-28', vendorName: 'PT. Plastikindo', invoiceRef: 'PI-202609-001', amount: 500000, description: 'Barang reject pabrik, kemasan rusak' },
  ]);

  const filteredReturns = useMemo(() => {
    return dummyReturns.filter(item =>
      item.returnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dummyReturns, searchTerm]);

  const pagination = usePagination(filteredReturns, 10);

  const [formData, setFormData] = useState({
    returnNo: '', date: '', vendorName: '', invoiceRef: '', amount: '', description: ''
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({ returnNo: '', date: '', vendorName: '', invoiceRef: '', amount: '', description: '' });
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
    if (editingId) {
      setDummyReturns(dummyReturns.map(item => item.id === editingId ? { ...item, ...formData, amount: Number(formData.amount) } : item));
    } else {
      setDummyReturns([{ id: Date.now(), ...formData, amount: Number(formData.amount) }, ...dummyReturns]);
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus Retur Pembelian ini?')) {
      setDummyReturns(dummyReturns.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Retur Pembelian - ${item.returnNo}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} td{padding:8px;border:1px solid #ddd}</style></head>
      <body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>NOTA RETUR PEMBELIAN (PURCHASE RETURN)</h3>
      <table>
        <tr><td><strong>No. Retur</strong></td><td>${item.returnNo}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>${item.date}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>${item.vendorName}</td></tr>
        <tr><td><strong>Ref. Faktur (PI)</strong></td><td>${item.invoiceRef || '-'}</td></tr>
        <tr><td><strong>Total Retur</strong></td><td>Rp ${Number(item.amount).toLocaleString('id-ID')}</td></tr>
        <tr><td><strong>Keterangan</strong></td><td>${item.description}</td></tr>
      </table>
      <p style="margin-top:20px; font-size: 12px; color: #666;">Dicetak otomatis oleh Sistem pada ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
            <h2 className="text-xl font-semibold dark:text-white">{editingId ? 'Edit Retur Pembelian' : 'Buat Retur Pembelian Baru'}</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">No. Retur (PR)</label><input required type="text" name="returnNo" value={formData.returnNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="PR-2026..." /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Tanggal</label><input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Pemasok (Vendor)</label><input required type="text" name="vendorName" value={formData.vendorName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nama Vendor..." /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Ref. Faktur (PI)</label><input type="text" name="invoiceRef" value={formData.invoiceRef} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nomor PI yang diretur" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Total Nilai (Rp)</label><input required type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Keterangan / Alasan Retur</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"><Save className="h-4 w-4" /> Simpan</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between gap-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari Retur Pembelian..." className="pl-9 pr-4 py-2 w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Retur Pembelian</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">No. Retur</th><th className="px-6 py-3">Vendor</th><th className="px-6 py-3">Ref. PI</th><th className="px-6 py-3 text-right">Nilai Retur</th><th className="px-6 py-3 text-center">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada Retur Pembelian ditemukan.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                  <td className="px-6 py-3">{item.date}</td><td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{item.returnNo}</td><td className="px-6 py-3">{item.vendorName}</td><td className="px-6 py-3 text-slate-500">{item.invoiceRef || '-'}</td><td className="px-6 py-3 text-right font-medium">Rp {item.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"><MoreVertical className="h-4 w-4" /></button>
                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-left">
                        <button onClick={() => handleOpenEditForm(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Edit3 className="h-3.5 w-3.5 text-blue-500" /> Edit</button>
                        <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak</button>
                        <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
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