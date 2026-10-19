import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Trash2, Printer, MoreVertical, Edit2 } from 'lucide-react';
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

  // Form State, sekarang dengan tambahan item barang untuk masuk inventory
  const [formData, setFormData] = useState({
    receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    poRef: '',
    deliveryOrder: '',
    spkSupplier: '',
    status: 'Completed',
    notes: '',
    items: [
      { description: '', qty: 1, unit: 'PCS' } // Contoh struktur item barang
    ]
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

  const filteredReceiveItems = useMemo(() => {
    return receiveItems.filter(item => {
      const receiveNo = item.receive_no || item.ri_number || item.document_number || '';
      const vendor = item.vendor_name || item.supplier_name || '';
      
      return receiveNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vendor.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [receiveItems, searchTerm]);

  const pagination = usePagination(filteredReceiveItems, 10);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handler untuk mengubah item barang di form
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData({ ...formData, items: updatedItems });
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', qty: 1, unit: 'PCS' }]
    });
  };

  const handleRemoveItemRow = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().split('T')[0],
      vendorName: '',
      poRef: '',
      deliveryOrder: '',
      spkSupplier: '',
      status: 'Completed',
      notes: '',
      items: [{ description: '', qty: 1, unit: 'PCS' }]
    });
    setViewMode('form');
  };

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
      items: item.items || [{ description: '', qty: 1, unit: 'PCS' }]
    });
    setViewMode('form');
  };

  // --- FUNGSI UTAMA: MENAMBAHKAN STOK KE INVENTORY OTOMATIS ---
  const updateInventoryStock = (receivedItems) => {
    // Ambil data inventory yang ada di localStorage (sesuaikan key inventory-mu, misal 'aldigens_inventory' atau 'inventory')
    const inventoryKey = 'aldigens_inventory';
    let currentInventory = JSON.parse(localStorage.getItem(inventoryKey) || '[]');

    receivedItems.forEach(incomingItem => {
      const itemName = incomingItem.description || incomingItem.part_number || '';
      const qtyToAdd = Number(incomingItem.qty || incomingItem.qty_received || 0);

      if (!itemName || qtyToAdd <= 0) return;

      // Cari apakah barang sudah ada di inventory
      const existingProductIndex = currentInventory.findIndex(prod => 
        String(prod.name || prod.description || prod.part_number).toLowerCase() === String(itemName).toLowerCase()
      );

      if (existingProductIndex !== -1) {
        // Jika sudah ada, tambahkan stoknya
        currentInventory[existingProductIndex].qty = Number(currentInventory[existingProductIndex].qty || currentInventory[existingProductIndex].stock || 0) + qtyToAdd;
      } else {
        // Jika belum ada barangnya di inventory, buat data baru otomatis
        currentInventory.push({
          id: Date.now() + Math.random(),
          part_number: incomingItem.part_number || itemName,
          name: itemName,
          description: itemName,
          qty: qtyToAdd,
          unit: incomingItem.unit || 'PCS'
        });
      }
    });

    // Simpan kembali ke localStorage inventory
    localStorage.setItem(inventoryKey, JSON.stringify(currentInventory));
  };

  // Simpan data ke Database & LocalStorage serta Update Inventory
  const handleSave = async (e) => {
    e.preventDefault();
    
    const newRI = {
      id: editingId || Date.now(),
      receive_no: formData.receiveNo,
      ri_number: formData.receiveNo,
      date: formData.date,
      vendor_name: formData.vendorName,
      supplier_name: formData.vendorName,
      po_ref: formData.poRef,
      delivery_order: formData.deliveryOrder,
      spk_supplier: formData.spkSupplier,
      status: formData.status,
      notes: formData.notes,
      items: formData.items
    };

    try {
      if (editingId) {
        await axios.put(`http://127.0.0.1:8000/api/receive-items/${editingId}`, formData);
        alert('Data Penerimaan Barang berhasil diperbarui!');
      } else {
        await axios.post('http://127.0.0.1:8000/api/receive-items', formData);
        alert('Data Penerimaan Barang berhasil disimpan!');
      }
    } catch (error) {
      console.log('API Error, menyimpan ke local storage...');
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      if (editingId) {
        const updated = existingRIs.map(i => i.id === editingId ? newRI : i);
        localStorage.setItem('aldigens_receive_items', JSON.stringify(updated));
      } else {
        localStorage.setItem('aldigens_receive_items', JSON.stringify([newRI, ...existingRIs]));
      }
    }

    // OTOMATIS TAMBAHKAN STOK KE INVENTORY KETIKA PENERIMAAN BARANG SELESAI/DISIMPAN
    if (formData.status === 'Completed' || formData.status === 'Selesai Diterima') {
      updateInventoryStock(formData.items);
    }
    
    fetchReceiveItems();
    setViewMode('list');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/receive-items/${id}`);
      } catch (error) {
        console.log('Menghapus data dari penyimpanan lokal...');
      }
      
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      const updatedRIs = existingRIs.filter(item => item.id !== id && item.receive_no !== id && item.ri_number !== id);
      localStorage.setItem('aldigens_receive_items', JSON.stringify(updatedRIs));
      
      fetchReceiveItems();
      setActiveMenuId(null);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const receiveNo = item.receive_no || item.ri_number || item.document_number || '-';
    const vendor = item.vendor_name || item.supplier_name || '-';
    const poRef = item.po_ref || item.po_reference || '-';

    const itemsRows = (item.items || []).map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${it.description || '-'}</td>
        <td>${it.qty || 0} ${it.unit || 'PCS'}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Penerimaan Barang - ${receiveNo}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>PT. ALDIGENS PUTERA PERSADA</h2>
          <h3>BUKTI PENERIMAAN BARANG (RECEIVE ITEM)</h3>
          <table>
            <tr><td><strong>No. Penerimaan</strong></td><td>${receiveNo}</td></tr>
            <tr><td><strong>Tanggal</strong></td><td>${item.date || item.receive_date}</td></tr>
            <tr><td><strong>Vendor</strong></td><td>${vendor}</td></tr>
            <tr><td><strong>Ref. PO</strong></td><td>${poRef}</td></tr>
            <tr><td><strong>Delivery Order (DO)</strong></td><td>${item.delivery_order || '-'}</td></tr>
            <tr><td><strong>No. SPK</strong></td><td>${item.spk_supplier || '-'}</td></tr>
            <tr><td><strong>Status</strong></td><td>${item.status}</td></tr>
            <tr><td><strong>Catatan</strong></td><td>${item.notes || '-'}</td></tr>
          </table>
          <h4>Daftar Barang Diterima:</h4>
          <table>
            <thead>
              <tr><th>No</th><th>Deskripsi Barang</th><th>Jumlah</th></tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="3" style="text-align:center;">Tidak ada rincian barang</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close(); printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
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
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Catatan penerimaan..."></textarea>
              </div>
            </div>

            {/* TABEL INPUT RINCIAN BARANG MASUK */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Rincian Barang yang Diterima</h3>
                <button type="button" onClick={handleAddItemRow} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer">
                  + Tambah Baris Barang
                </button>
              </div>

              {formData.items.map((it, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      required 
                      placeholder="Nama / Deskripsi Barang..." 
                      value={it.description} 
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm dark:text-white outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      placeholder="Qty" 
                      value={it.qty} 
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-center dark:text-white outline-none"
                    />
                  </div>
                  <div className="w-28">
                    <input 
                      type="text" 
                      placeholder="Satuan" 
                      value={it.unit} 
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-center dark:text-white outline-none"
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItemRow(idx)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium cursor-pointer"><Save className="h-4 w-4" /> Simpan & Update Stok</button>
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
                        <td className="px-6 py-3 text-slate-500">{deliveryOrder}</td>
                        <td className="px-6 py-3 text-slate-500">{spkSupplier}</td>
                        <td className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                item.status?.includes('Completed') || item.status === 'Selesai Diterima' 
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
                    )
                  })
                )}
              </tbody>
            </table>
          )}
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