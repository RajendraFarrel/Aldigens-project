import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer } from 'lucide-react';

export default function SalesReturn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);

  // State untuk melacak ID data yang sedang diedit
  const [editingId, setEditingId] = useState(null);

  const [dummyReturns, setDummyReturns] = useState([
    { id: 1, returnNo: 'SR-202609-001', date: '2026-09-25', customerName: 'PT. Maju Mundur', invoiceNo: 'INV-202609-001', amount: 5000000, description: 'Barang cacat pabrik' },
    { id: 2, returnNo: 'SR-202609-002', date: '2026-09-22', customerName: 'Toko Sejahtera', invoiceNo: 'INV-202608-045', amount: 1200000, description: 'Salah kirim tipe barang' },
  ]);

  const [formData, setFormData] = useState({
    returnNo: '',
    date: '',
    customerName: '',
    invoiceNo: '',
    amount: '',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Membuka form dalam mode Tambah Baru
  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({ returnNo: '', date: '', customerName: '', invoiceNo: '', amount: '', description: '' });
    setViewMode('form');
  };

  // Membuka form dalam mode Edit (mengisi data lama ke input)
  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({
      returnNo: item.returnNo,
      date: item.date,
      customerName: item.customerName,
      invoiceNo: item.invoiceNo,
      amount: item.amount,
      description: item.description
    });
    setViewMode('form');
    setActiveMenuId(null);
  };

  // Menyimpan data (bisa untuk Create baru atau Update data lama)
  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      // Update data yang ada
      setDummyReturns(dummyReturns.map(item => 
        item.id === editingId ? { ...item, ...formData, amount: Number(formData.amount) } : item
      ));
    } else {
      // Tambah data baru
      const newReturn = {
        id: Date.now(),
        ...formData,
        amount: Number(formData.amount)
      };
      setDummyReturns([newReturn, ...dummyReturns]);
    }
    setViewMode('list');
  };

  // Fungsi Hapus Data
  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data retur ini?')) {
      setDummyReturns(dummyReturns.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  // Fungsi Cetak Lembar Retur Penjualan
  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Sales Return - ${item.returnNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .info table { width: 100%; border-collapse: collapse; }
            .info td { padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>PT. ALDIGENS PUTERA PERSADA</h2>
          <h3>NOTA RETUR PENJUALAN (SALES RETURN)</h3>
          <div class="info">
            <table>
              <tr><td><strong>No. Retur</strong></td><td>${item.returnNo}</td></tr>
              <tr><td><strong>Tanggal</strong></td><td>${item.date}</td></tr>
              <tr><td><strong>Nama Pelanggan</strong></td><td>${item.customerName}</td></tr>
              <tr><td><strong>Referensi Invoice</strong></td><td>${item.invoiceNo || '-'}</td></tr>
              <tr><td><strong>Nilai Retur</strong></td><td>Rp ${Number(item.amount).toLocaleString('id-ID')}</td></tr>
              <tr><td><strong>Keterangan / Alasan</strong></td><td>${item.description}</td></tr>
            </table>
          </div>
          <p>Dicetak otomatis oleh Sistem ERP pada ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // --- TAMPILAN FORM (INPUT / EDIT) ---
  if (viewMode === 'form') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Sales Return' : 'Buat Sales Return Baru'}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Return No</label>
                <input required type="text" name="returnNo" value={formData.returnNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Contoh: SR-2026..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
                <input required type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Nama Pelanggan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice No (Referensi)</label>
                <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Nomor Invoice" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (Rp)</label>
                <input required type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Total Nilai" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Alasan retur..."></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition font-medium shadow-sm">
                <Save className="h-4 w-4" /> Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- TAMPILAN LIST ---
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find SR No..." 
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="h-4 w-4" />
            New Sales Return
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">Return No</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Customer Name</th>
                <th className="px-6 py-3 font-medium">Invoice No</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummyReturns.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition relative">
                  <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{item.returnNo}</td>
                  <td className="px-6 py-3">{item.date}</td>
                  <td className="px-6 py-3">{item.customerName}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{item.invoiceNo}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}
                  </td>
                  <td className="px-6 py-3 text-slate-500 truncate max-w-[200px]">{item.description}</td>
                  <td className="px-6 py-3 text-center relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <MoreVertical className="h-4 w-4 inline" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-left">
                        <button 
                          onClick={() => handleOpenEditForm(item)}
                          className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-blue-500" /> Edit
                        </button>
                        <button 
                          onClick={() => handlePrint(item)}
                          className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
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