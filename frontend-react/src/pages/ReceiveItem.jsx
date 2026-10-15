import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Trash2, Printer, MoreVertical } from 'lucide-react';
import Select from 'react-select';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { getProducts } from '../services/api';
import api from '../services/api';

export default function ReceiveItem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    poRef: '',
    status: 'Completed',
    notes: '',
    items: [{ id: Date.now(), productId: null, quantity: 1 }],
  });

  // Opsi pencarian barang dari inventory (Part Number / Nama Barang).
  const productOptions = useMemo(() => products.map((p) => ({
    value: p.id,
    label: [p.part_number, p.name].filter(Boolean).join(' - ') || p.name || `#${p.id}`,
    raw: p,
  })), [products]);

  // Ambil data dari API Laravel atau LocalStorage saat halaman dibuka
  useEffect(() => {
    const fetchReceiveItems = async () => {
      try {
        setLoading(true);
        const response = await api.get('/receive-items').catch(() => null);
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

    const fetchProducts = async () => {
      try {
        const res = await getProducts();
        setProducts(res.data?.data ?? []);
      } catch (error) {
        console.error('Gagal memuat daftar barang inventory:', error);
      }
    };

    fetchReceiveItems();
    fetchProducts();
  }, []);

  const fetchReceiveItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/receive-items').catch(() => null);
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
      notes: '',
      items: [{ id: Date.now(), productId: null, quantity: 1 }],
    });
    setViewMode('form');
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), productId: null, quantity: 1 }],
    });
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) {
      alert('Penerimaan minimal harus memiliki 1 item barang!');
      return;
    }
    setFormData({ ...formData, items: formData.items.filter((i) => i.id !== id) });
  };

  const handleItemChange = (id, field, value) => {
    setFormData({
      ...formData,
      items: formData.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    });
  };

  const handleProductSelect = (id, option) => {
    setFormData({
      ...formData,
      items: formData.items.map((i) => (i.id === id ? {
        ...i,
        productId: option ? option.value : null,
        partNumber: option ? option.label : '',
      } : i)),
    });
  };

  // Simpan data ke Database via API Laravel (dengan fallback ke localStorage)
  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.items.some((i) => !i.productId)) {
      alert('Setiap item harus dipilih dari daftar inventory. Ketik Part Number atau Nama Barang pada kolom pencarian.');
      return;
    }

    const newRI = {
      receiveNo: formData.receiveNo,
      date: formData.date,
      vendorName: formData.vendorName,
      poRef: formData.poRef,
      status: formData.status,
      notes: formData.notes,
      items: formData.items.map((i) => ({
        product_id: i.productId,
        quantity: Number(i.quantity),
      })),
    };

    try {
      if (editingId) {
        alert('Fitur update akan segera disesuaikan.');
      } else {
        await api.post('/receive-items', newRI);
        alert('Data Penerimaan Barang berhasil disimpan dan stok inventory otomatis bertambah!');
      }
    } catch (error) {
      console.error('Gagal menyimpan penerimaan barang:', error);
      alert(error?.response?.data?.message || 'Gagal menyimpan data penerimaan barang.');
      return;
    }

    fetchReceiveItems();
    setViewMode('list');
  };

  // Hapus data dari Database via API Laravel (dan localStorage)
  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini?')) {
      try {
        await api.delete(`/receive-items/${id}`);
      } catch (error) {
        console.log('Gagal menghapus data penerimaan.', error);
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

            {/* Daftar barang yang diterima — stok akan otomatis bertambah */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Barang Diterima
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Item
                </button>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Part Number / Nama Barang</th>
                      <th className="px-4 py-3 w-36">Jumlah Diterima</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Select
                            inputId={`ri-item-product-${item.id}`}
                            placeholder="Ketik Part Number / Nama Barang..."
                            isClearable
                            isSearchable
                            options={productOptions}
                            value={productOptions.find(o => o.value === item.productId) || null}
                            onChange={(option) => handleProductSelect(item.id, option)}
                            noOptionsMessage={() => 'Barang tidak ditemukan di inventory'}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveItemRow(item.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition cursor-pointer" title="Hapus Baris">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Jumlah barang yang diterima akan otomatis menambah stok pada menu Inventory.
              </p>
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