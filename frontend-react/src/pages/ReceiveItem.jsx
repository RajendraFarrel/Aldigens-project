import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Trash2, Printer, MoreVertical } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
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
    status: 'Completed',
    notes: ''
  });

  // Ambil data dari API Laravel atau LocalStorage saat halaman dibuka
  useEffect(() => {
    fetchReceiveItems();
  }, []);

  const fetchReceiveItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/receive-items').catch(() => null);
      const apiData = response?.data?.data || response?.data;
      
      if (Array.isArray(apiData) && apiData.length > 0) {
        setReceiveItems(apiData);
      } else {
        // Fallback: Ambil data dari local storage (hasil konversi dari PO)
        const localData = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
        setReceiveItems(localData);
      }
    } catch (error) {
      console.error('API Error, memuat data lokal...', error);
      // Fallback: Jika API error, langsung ambil dari local storage
      const localData = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      setReceiveItems(localData);
    } finally {
      setLoading(false);
    }
  };

  // Menyesuaikan filtering agar mendukung properti dari API maupun dari localStorage (POList)
  const filteredReceiveItems = useMemo(() => {
    return receiveItems.filter(item => {
      const receiveNo = item.receive_no || item.ri_number || '';
      const vendor = item.vendor_name || item.supplier_name || '';
      
      return receiveNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vendor.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [receiveItems, searchTerm]);

  const pagination = usePagination(filteredReceiveItems, 10);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().split('T')[0],
      vendorName: '',
      poRef: '',
      status: 'Completed',
      notes: ''
    });
    setViewMode('form');
  };

  // Simpan data ke Database via API Laravel (dengan fallback ke localStorage)
  const handleSave = async (e) => {
    e.preventDefault();
    
    const newRI = {
      id: Date.now(),
      receive_no: formData.receiveNo,
      ri_number: formData.receiveNo, // Simpan dua versi agar aman
      date: formData.date,
      vendor_name: formData.vendorName,
      supplier_name: formData.vendorName,
      po_ref: formData.poRef,
      po_reference: formData.poRef,
      status: formData.status,
      notes: formData.notes
    };

    try {
      if (editingId) {
        alert('Fitur update akan segera disesuaikan.');
      } else {
        await axios.post('http://127.0.0.1:8000/api/receive-items', newRI);
        alert('Data Penerimaan Barang berhasil disimpan ke database!');
      }
    } catch (error) {
      console.log('Gagal menyimpan ke database, menyimpan ke local storage...');
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      localStorage.setItem('aldigens_receive_items', JSON.stringify([newRI, ...existingRIs]));
      alert('Disimpan ke penyimpanan lokal (Offline Mode).');
    }
    
    fetchReceiveItems();
    setViewMode('list');
  };

  // Hapus data dari Database via API Laravel (dan localStorage)
  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/receive-items/${id}`);
      } catch (error) {
        console.log('Menghapus data dari penyimpanan lokal...');
      }
      
      // Hapus dari localStorage sebagai fallback
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      const updatedRIs = existingRIs.filter(item => item.id !== id && item.receive_no !== id && item.ri_number !== id);
      localStorage.setItem('aldigens_receive_items', JSON.stringify(updatedRIs));
      
      fetchReceiveItems();
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const receiveNo = item.receive_no || item.ri_number || '-';
    const vendor = item.vendor_name || item.supplier_name || '-';
    const poRef = item.po_ref || item.po_reference || '-';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Penerimaan Barang - ${receiveNo}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} td{padding:8px;border:1px solid #ddd}</style></head>
      <body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>BUKTI PENERIMAAN BARANG (RECEIVE ITEM)</h3>
      <table>
        <tr><td><strong>No. Penerimaan</strong></td><td>${receiveNo}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>${item.date}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>${vendor}</td></tr>
        <tr><td><strong>Ref. PO</strong></td><td>${poRef}</td></tr>
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
            <h2 className="text-xl font-semibold dark:text-white">Form Terima Barang Baru</h2>
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
                  <option value="Completed">Selesai Diterima (Completed)</option>
                  <option value="Partial">Diterima Sebagian (Partial)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Catatan</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Catatan penerimaan..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"><Save className="h-4 w-4" /> Simpan Data</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari No. RI / Vendor..." className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button onClick={handleOpenAddForm} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Terima Barang</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Memuat data penerimaan...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">No. Penerimaan</th><th className="px-6 py-3">Vendor</th><th className="px-6 py-3">Ref. PO</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-300">
                {pagination.paginatedItems.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400">Belum ada data penerimaan barang. Silakan proses dari menu PO atau tambah manual.</td></tr>
                ) : (
                  pagination.paginatedItems.map((item, idx) => {
                    // Mencegah error property undefined karena perbedaan field DB dengan localStorage
                    const receiveNo = item.receive_no || item.ri_number;
                    const vendor = item.vendor_name || item.supplier_name;
                    const poRef = item.po_ref || item.po_reference || '-';
                    const keyId = item.id || idx;

                    return (
                      <tr key={keyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                        <td className="px-6 py-3">{item.date}</td>
                        <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{receiveNo}</td>
                        <td className="px-6 py-3">{vendor}</td>
                        <td className="px-6 py-3 text-slate-500">{poRef}</td>
                        <td className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                item.status?.includes('Completed') || item.status === 'Diterima Penuh' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                                {item.status || 'Diterima'}
                            </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => setActiveMenuId(activeMenuId === keyId ? null : keyId)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"><MoreVertical className="h-4 w-4" /></button>
                          {activeMenuId === keyId && (
                            <div className="absolute right-12 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 text-left">
                              <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak</button>
                              <button onClick={() => handleDelete(keyId)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
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