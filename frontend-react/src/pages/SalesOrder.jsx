import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, ArrowLeft, Save, ShoppingCart, Calendar, User, Package, FileText, CheckCircle2 } from 'lucide-react';

export default function SalesOrder() {
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSO, setSelectedSO] = useState(null);

  const [formData, setFormData] = useState({
    quotation_id: '',
    so_number: `SO-${Math.floor(1000 + Math.random() * 9000)}`,
    client_po_number: '',
    so_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_address: '',
    model_unit: '',
    status: 'Pending',
    items: [{ product_id: '', description: '-', qty: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const response = await api.get('/sales-orders');
      setSalesOrders(response.data.data || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Gagal memuat data Sales Order:', error);
      setLoading(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const response = await api.get(`/sales-orders/${id}`);
      setSelectedSO(response.data.data || response.data);
    } catch (error) {
      console.error('Gagal memuat detail SO:', error);
      alert('Gagal mengambil detail pesanan dari server.');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', description: '-', qty: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return total + (qty * price);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payloadItems = formData.items.map(item => {
        const itemQty = parseFloat(item.qty) || 0;
        const itemPrice = parseFloat(item.unit_price) || 0;
        return {
          ...item,
          amount: itemQty * itemPrice
        };
      });

      const payload = {
        ...formData,
        items: payloadItems,
        sub_total: calculateGrandTotal(),
        tax_amount: 0,
        grand_total: calculateGrandTotal()
      };

      await api.post('/sales-orders', payload);
      alert('Sales Order berhasil disimpan ke database!');
      setIsCreating(false);
      setFormData({
        quotation_id: '',
        so_number: `SO-${Math.floor(1000 + Math.random() * 9000)}`,
        client_po_number: '',
        so_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        customer_address: '',
        model_unit: '',
        status: 'Pending',
        items: [{ product_id: '', description: '-', qty: 1, unit_price: 0 }]
      });
      fetchSalesOrders();
    } catch (error) {
      console.error('Gagal menyimpan SO:', error.response?.data || error.message);
      alert('Terjadi kesalahan saat menyimpan data ke backend.');
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      
      {/* Header Utama (Hanya Tampil Jika Tidak Sedang Membuka Form/Detail) */}
      {!isCreating && !selectedSO && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Sales Order</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola data pesanan pelanggan secara terintegrasi.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat SO Baru</span>
          </button>
        </div>
      )}

      {/* RENDER KONDISIONAL: FORM, DETAIL, ATAU TABEL */}
      {isCreating ? (
        
        /* ---------------- TAMPILAN FORM (FULL VIEW) ---------------- */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 animate-fadeIn w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Formulir Sales Order Baru</h2>
                <p className="text-sm text-slate-500">Lengkapi data pesanan di bawah ini.</p>
              </div>
            </div>
            <button 
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan SO</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ID Quotation (Opsional)</label>
              <input type="number" placeholder="Cth: 1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.quotation_id} onChange={(e) => setFormData({...formData, quotation_id: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. PO Client</label>
              <input type="text" required placeholder="Masukkan No. PO Client" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.client_po_number} onChange={(e) => setFormData({...formData, client_po_number: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal SO</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.so_date} onChange={(e) => setFormData({...formData, so_date: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Pelanggan</label>
              <input type="text" required placeholder="Nama PT / Klien" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Model Unit</label>
              <input type="text" placeholder="Model / Tipe Alat" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.model_unit} onChange={(e) => setFormData({...formData, model_unit: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Pelanggan</label>
              <input type="text" placeholder="Alamat lengkap klien" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.customer_address} onChange={(e) => setFormData({...formData, customer_address: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Daftar Item Barang
              </h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ID PRODUK</label>
                      <input type="text" required placeholder="PRD-001" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">DESKRIPSI BARANG</label>
                      <input type="text" required placeholder="Deskripsi barang" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">QTY</label>
                      <input type="number" min="1" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">HARGA SATUAN</label>
                      <input type="number" min="0" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">SUBTOTAL</label>
                      <div className="text-sm font-bold text-slate-800 py-2">{formatRupiah(subtotal)}</div>
                    </div>
                    <div className="md:col-span-1 text-right">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer mt-5 md:mt-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <div className="w-full md:w-1/3 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/60">
              <p className="text-sm text-slate-500 font-medium mb-1">Total Estimasi Keseluruhan</p>
              <h4 className="text-3xl font-black text-blue-900">{formatRupiah(calculateGrandTotal())}</h4>
            </div>
          </div>
        </form>

      ) : selectedSO ? (

        /* ---------------- TAMPILAN DETAIL (DETAIL VIEW) ---------------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 animate-fadeIn w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedSO(null)}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail: {selectedSO.so_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> Dibuat pada {selectedSO.so_date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" /> {selectedSO.status}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nama Pelanggan</p>
              <p className="font-semibold text-slate-800 text-base">{selectedSO.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">No. PO Client</p>
              <p className="font-semibold text-slate-800 text-base">{selectedSO.client_po_number}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Model Unit</p>
              <p className="font-semibold text-slate-800 text-base">{selectedSO.model_unit || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Alamat Pengiriman</p>
              <p className="font-semibold text-slate-800 text-base line-clamp-2">{selectedSO.customer_address || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> Daftar Barang Pesanan
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-bold w-32">ID Produk</th>
                    <th className="p-4 font-bold">Deskripsi Barang</th>
                    <th className="p-4 font-bold text-center w-24">QTY</th>
                    <th className="p-4 font-bold text-right w-40">Harga Satuan</th>
                    <th className="p-4 font-bold text-right w-48">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSO.items && selectedSO.items.length > 0 ? (
                    selectedSO.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-sm font-semibold text-slate-700">{item.product_id || '-'}</td>
                        <td className="p-4 text-sm font-medium text-slate-600">{item.description || '-'}</td>
                        <td className="p-4 text-sm text-center font-bold text-slate-800">{item.qty || item.quantity}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-600">{formatRupiah(item.unit_price)}</td>
                        <td className="p-4 text-sm text-right font-bold text-slate-800 bg-slate-50/30">
                          {formatRupiah(item.amount || ((item.qty || item.quantity) * item.unit_price))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm font-medium text-slate-400">
                        Tidak ada detail barang untuk pesanan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Box Total Terpisah di Kanan Bawah */}
            <div className="flex justify-end mt-6">
              <div className="w-full md:w-96 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-slate-500">Subtotal</span>
                  <span className="text-sm font-bold text-slate-800">{formatRupiah(selectedSO.sub_total || selectedSO.grand_total)}</span>
                </div>
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm font-medium text-slate-500">Pajak (Tax)</span>
                  <span className="text-sm font-bold text-slate-800">{formatRupiah(selectedSO.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-5">
                  <span className="text-base font-extrabold text-slate-900">Total Keseluruhan</span>
                  <span className="text-xl font-black text-blue-600">{formatRupiah(selectedSO.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ---------------- TAMPILAN TABEL LIST SO UTAMA ---------------- */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. SO</th>
                  <th className="p-5 font-bold">Nama Pelanggan</th>
                  <th className="p-5 font-bold">No. PO Client</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold">Total Nilai</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center p-12 text-slate-400 text-sm">Memuat data dari server...</td>
                  </tr>
                ) : salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-16 text-slate-400 text-sm">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <ShoppingCart className="w-12 h-12 text-slate-200" />
                        <p className="font-medium">Belum ada data Sales Order yang tercatat.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  salesOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-slate-50/80 transition text-sm">
                      <td className="p-5 font-bold text-slate-800">{so.so_number}</td>
                      <td className="p-5 text-slate-700 font-medium">{so.customer_name}</td>
                      <td className="p-5 text-slate-500">{so.client_po_number}</td>
                      <td className="p-5 text-slate-500">{so.so_date}</td>
                      <td className="p-5 font-bold text-slate-800">{formatRupiah(so.grand_total || 0)}</td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => handleViewDetail(so.id)}
                          className="text-blue-600 hover:text-white font-semibold text-xs bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}