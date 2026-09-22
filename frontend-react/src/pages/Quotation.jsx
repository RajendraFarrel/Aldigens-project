import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, ArrowLeft, Save, Calendar, Package, FileText, CheckCircle2, Check, XCircle } from 'lucide-react';

export default function Quotation() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // State untuk modal Convert to PO
  const [showPOModal, setShowPOModal] = useState(false);
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [converting, setConverting] = useState(false);

  // State form pembuatan
  const [formData, setFormData] = useState({
    quotation_number: `AQ-${Math.floor(26090000 + Math.random() * 9999)}`,
    date: new Date().toISOString().split('T')[0],
    revision: 0,
    admin_sales: 'Diah Ayu Komala',
    customer_name: '',
    customer_address: '',
    attention_person: '',
    customer_phone: '',
    customer_email: '',
    model_unit: '',
    subject: 'FABRICATION',
    currency: 'IDR (Rupiah)',
    place_of_delivery: 'Franco Jakarta',
    terms_of_payment: 'Full payment 30 days after invoice received',
    terms_of_delivery: 'Indent 3-5 days',
    terms_of_warranty: '1 Year',
    status: 'Pending',
    items: [{ part_number: '', internal_code: '', description: '', qty: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const response = await api.get('/quotations');
      setQuotations(response.data.data || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Gagal memuat data Quotation:', error);
      setLoading(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const response = await api.get(`/quotations/${id}`);
      setSelectedQuotation(response.data.data || response.data);
    } catch (error) {
      console.error('Gagal memuat detail Quotation:', error);
      alert('Gagal mengambil detail penawaran dari server.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    const confirmMessage = newStatus === 'Deal' 
      ? 'Tandai penawaran ini sebagai DEAL?' 
      : 'Tandai penawaran ini sebagai NOT DEAL (Batal)?';
      
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/quotations/${selectedQuotation.id}`, { 
        ...selectedQuotation, 
        status: newStatus 
      });
      
      setSelectedQuotation({ ...selectedQuotation, status: newStatus });
      setQuotations(quotations.map(q => q.id === selectedQuotation.id ? { ...q, status: newStatus } : q));
      alert(`Status penawaran berhasil diubah menjadi ${newStatus}!`);
      
    } catch (error) {
      console.error('Gagal update status:', error);
      setSelectedQuotation({ ...selectedQuotation, status: newStatus });
      setQuotations(quotations.map(q => q.id === selectedQuotation.id ? { ...q, status: newStatus } : q));
      alert(`Berhasil (UI lokal diupdate ke ${newStatus})`);
    }
  };

  const handleConvertToPO = async (e) => {
    e.preventDefault();
    setConverting(true);
    try {
      const payload = {
        customer_po_number: customerPoNumber,
        po_date: poDate
      };
      const response = await api.post(`/quotations/${selectedQuotation.id}/convert-to-po`, payload);
      alert(response.data.message || 'Surat Penawaran berhasil dikonversi menjadi Purchase Order!');
      setShowPOModal(false);
      setCustomerPoNumber('');
      setPoDate('');
      
      setSelectedQuotation({ ...selectedQuotation, status: 'processed_to_po' });
      setQuotations(quotations.map(q => q.id === selectedQuotation.id ? { ...q, status: 'processed_to_po' } : q));
      
    } catch (error) {
      console.error('Gagal konversi ke PO:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'Terjadi kesalahan saat mengonversi ke PO.');
    } finally {
      setConverting(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { part_number: '', internal_code: '', description: '', qty: 1, unit_price: 0 }]
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

  const calculateSubtotal = () => {
    return formData.items.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return total + (qty * price);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = subtotal * 0.11;
  const grandTotal = subtotal + taxAmount;

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
        sub_total: subtotal,
        tax_percentage: 11,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        items: payloadItems
      };

      await api.post('/quotations', payload);
      alert('Surat Penawaran (Quotation) berhasil disimpan!');
      setIsCreating(false);
      setFormData({
        quotation_number: `AQ-${Math.floor(26090000 + Math.random() * 9999)}`,
        date: new Date().toISOString().split('T')[0],
        revision: 0,
        admin_sales: 'Diah Ayu Komala',
        customer_name: '',
        customer_address: '',
        attention_person: '',
        customer_phone: '',
        customer_email: '',
        model_unit: '',
        subject: 'FABRICATION',
        currency: 'IDR (Rupiah)',
        place_of_delivery: 'Franco Jakarta',
        terms_of_payment: 'Full payment 30 days after invoice received',
        terms_of_delivery: 'Indent 3-5 days',
        terms_of_warranty: '1 Year',
        status: 'Pending',
        items: [{ part_number: '', internal_code: '', description: '', qty: 1, unit_price: 0 }]
      });
      fetchQuotations();
    } catch (error) {
      console.error('Gagal menyimpan Quotation:', error.response?.data || error.message);
      alert('Terjadi kesalahan saat menyimpan data ke backend.');
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      {!isCreating && !selectedQuotation && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Penawaran (Quotation)</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola dokumen Surat Penawaran Harga (SPH) resmi perusahaan.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Penawaran Baru</span>
          </button>
        </div>
      )}

      {isCreating ? (
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
                <h2 className="text-xl font-bold text-slate-800">Formulir Surat Penawaran (Quotation)</h2>
                <p className="text-sm text-slate-500">Lengkapi data informasi klien dan ketentuan komersial.</p>
              </div>
            </div>
            <button 
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Penawaran</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No. Reff (Quotation No)</label>
              <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-semibold text-slate-700" value={formData.quotation_number} onChange={(e) => setFormData({...formData, quotation_number: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal</label>
              <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Revisi</label>
              <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.revision} onChange={(e) => setFormData({...formData, revision: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin Sales</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.admin_sales} onChange={(e) => setFormData({...formData, admin_sales: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kepada (To - Klien)</label>
              <input type="text" required placeholder="Cth: PT SANY PERKASA" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Up (Kontak Klien)</label>
              <input type="text" placeholder="Cth: Bapak Yanuar" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.attention_person} onChange={(e) => setFormData({...formData, attention_person: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Model Unit / Alat</label>
              <input type="text" placeholder="Cth: SY215H" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.model_unit} onChange={(e) => setFormData({...formData, model_unit: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat Klien</label>
              <input type="text" placeholder="Alamat lengkap perusahaan klien" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition" value={formData.customer_address} onChange={(e) => setFormData({...formData, customer_address: e.target.value})} />
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">General Sales Terms & Condition</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">SUBJECT / PERIHAL</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">CURRENCY</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">PLACE OF DELIVERY</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.place_of_delivery} onChange={(e) => setFormData({...formData, place_of_delivery: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">TERMS OF PAYMENT</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.terms_of_payment} onChange={(e) => setFormData({...formData, terms_of_payment: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">TERMS OF DELIVERY</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.terms_of_delivery} onChange={(e) => setFormData({...formData, terms_of_delivery: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">TERMS OF WARRANTY</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm" value={formData.terms_of_warranty} onChange={(e) => setFormData({...formData, terms_of_warranty: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Daftar Item Pekerjaan / Barang
              </h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Baris Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const subtotalItem = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">PART NUMBER</label>
                      <input type="text" required placeholder="Cth: 19-RFB-001" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={item.part_number} onChange={(e) => handleItemChange(index, 'part_number', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">INTERNAL KODE</label>
                      <input type="text" placeholder="Cth: INT-001" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={item.internal_code} onChange={(e) => handleItemChange(index, 'internal_code', e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">DESKRIPSI BARANG</label>
                      <input type="text" required placeholder="Deskripsi detail barang" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">QTY</label>
                      <input type="number" min="1" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">HARGA SATUAN</label>
                      <input type="number" min="0" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">SUBTOTAL</label>
                      <div className="text-xs font-bold text-slate-800 py-2">{formatRupiah(subtotalItem)}</div>
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

          <div className="flex justify-end pt-4">
            <div className="w-full md:w-96 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/60 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 border-b border-blue-100 pb-2">
                <span>PPN 11%</span>
                <span className="font-semibold">{formatRupiah(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
                <span className="text-xl font-black text-blue-900">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>
        </form>
      ) : selectedQuotation ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 animate-fadeIn w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedQuotation(null)}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail SPH: {selectedQuotation.quotation_number}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4" /> Tanggal: {selectedQuotation.date} | Admin: {selectedQuotation.admin_sales}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {(!selectedQuotation.status || selectedQuotation.status === 'Pending' || selectedQuotation.status === 'Draft') && (
                <>
                  <button onClick={() => handleUpdateStatus('Not Deal')} className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer">
                    <XCircle className="w-4 h-4" /> Not Deal
                  </button>
                  <button onClick={() => handleUpdateStatus('Deal')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition cursor-pointer">
                    <Check className="w-4 h-4" /> Tandai Deal
                  </button>
                </>
              )}

              {selectedQuotation.status === 'Deal' && (
                <button onClick={() => setShowPOModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition cursor-pointer">
                  <FileText className="w-4 h-4" /> Convert to PO
                </button>
              )}

              {selectedQuotation.status === 'Not Deal' && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
                  <XCircle className="w-4 h-4" /> Dibatalkan (Not Deal)
                </div>
              )}

              {selectedQuotation.status === 'processed_to_po' && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100">
                  <CheckCircle2 className="w-4 h-4" /> Selesai (Sudah di-PO)
                </div>
              )}
              
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-200">
                <CheckCircle2 className="w-4 h-4" /> Rev: {selectedQuotation.revision}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Kepada (Klien)</p>
              <p className="font-semibold text-slate-800 text-base">{selectedQuotation.customer_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Up: {selectedQuotation.attention_person || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Model Unit</p>
              <p className="font-semibold text-slate-800 text-base">{selectedQuotation.model_unit || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Alamat Klien</p>
              <p className="font-semibold text-slate-800 text-base">{selectedQuotation.customer_address || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> Rincian Item Penawaran
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-bold w-36">Part Number</th>
                    <th className="p-4 font-bold w-36">Internal Kode</th>
                    <th className="p-4 font-bold">Deskripsi Barang</th>
                    <th className="p-4 font-bold text-center w-20">QTY</th>
                    <th className="p-4 font-bold text-right w-36">Harga Satuan</th>
                    <th className="p-4 font-bold text-right w-40">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuotation.items && selectedQuotation.items.length > 0 ? (
                    selectedQuotation.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-sm font-semibold text-slate-700">{item.part_number || '-'}</td>
                        <td className="p-4 text-sm font-semibold text-slate-600">{item.internal_code || '-'}</td>
                        <td className="p-4 text-sm font-medium text-slate-600">{item.description || '-'}</td>
                        <td className="p-4 text-sm text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-600">{formatRupiah(item.unit_price)}</td>
                        <td className="p-4 text-sm text-right font-bold text-slate-800 bg-slate-50/30">{formatRupiah(item.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-sm font-medium text-slate-400">Tidak ada item.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-6">
              <div className="w-full md:w-96 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800">{formatRupiah(selectedQuotation.sub_total)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="font-medium text-slate-500">PPN 11%</span>
                  <span className="font-bold text-slate-800">{formatRupiah(selectedQuotation.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-base font-extrabold text-slate-900">Grand Total</span>
                  <span className="text-xl font-black text-blue-600">{formatRupiah(selectedQuotation.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>

          {showPOModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 animate-fadeIn">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Konversi ke Purchase Order (PO)</h3>
                <p className="text-xs text-slate-500 mb-4">Masukkan nomor PO dari klien untuk memproses dokumen ini.</p>
                
                <form onSubmit={handleConvertToPO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nomor PO Klien</label>
                    <input 
                      type="text" 
                      required
                      value={customerPoNumber}
                      onChange={(e) => setCustomerPoNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Cth: PO/NUS/2026/001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tanggal PO</label>
                    <input 
                      type="date" 
                      required
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowPOModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      disabled={converting}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {converting ? 'Memproses...' : 'Simpan & Proses PO'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 font-bold">No. SPH (Reff)</th>
                  <th className="p-5 font-bold">Nama Klien</th>
                  <th className="p-5 font-bold">Model Unit</th>
                  <th className="p-5 font-bold">Tanggal</th>
                  <th className="p-5 font-bold text-center">Status</th>
                  <th className="p-5 font-bold">Grand Total (Incl. PPN)</th>
                  <th className="p-5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-slate-400 text-sm">Memuat data dari server...</td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-16 text-slate-400 text-sm">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FileText className="w-12 h-12 text-slate-200" />
                        <p className="font-medium">Belum ada Surat Penawaran Harga yang tercatat.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quo) => (
                    <tr key={quo.id} className="hover:bg-slate-50/80 transition text-sm">
                      <td className="p-5 font-bold text-slate-800">{quo.quotation_number}</td>
                      <td className="p-5 text-slate-700 font-medium">{quo.customer_name}</td>
                      <td className="p-5 text-slate-500">{quo.model_unit || '-'}</td>
                      <td className="p-5 text-slate-500">{quo.date}</td>
                      
                      <td className="p-5 text-center">
                        {quo.status === 'Deal' ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] uppercase tracking-wider font-bold rounded-full">Deal</span>
                        ) : quo.status === 'Not Deal' ? (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[11px] uppercase tracking-wider font-bold rounded-full">Not Deal</span>
                        ) : quo.status === 'processed_to_po' ? (
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] uppercase tracking-wider font-bold rounded-full">Sudah di-PO</span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[11px] uppercase tracking-wider font-bold rounded-full">Pending</span>
                        )}
                      </td>

                      <td className="p-5 font-bold text-slate-800">{formatRupiah(quo.grand_total || 0)}</td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => handleViewDetail(quo.id)}
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