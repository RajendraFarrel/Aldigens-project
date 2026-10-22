import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, Save, Trash2, Printer, MoreVertical, Edit2, Package } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const emptyItem = () => ({ part_number: '', description: '', qty: 1, unit: 'PCS' });

export default function ReceiveItem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    receiveNo: 'RI-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    poRef: '',
    deliveryOrder: '',
    spkSupplier: '',
    status: 'Completed',
    notes: '',
    items: [emptyItem()]
  });

  useEffect(() => {
    fetchReceiveItems();
  }, []);

  const fetchReceiveItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/receive-items').catch(() => null);
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
    const term = searchTerm.toLowerCase();
    return receiveItems.filter((item) => {
      const receiveNo = item.receive_no || item.ri_number || item.document_number || '';
      // Fallback baca notes jika data dari Laravel API
      let vendor = item.vendor_name || item.supplier_name || '';
      if (!vendor && item.notes && item.notes.includes('Vendor:')) {
        vendor = item.notes.split('Vendor:')[1]?.trim();
      }
      return receiveNo.toLowerCase().includes(term) || vendor.toLowerCase().includes(term);
    });
  }, [receiveItems, searchTerm]);

  const pagination = usePagination(filteredReceiveItems, 10);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, emptyItem()] });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
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
      items: [emptyItem()]
    });
    setViewMode('form');
  };

  const handleEdit = (item) => {
    setActiveMenuId(null);
    setEditingId(item.id);

    // Parsing cerdas untuk membaca data dari Laravel API (jika poRef/vendor tergabung di notes)
    let parsedVendor = item.vendor_name || item.supplier_name || '';
    let parsedPoRef = item.po_ref || item.po_reference || '';
    if (!parsedVendor && item.notes && item.notes.includes('Vendor:')) {
      parsedVendor = item.notes.split('Vendor:')[1]?.trim();
    }
    if (!parsedPoRef && item.notes && item.notes.includes('PO Ref:')) {
      parsedPoRef = item.notes.split('|')[0].replace('PO Ref:', '').trim();
    }

    const rawDate = item.date || item.receive_date || '';
    const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

    setFormData({
      receiveNo: item.receive_no || item.ri_number || item.document_number || '',
      date: cleanDate,
      vendorName: parsedVendor,
      poRef: parsedPoRef,
      deliveryOrder: item.delivery_order || '',
      spkSupplier: item.spk_supplier || '',
      status: item.status || 'Completed',
      notes: item.notes || '',
      items: item.items && item.items.length > 0 ? item.items : [emptyItem()]
    });
    setViewMode('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      document_number: formData.receiveNo,
      receive_no: formData.receiveNo,
      ri_number: formData.receiveNo,
      date: formData.date,
      receive_date: formData.date,
      vendor_name: formData.vendorName,
      supplier_name: formData.vendorName,
      po_ref: formData.poRef,
      po_reference: formData.poRef,
      delivery_order: formData.deliveryOrder,
      spk_supplier: formData.spkSupplier,
      status: formData.status,
      notes: formData.notes,
      items: formData.items
    };
    const newRI = { ...payload, id: editingId || Date.now() };

    try {
      if (editingId) {
        await api.put(`/receive-items/${editingId}`, payload);
        alert('Data Penerimaan Barang berhasil diperbarui!');
      } else {
        await api.post('/receive-items', payload);
        alert('Data Penerimaan Barang berhasil disimpan!');
      }
    } catch (error) {
      console.error('Gagal menyimpan penerimaan barang:', error);
      const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
      if (editingId) {
        const updated = existingRIs.map(i => (i.id === editingId ? newRI : i));
        localStorage.setItem('aldigens_receive_items', JSON.stringify(updated));
      } else {
        localStorage.setItem('aldigens_receive_items', JSON.stringify([newRI, ...existingRIs]));
      }
      alert('Disimpan ke penyimpanan lokal (Offline Mode).');
    }
    
    await fetchReceiveItems();
    setViewMode('list');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data penerimaan barang ini?')) {
      return;
    }

    try {
      await api.delete(`/receive-items/${id}`);
    } catch (error) {
      console.log('Gagal menghapus dari server, menghapus dari lokal...');
    }

    const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
    const updatedRIs = existingRIs.filter((item) => item.id !== id && item.receive_no !== id && item.ri_number !== id);
    localStorage.setItem('aldigens_receive_items', JSON.stringify(updatedRIs));

    await fetchReceiveItems();
    setActiveMenuId(null);
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const receiveNo = item.receive_no || item.ri_number || item.document_number || '-';
    
    let vendor = item.vendor_name || item.supplier_name || '-';
    let poRef = item.po_ref || item.po_reference || '-';
    if (vendor === '-' && item.notes && item.notes.includes('Vendor:')) {
      vendor = item.notes.split('Vendor:')[1]?.trim();
    }
    if (poRef === '-' && item.notes && item.notes.includes('PO Ref:')) {
      poRef = item.notes.split('|')[0].replace('PO Ref:', '').trim();
    }

    const rawDate = item.date || item.receive_date || '';
    const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

    const itemsRows = (item.items || []).map((it, idx) => `
      <tr>
        <td align="center">${idx + 1}</td>
        <td>${it.part_number || '-'}</td>
        <td>${it.description || '-'}</td>
        <td align="center">${it.qty || 0}</td>
        <td align="center">${it.unit || 'PCS'}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Penerimaan Barang - ${receiveNo}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} th,td{padding:8px;border:1px solid #000} th{background-color:#f4f4f4} .no-border td{border:none;padding:4px} .no-border{margin-bottom:20px}</style></head>
      <body>
      <h2 style="margin-bottom:2px;">PT. ALDIGENS PUTERA PERSADA</h2>
      <h3 style="margin-top:0;">BUKTI PENERIMAAN BARANG (RECEIVE ITEM)</h3>
      <table class="no-border">
        <tr><td style="width:150px"><strong>No. Penerimaan</strong></td><td>: ${receiveNo}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>: ${cleanDate}</td></tr>
        <tr><td><strong>Vendor</strong></td><td>: ${vendor}</td></tr>
        <tr><td><strong>Ref. PO</strong></td><td>: ${poRef}</td></tr>
        <tr><td><strong>Delivery Order (DO)</strong></td><td>: ${item.delivery_order || '-'}</td></tr>
        <tr><td><strong>No. SPK</strong></td><td>: ${item.spk_supplier || '-'}</td></tr>
        <tr><td><strong>Catatan</strong></td><td>: ${item.notes || '-'}</td></tr>
      </table>
      ${itemsRows ? `
      <table>
        <thead><tr><th>No</th><th>Part Number</th><th>Deskripsi Barang</th><th>Qty</th><th>Satuan</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>` : '<p><i>Tidak ada detail barang</i></p>'}
      <br/><br/>
      <table style="border:none; text-align:center; margin-top:30px;">
        <tr><td style="border:none; width:50%;">Diterima Oleh,<br/><br/><br/><br/>( Bagian Gudang )</td><td style="border:none; width:50%;">Diserahkan Oleh,<br/><br/><br/><br/>( Pengirim / Vendor )</td></tr>
      </table>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
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

            {/* Bagian Detail Item */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold dark:text-slate-300 flex items-center gap-2"><Package className="h-4 w-4" /> Detail Barang Diterima</h3>
                <button type="button" onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left w-1/4">Part Number</th>
                      <th className="px-3 py-2 text-left w-1/3">Deskripsi Barang</th>
                      <th className="px-3 py-2 text-center w-24">Qty</th>
                      <th className="px-3 py-2 text-left w-32">Satuan</th>
                      <th className="px-3 py-2 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-x border-slate-200 dark:border-slate-700">
                        <td className="px-2 py-2">
                          <input type="text" value={item.part_number} onChange={(e) => handleItemChange(idx, 'part_number', e.target.value)} placeholder="Part No..." className="w-full px-2 py-1.5 bg-transparent border border-slate-300 dark:border-slate-600 rounded text-sm dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} placeholder="Deskripsi..." className="w-full px-2 py-1.5 bg-transparent border border-slate-300 dark:border-slate-600 rounded text-sm dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} className="w-full px-2 py-1.5 bg-transparent border border-slate-300 dark:border-slate-600 rounded text-sm text-center dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} className="w-full px-2 py-1.5 bg-transparent border border-slate-300 dark:border-slate-600 rounded text-sm dark:text-white outline-none focus:ring-1 focus:ring-blue-500 [&>option]:bg-slate-800">
                            <option value="PCS">PCS</option>
                            <option value="KG">KG</option>
                            <option value="SET">SET</option>
                            <option value="METER">METER</option>
                            <option value="LITER">LITER</option>
                            <option value="BOX">BOX</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => handleRemoveItem(idx)} disabled={formData.items.length === 1} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    
                    // Fallback Pintar untuk API
                    let vendor = item.vendor_name || item.supplier_name || '';
                    let poRef = item.po_ref || item.po_reference || '-';
                    if (!vendor && item.notes && item.notes.includes('Vendor:')) {
                      vendor = item.notes.split('Vendor:')[1]?.trim();
                    }
                    if (poRef === '-' && item.notes && item.notes.includes('PO Ref:')) {
                      poRef = item.notes.split('|')[0].replace('PO Ref:', '').trim();
                    }

                    // Format Tanggal Bersih
                    const rawDate = item.date || item.receive_date || '';
                    const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

                    const deliveryOrder = item.delivery_order || '-';
                    const spkSupplier = item.spk_supplier || '-';
                    const keyId = item.id || idx;

                    return (
                      <tr key={keyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 relative">
                        <td className="px-6 py-3">{cleanDate}</td>
                        <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">{receiveNo}</td>
                        <td className="px-6 py-3 font-semibold">{vendor || '-'}</td>
                        <td className="px-6 py-3 text-slate-500">{poRef}</td>
                        <td className="px-6 py-3 text-slate-500">{deliveryOrder}</td>
                        <td className="px-6 py-3 text-slate-500">{spkSupplier}</td>
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
                              <button onClick={() => handleEdit(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit / Lihat Detail</button>
                              <button onClick={() => handlePrint(item)} className="w-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><Printer className="h-3.5 w-3.5 text-emerald-500" /> Cetak Bukti</button>
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