import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer, FileText, CheckCircle2, Clock, ShoppingCart } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function PurchaseRequisition() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Data Dummy Permintaan Pembelian (PR)
  const [dummyPRs, setDummyPRs] = useState([
    {
      id: 1,
      prNo: 'PR-20260928-7683',
      date: '2026-09-28',
      department: 'Produksi',
      requester: 'Farel',
      remarks: 'Kebutuhan material perakitan bulanan',
      status: 'Menunggu',
      items: [
        { id: 101, partNumber: 'PART-001 - Pipa Besi 2 Inch', quantity: 20, unit: 'Batang' },
        { id: 102, partNumber: 'PART-005 - Baut Baja M10', quantity: 100, unit: 'Pcs' }
      ]
    },
    {
      id: 2,
      prNo: 'PR-20260927-1102',
      date: '2026-09-27',
      department: 'Maintenance',
      requester: 'Budi',
      remarks: 'Penggantian sparepart mesin harian',
      status: 'Disetujui',
      items: [
        { id: 201, partNumber: 'PART-012 - Bearing 6204', quantity: 4, unit: 'Pcs' }
      ]
    }
  ]);

  const filteredPRs = useMemo(() => {
    return dummyPRs.filter(item =>
      item.prNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dummyPRs, searchTerm]);

  const pagination = usePagination(filteredPRs, 10);

  // State Form Input
  const [formData, setFormData] = useState({
    prNo: 'PR-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    department: 'Produksi',
    requester: 'Administrator',
    remarks: '',
    status: 'Menunggu',
    items: [{ id: Date.now(), partNumber: '', quantity: 1, unit: 'PCS' }]
  });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      prNo: 'PR-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().split('T')[0],
      department: 'Produksi',
      requester: 'Administrator',
      remarks: '',
      status: 'Menunggu',
      items: [{ id: Date.now(), partNumber: '', quantity: 1, unit: 'PCS' }]
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), partNumber: '', quantity: 1, unit: 'PCS' }]
    });
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) {
      alert('Permintaan minimal harus memiliki 1 item barang!');
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    });
  };

  const handleItemChange = (id, field, value) => {
    setFormData({
      ...formData,
      items: formData.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.department.trim()) {
      alert('Departemen wajib diisi!');
      return;
    }

    if (editingId) {
      setDummyPRs(dummyPRs.map(item => item.id === editingId ? { ...item, ...formData } : item));
    } else {
      setDummyPRs([{ id: Date.now(), ...formData }, ...dummyPRs]);
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Permintaan Pembelian ini?')) {
      setDummyPRs(dummyPRs.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  // --- FUNGSI KONVERSI PR KE PURCHASE ORDER (PO) ---
  const handleConvertToPO = (prItem) => {
    setActiveMenuId(null);
    
    // Format item PR agar cocok dengan struktur Purchase Order
    const poItems = prItem.items.map(i => ({
      description: i.partNumber,
      qty: i.quantity,
      unit_price: 0 // Default harga satuan bisa diisi nanti di form PO
    }));

    const newPO = {
      id: Date.now(),
      po_number: 'PO-' + prItem.prNo.replace('PR-', ''),
      date: new Date().toISOString().split('T')[0],
      supplier_name: 'Supplier Umum (' + prItem.department + ')',
      supplier_address: 'Jakarta',
      subject: prItem.remarks || 'Pengadaan dari ' + prItem.prNo,
      items: poItems,
      status: 'Pending'
    };

    // Simpan ke local storage agar terbaca di halaman POList
    const existingPOs = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
    localStorage.setItem('aldigens_purchase_orders', JSON.stringify([newPO, ...existingPOs]));

    alert(`PR ${prItem.prNo} berhasil diproses menjadi Purchase Order (PO)! Silakan buka menu Purchase Order.`);
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>PR - ${item.prNo}</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head>
      <body>
        <h2>PT. ALDIGENS PUTERA PERSADA</h2>
        <h3>FORM PERMINTAAN PEMBELIAN (PURCHASE REQUISITION)</h3>
        <p><strong>No. PR:</strong> ${item.prNo}</p>
        <p><strong>Tanggal:</strong> ${item.date} | <strong>Departemen:</strong> ${item.department} | <strong>Pemohon:</strong> ${item.requester}</p>
        <p><strong>Keterangan:</strong> ${item.remarks || '-'}</p>
        <h4>Daftar Item Diminta:</h4>
        <table>
          <thead><tr><th>No</th><th>Part Number / Nama Barang</th><th>Kuantitas</th><th>Satuan</th></tr></thead>
          <tbody>
            ${item.items.map((i, idx) => `<tr><td>${idx+1}</td><td>${i.partNumber}</td><td>${i.quantity}</td><td>${i.unit}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  // --- TAMPILAN FORM ---
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
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit Permintaan Pembelian (PR)' : 'Buat Permintaan Pembelian Baru'}
                </h2>
                <p className="text-xs text-slate-500">Formulir pengajuan kebutuhan barang dan material perusahaan</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.prNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">No. PR</label>
                <input type="text" value={formData.prNo} disabled className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal Permintaan</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Departemen</label>
                <input required type="text" placeholder="Contoh: Produksi / Maintenance" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pemohon (Requester)</label>
                <input required type="text" placeholder="Nama pemohon..." value={formData.requester} onChange={(e) => setFormData({...formData, requester: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="Menunggu">Menunggu (Pending)</option>
                  <option value="Disetujui">Disetujui (Approved)</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Keterangan / Catatan</label>
                <textarea rows="2" placeholder="Catatan atau alasan permintaan..." value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"></textarea>
              </div>
            </div>

            {/* Tabel Item Dinamis */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" /> Daftar Item yang Diminta
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Item
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Part Number / Nama Barang</th>
                      <th className="px-4 py-3 w-36">Kuantitas</th>
                      <th className="px-4 py-3 w-32">Satuan</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Pilih Part Number / Nama Barang..." value={item.partNumber} onChange={(e) => handleItemChange(item.id, 'partNumber', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                            <option value="PCS">PCS</option>
                            <option value="Unit">Unit</option>
                            <option value="Batang">Batang</option>
                            <option value="Kg">Kg</option>
                            <option value="Set">Set</option>
                            <option value="Meter">Meter</option>
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
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition">
                <Save className="h-4 w-4" /> Simpan Permintaan (PR)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DAFTAR (LIST) ---
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. PR atau departemen..." 
                className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer">
            <Plus className="h-4 w-4" />
            Simpan PR
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">No. PR</th>
                <th className="px-6 py-3.5">Departemen</th>
                <th className="px-6 py-3.5">Pemohon</th>
                <th className="px-6 py-3.5">Keterangan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada data Permintaan Pembelian (PR) ditemukan.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{item.prNo}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.department}</td>
                  <td className="px-6 py-4">{item.requester}</td>
                  <td className="px-6 py-4 text-slate-500">{item.remarks || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                      {item.status === 'Disetujui' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
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
                        {item.status === 'Disetujui' && (
                          <button 
                            onClick={() => handleConvertToPO(item)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-700"
                          >
                            <ShoppingCart className="h-4 w-4" /> Proses ke PO
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEditForm(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Edit3 className="h-4 w-4 text-blue-500" /> Edit PR
                        </button>
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
                          <Trash2 className="h-4 w-4" /> Hapus PR
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