import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer } from 'lucide-react';
import axios from 'axios';

export default function ReceiveItem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    poRef: '',
    status: 'Diterima Penuh',
    notes: ''
  });

  // Ambil data dari API Laravel saat halaman dibuka
  useEffect(() => {
    fetchReceiveItems();
  }, []);

  const fetchReceiveItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/receive-items');
      setReceiveItems(response.data);
    } catch (error) {
      console.error('Gagal memuat data dari database:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().split('T')[0],
      vendorName: '',
      poRef: '',
      status: 'Diterima Penuh',
      notes: ''
    });
    setViewMode('form');
  };

  // Simpan data ke Database via API Laravel
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        alert('Fitur update akan segera disesuaikan.');
      } else {
        await axios.post('http://127.0.0.1:8000/api/receive-items', formData);
        alert('Data Penerimaan Barang berhasil disimpan ke database!');
      }
      fetchReceiveItems();
      setViewMode('list');
    } catch (error) {
      // Ubah bagian alert ini untuk melihat pesan asli dari Laravel:
      console.error('Detail Error:', error.response?.data);
      alert('Gagal menyimpan: ' + (error.response?.data?.message || JSON.stringify(error.response?.data?.errors) || error.message));
    }
  };

  // Hapus data dari Database via API Laravel
  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini dari database?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/receive-items/${id}`);
        fetchReceiveItems();
        setActiveMenuId(null);
      } catch (error) {
        console.error('Gagal menghapus data:', error);
      }
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Penerimaan Barang - ${item.receive_no}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} td{padding:8px;border:1px solid #ddd}</style></head>
      <body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>BUKTI PENERIMAAN BARANG (RECEIVE ITEM)</h3>
      <table>
        <tr><td><strong>No. Penerimaan</strong></td><td>${item.receive_no}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>${item.date}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>${item.vendor_name}</td></tr>
        <tr><td><strong>Ref. PO</strong></td><td>${item.po_ref || '-'}</td></tr>
        <tr><td><strong>Status</strong></td><td>${item.status}</td></tr>
        <tr><td><strong>Catatan</strong></td><td>${item.notes || '-'}</td></tr>
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
            <h2 className="text-xl font-semibold dark:text-white">Form Terima Barang Baru (Terhubung ke Database)</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">No. Penerimaan (RI)</label><input required type="text" name="receiveNo" value={formData.receiveNo} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Tanggal</label><input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Vendor</label><input required type="text" name="vendorName" value={formData.vendorName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nama Pemasok..." /></div>
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Ref. PO</label><input type="text" name="poRef" value={formData.poRef} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nomor PO..." /></div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Diterima Penuh">Diterima Penuh</option><option value="Diterima Sebagian">Diterima Sebagian</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Catatan</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Catatan penerimaan..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"><Save className="h-4 w-4" /> Simpan ke Database</button>
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
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari No. RI / Vendor..." className="pl-9 pr-4 py-2 w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Terima Barang</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Memuat data dari database...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">No. Penerimaan</th><th className="px-6 py-3">Vendor</th><th className="px-6 py-3">Ref. PO</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-300">
                {receiveItems.filter(item => item.receive_no.toLowerCase().includes(searchTerm.toLowerCase()) || item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400">Belum ada data penerimaan barang di database.</td></tr>
                ) : (
                  receiveItems.filter(item => item.receive_no.toLowerCase().includes(searchTerm.toLowerCase()) || item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                      <td className="px-6 py-3">{item.date}</td>
                      <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{item.receive_no}</td>
                      <td className="px-6 py-3">{item.vendor_name}</td>
                      <td className="px-6 py-3 text-slate-500">{item.po_ref || '-'}</td>
                      <td className="px-6 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'Diterima Penuh' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><MoreVertical className="h-4 w-4" /></button>
                        {activeMenuId === item.id && (
                          <div className="absolute right-12 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-left">
                            <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak</button>
                            <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}