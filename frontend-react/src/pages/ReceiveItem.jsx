import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Trash2, Printer, MoreVertical, Edit2 } from 'lucide-react';
import Select from 'react-select';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api, { getProducts } from '../services/api';

const emptyItem = () => ({ part_number: '', description: '', qty: 1, unit: 'PCS' });

const emptyForm = () => ({
  receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
  date: new Date().toISOString().split('T')[0],
  vendorName: '',
  poRef: '',
  deliveryOrder: '',
  spkSupplier: '',
  status: 'Completed',
  notes: '',
  items: [emptyItem()],
});

export default function ReceiveItem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Daftar item Inventory untuk pemilih Part Number (bukan ketik manual).
  const [inventoryItems, setInventoryItems] = useState([]);

  const [formData, setFormData] = useState(emptyForm());

  /** Muat daftar produk Inventory untuk dropdown Part Number. */
  const fetchInventoryItems = async () => {
    try {
      let rows = [];
      try {
        const res = await getProducts('');
        rows = res.data?.data || res.data || [];
      } catch {
        rows = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
      }
      setInventoryItems(Array.isArray(rows) ? rows : []);
    } catch {
      setInventoryItems([]);
    }
  };

  const fetchReceiveItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/receive-items').catch(() => null);
      const apiData = response?.data?.data || response?.data;

      if (Array.isArray(apiData) && apiData.length > 0) {
        setReceiveItems(apiData);
      } else {
        // Fallback: Ambil data dari local storage
        const localData = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
        setReceiveItems(localData);
      }
    } catch (error) {
      console.error('API Error, memuat data lokal...', error);
      const localData = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      setReceiveItems(localData);
    } finally {
      setLoading(false);
    }
  };

  // Ambil data dari API Laravel atau LocalStorage saat halaman dibuka
  useEffect(() => {
    fetchReceiveItems();
    fetchInventoryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opsi react-select: value = part_number/kode, label = kode — nama.
  const productOptions = useMemo(() => inventoryItems.map((inv) => {
    const code = inv.part_number || inv.product_code || inv.barcode;
    const name = inv.name || inv.description || '';
    return {
      value: code,
      label: `${code} — ${name}`,
      name,
      unit: inv.unit || 'PCS',
    };
  }), [inventoryItems]);

  const filteredReceiveItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return receiveItems.filter((item) => {
      const receiveNo = item.receive_no || item.ri_number || item.document_number || '';
      const vendor = item.vendor_name || item.supplier_name || '';
      return receiveNo.toLowerCase().includes(term) || vendor.toLowerCase().includes(term);
    });
  }, [receiveItems, searchTerm]);

  const pagination = usePagination(filteredReceiveItems, 10);

  const handleInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setViewMode('form');
  };

  // Buka Form untuk Edit Data
  const handleEdit = (item) => {
    setActiveMenuId(null);
    setEditingId(item.id);
    setFormData({
      receiveNo: item.receive_no || item.ri_number || item.document_number || '',
      date: item.date || item.receive_date || '',
      vendorName: item.vendor_name || item.supplier_name || '',
      poRef: item.po_ref || item.po_reference || '',
      deliveryOrder: item.delivery_order || '',
      spkSupplier: item.spk_supplier || '',
      status: item.status || 'Completed',
      notes: item.notes || '',
      items: (item.items || []).length > 0
        ? item.items.map((it) => ({
          part_number: it.part_number || it.product?.part_number || '',
          description: it.product?.name || it.description || '',
          qty: it.quantity || it.qty || 1,
          unit: it.unit || 'PCS',
        }))
        : [emptyItem()],
    });
    setViewMode('form');
  };

  // Simpan data ke Database via API Laravel (dengan fallback ke localStorage)
  const handleSave = async (e) => {
    e.preventDefault();

    // Hanya baris item yang valid (punya part number) yang dikirim ke backend,
    // agar backend menambah stok Inventory untuk item tersebut.
    const validItems = formData.items
      .filter((it) => it.part_number)
      .map((it) => ({
        part_number: it.part_number,
        description: it.description,
        qty: Number(it.qty) || 1,
        unit: it.unit || 'PCS',
      }));

    if (validItems.length === 0) {
      alert('Pilih minimal 1 barang dari daftar inventory sebelum menyimpan.');
      return;
    }

    const payload = {
      document_number: formData.receiveNo,
      receive_no: formData.receiveNo,
      receive_date: formData.date,
      date: formData.date,
      vendor_name: formData.vendorName,
      supplier_name: formData.vendorName,
      po_ref: formData.poRef,
      delivery_order: formData.deliveryOrder,
      spk_supplier: formData.spkSupplier,
      status: formData.status,
      notes: formData.notes,
      items: validItems,
    };

    const localRecord = {
      id: editingId || Date.now(),
      receive_no: formData.receiveNo,
      ri_number: formData.receiveNo,
      document_number: formData.receiveNo,
      date: formData.date,
      receive_date: formData.date,
      vendor_name: formData.vendorName,
      supplier_name: formData.vendorName,
      po_ref: formData.poRef,
      delivery_order: formData.deliveryOrder,
      spk_supplier: formData.spkSupplier,
      status: formData.status,
      notes: formData.notes,
      items: validItems,
    };

    try {
      if (editingId) {
        await api.put(`/receive-items/${editingId}`, payload);
        alert('Data Penerimaan Barang berhasil diperbarui!');
      } else {
        await api.post('/receive-items', payload);
        alert('Data Penerimaan Barang berhasil disimpan dan stok Inventory bertambah!');
      }
      await fetchReceiveItems();
    } catch (error) {
      console.error('Gagal menyimpan penerimaan barang:', error);
      // Fallback: simpan ke localStorage agar UI tetap berfungsi (Offline Mode).
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      const updated = editingId
        ? existingRIs.map((i) => (i.id === editingId ? localRecord : i))
        : [localRecord, ...existingRIs];
      localStorage.setItem('aldigens_receive_items', JSON.stringify(updated));
      setReceiveItems(updated);
      alert(
        error?.response?.data?.message
        || 'Gagal menyimpan ke server. Data disimpan ke penyimpanan lokal (Offline Mode). Pastikan backend Laravel menyala.'
      );
    }

    setViewMode('list');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini?')) {
      return;
    }

    try {
      await api.delete(`/receive-items/${id}`);
    } catch (error) {
      console.log('Gagal menghapus dari server, menghapus dari penyimpanan lokal...', error);
    }

    const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
    const updatedRIs = existingRIs.filter(
      (item) => item.id !== id && item.receive_no !== id && item.ri_number !== id
    );
    localStorage.setItem('aldigens_receive_items', JSON.stringify(updatedRIs));

    await fetchReceiveItems();
    setActiveMenuId(null);
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const receiveNo = item.receive_no || item.ri_number || item.document_number || '-';
    const vendor = item.vendor_name || item.supplier_name || '-';
    const poRef = item.po_ref || item.po_reference || '-';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Penerimaan Barang - ${receiveNo}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} td{padding:8px;border:1px solid #ddd}</style></head>
      <body><h2>PT. ALDIGENS PUTERA PERSADA</h2><h3>BUKTI PENERIMAAN BARANG (RECEIVE ITEM)</h3>
      <table>
        <tr><td><strong>No. Penerimaan</strong></td><td>${receiveNo}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>${item.date || item.receive_date || '-'}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>${vendor}</td></tr>
        <tr><td><strong>Ref. PO</strong></td><td>${poRef}</td></tr>
        <tr><td><strong>Delivery Order (DO)</strong></td><td>${item.delivery_order || '-'}</td></tr>
        <tr><td><strong>No. SPK</strong></td><td>${item.spk_supplier || '-'}</td></tr>
        <tr><td><strong>Status</strong></td><td>${item.status || '-'}</td></tr>
        <tr><td><strong>Catatan</strong></td><td>${item.notes || '-'}</td></tr>
      </table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
            <h2 className="text-xl font-semibold dark:text-white">
              {editingId ? 'Edit Terima Barang' : 'Form Terima Barang Baru'}
            </h2>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">No. Penerimaan (RI)</label><input required type="text" name="receiveNo" value={formData.receiveNo} onChange={handleInputChange} disabled={!!editingId} className={`w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${editingId ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-950'}`} /></div>

              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Tanggal</label><input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>

              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Vendor</label><input required type="text" name="vendorName" value={formData.vendorName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nama Pemasok..." /></div>

              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Ref. PO</label><input type="text" name="poRef" value={formData.poRef} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nomor PO..." /></div>

              {/* INPUT BARU UNTUK DO DAN SPK */}
              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Delivery Order (DO) Supplier</label><input type="text" name="deliveryOrder" value={formData.deliveryOrder} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nomor DO / Surat Jalan..." /></div>

              <div><label className="block text-sm font-medium dark:text-slate-300 mb-1">Ref. SPK Supplier</label><input type="text" name="spkSupplier" value={formData.spkSupplier} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nomor SPK dari Pemasok..." /></div>

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
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer">
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
                      <th className="px-4 py-3 w-28">Satuan</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Select
                            options={productOptions}
                            value={productOptions.find((o) => o.value === item.part_number) || null}
                            onChange={(opt) => {
                              handleItemChange(index, 'part_number', opt ? opt.value : '');
                              if (opt) {
                                handleItemChange(index, 'description', opt.name);
                                handleItemChange(index, 'unit', opt.unit);
                              }
                            }}
                            placeholder="Cari & pilih Part Number dari Inventory..."
                            isSearchable
                            isClearable
                            className="text-sm text-slate-800"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                            styles={{
                              menu: (base) => ({ ...base, zIndex: 9999 }),
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer" title="Hapus Baris">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Stok Inventory akan bertambah otomatis saat data penerimaan disimpan.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium cursor-pointer"><Save className="h-4 w-4" /> Simpan Data</button>
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
          <button onClick={handleOpenAddForm} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"><Plus className="h-4 w-4" /> Terima Barang</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Memuat data penerimaan...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                {/* PENAMBAHAN HEADER KOLOM DO DAN SPK DI SINI */}
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">No. Penerimaan</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Ref. PO</th>
                  <th className="px-6 py-3">Delivery Order</th>
                  <th className="px-6 py-3">No. SPK</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 dark:text-slate-300">
                {pagination.paginatedItems.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-8 text-slate-400">Belum ada data penerimaan barang. Silakan proses dari menu PO atau tambah manual.</td></tr>
                ) : (
                  pagination.paginatedItems.map((item, idx) => {
                    const receiveNo = item.receive_no || item.ri_number || item.document_number;
                    const vendor = item.vendor_name || item.supplier_name;
                    const poRef = item.po_ref || item.po_reference || '-';
                    const deliveryOrder = item.delivery_order || '-';
                    const spkSupplier = item.spk_supplier || '-';
                    const keyId = item.id || idx;

                    return (
                      <tr key={keyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                        <td className="px-6 py-3">{item.date || item.receive_date}</td>
                        <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{receiveNo}</td>
                        <td className="px-6 py-3">{vendor}</td>
                        <td className="px-6 py-3 text-slate-500">{poRef}</td>

                        {/* PENAMBAHAN DATA BARIS KOLOM DO DAN SPK DI SINI */}
                        <td className="px-6 py-3 text-slate-500">{deliveryOrder}</td>
                        <td className="px-6 py-3 text-slate-500">{spkSupplier}</td>

                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status?.includes('Completed') || item.status === 'Diterima Penuh'
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
                              <button onClick={() => handleEdit(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit</button>

                              <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak</button>
                              <button onClick={() => handleDelete(keyId)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
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
