import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer } from 'lucide-react';

export default function PurchaseInvoice() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [dummyPIs, setDummyPIs] = useState([
    { id: 1, date: '2026-09-27', invoiceNo: 'PI-202609-001', vendorName: 'PT. Plastikindo', receiveRef: 'RI-202609-001', amount: 25000000, status: 'Belum Lunas' },
  ]);

  const [formData, setFormData] = useState({
    invoiceNo: '', date: '', vendorName: '', receiveRef: '', amount: '', status: 'Belum Lunas'
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({ invoiceNo: '', date: '', vendorName: '', receiveRef: '', amount: '', status: 'Belum Lunas' });
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
      setDummyPIs(dummyPIs.map(item => item.id === editingId ? { ...item, ...formData, amount: Number(formData.amount) } : item));
    } else {
      setDummyPIs([{ id: Date.now(), ...formData, amount: Number(formData.amount) }, ...dummyPIs]);
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus Faktur Pembelian ini?')) {
      setDummyPIs(dummyPIs.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Faktur Pembelian - ${item.invoiceNo}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} td{padding:8px;border:1px solid #ddd}</style></head>
      <body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>FAKTUR PEMBELIAN (PURCHASE INVOICE)</h3>
      <table>
        <tr><td><strong>No. Faktur</strong></td><td>${item.invoiceNo}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>${item.date}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>${item.vendorName}</td></tr>
        <tr><td><strong>Ref. Penerimaan</strong></td><td>${item.receiveRef || '-'}</td></tr>
        <tr><td><strong>Total Tagihan</strong></td><td>Rp ${Number(item.amount).toLocaleString('id-ID')}</td></tr>
      </table></body></html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
            <h2 className="text-xl font-semibold dark:text-white">{editingId ? 'Edit Faktur Pembelian' : 'Buat Faktur Baru'}</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">No. Faktur (PI)</label><input required type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Tanggal</label><input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Vendor</label><input required type="text" name="vendorName" value={formData.vendorName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Ref. Penerimaan (RI)</label><input type="text" name="receiveRef" value={formData.receiveRef} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Total Tagihan (Rp)</label><input required type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Status Pembayaran</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Belum Lunas">Belum Lunas</option><option value="Lunas">Lunas</option>
                </select>
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
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari Faktur / Vendor..." className="pl-9 pr-4 py-2 w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Buat Faktur</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">No. Faktur</th><th className="px-6 py-3">Vendor</th><th className="px-6 py-3 text-right">Tagihan</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-300">
              {dummyPIs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                  <td className="px-6 py-3">{item.date}</td><td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{item.invoiceNo}</td><td className="px-6 py-3">{item.vendorName}</td><td className="px-6 py-3 text-right font-medium">Rp {item.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status}</span></td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><MoreVertical className="h-4 w-4" /></button>
                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-left">
                        <button onClick={() => handleOpenEditForm(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit3 className="h-3.5 w-3.5 text-blue-500" /> Edit</button>
                        <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak</button>
                        <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}