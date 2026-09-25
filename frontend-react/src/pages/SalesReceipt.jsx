import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, CheckCircle2, Circle, ArrowLeft, Save, Edit3, Trash2, Printer } from 'lucide-react';

export default function SalesReceipt() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);

  // State untuk melacak apakah kita sedang dalam mode Edit (menyimpan ID data yang diedit)
  const [editingId, setEditingId] = useState(null);

  const [dummyReceipts, setDummyReceipts] = useState([
    { id: 1, paymentDate: '2026-09-25', formNo: 'RC-202609-001', billToNo: 'CUST-001', name: 'PT. Maju Mundur', chequeNo: 'CQ-889900', chequeDate: '2026-09-25', amount: 15000000, reconciled: true, description: 'Pelunasan INV-001' },
    { id: 2, paymentDate: '2026-09-24', formNo: 'RC-202609-002', billToNo: 'CUST-002', name: 'CV. Karya Abadi', chequeNo: '-', chequeDate: '-', amount: 5000000, reconciled: false, description: 'DP Proyek A' },
  ]);

  const [formData, setFormData] = useState({
    formNo: '',
    paymentDate: '',
    billToNo: '',
    name: '',
    chequeNo: '',
    chequeDate: '',
    amount: '',
    reconciled: false,
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Fungsi Buka Form untuk Tambah Baru
  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({ formNo: '', paymentDate: '', billToNo: '', name: '', chequeNo: '', chequeDate: '', amount: '', reconciled: false, description: '' });
    setViewMode('form');
  };

  // Fungsi Buka Form untuk Edit Data
  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({
      formNo: item.formNo,
      paymentDate: item.paymentDate,
      billToNo: item.billToNo,
      name: item.name,
      chequeNo: item.chequeNo,
      chequeDate: item.chequeDate,
      amount: item.amount,
      reconciled: item.reconciled,
      description: item.description
    });
    setViewMode('form');
    setActiveMenuId(null);
  };

  // Fungsi Simpan (Bisa untuk Tambah atau Edit)
  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      // Update data lama
      setDummyReceipts(dummyReceipts.map(item => 
        item.id === editingId ? { ...item, ...formData, amount: Number(formData.amount) } : item
      ));
    } else {
      // Tambah data baru
      const newReceipt = {
        id: Date.now(),
        ...formData,
        amount: Number(formData.amount)
      };
      setDummyReceipts([newReceipt, ...dummyReceipts]);
    }
    setViewMode('list');
  };

  // Fungsi Hapus
  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penerimaan ini?')) {
      setDummyReceipts(dummyReceipts.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  // Fungsi Cetak (Memanggil jendela cetak browser khusus data baris tersebut)
  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Sales Receipt - ${item.formNo}</title>
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
          <h3>BUKTI PENERIMAAN PENJUALAN (SALES RECEIPT)</h3>
          <div class="info">
            <table>
              <tr><td><strong>No. Form</strong></td><td>${item.formNo}</td></tr>
              <tr><td><strong>Tanggal Pembayaran</strong></td><td>${item.paymentDate}</td></tr>
              <tr><td><strong>Nama Pelanggan</strong></td><td>${item.name} (${item.billToNo || '-'})</td></tr>
              <tr><td><strong>No. Cek / Giro</strong></td><td>${item.chequeNo}</td></tr>
              <tr><td><strong>Jumlah Dibayar</strong></td><td>Rp ${Number(item.amount).toLocaleString('id-ID')}</td></tr>
              <tr><td><strong>Keterangan</strong></td><td>${item.description}</td></tr>
            </table>
          </div>
          <p>Dicetak otomatis oleh Sistem ERP pada ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Fungsi Toggle Status Reconciled Langsung dari Tabel
  const toggleReconciled = (id) => {
    setDummyReceipts(dummyReceipts.map(item => 
      item.id === id ? { ...item, reconciled: !item.reconciled } : item
    ));
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
                {editingId ? 'Edit Sales Receipt' : 'Buat Sales Receipt Baru'}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Form No</label>
                <input required type="text" name="formNo" value={formData.formNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Contoh: RC-2026..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Date</label>
                <input required type="date" name="paymentDate" value={formData.paymentDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bill-to No</label>
                <input type="text" name="billToNo" value={formData.billToNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="CUST-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Nama Pelanggan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cheque No</label>
                <input type="text" name="chequeNo" value={formData.chequeNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Nomor Cek" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cheque Date</label>
                <input type="date" name="chequeDate" value={formData.chequeDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (Rp)</label>
                <input required type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Jumlah Pembayaran" />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="reconciled" checked={formData.reconciled} onChange={handleInputChange} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reconciled (Sudah Rekonsiliasi Bank)</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Keterangan..."></textarea>
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
                placeholder="Find Form no / Cheque no..." 
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
            New Sales Receipt
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">Payment Date</th>
                <th className="px-6 py-3 font-medium">Form No</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Cheque No</th>
                <th className="px-6 py-3 font-medium">Cheque Date</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-center">Reconciled</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummyReceipts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition relative">
                  <td className="px-6 py-3">{item.paymentDate}</td>
                  <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{item.formNo}</td>
                  <td className="px-6 py-3">{item.name}</td>
                  <td className="px-6 py-3 text-slate-500">{item.chequeNo || '-'}</td>
                  <td className="px-6 py-3 text-slate-500">{item.chequeDate || '-'}</td>
                  <td className="px-6 py-3 font-medium text-right">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}
                  </td>
                  {/* Kolom Reconciled bisa diklik langsung untuk mengubah statusnya */}
                  <td className="px-6 py-3 text-center cursor-pointer" onClick={() => toggleReconciled(item.id)} title="Klik untuk ubah status Reconciled">
                    {item.reconciled ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto hover:scale-110 transition" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto hover:scale-110 transition" />
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500 truncate max-w-[150px]">{item.description}</td>
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