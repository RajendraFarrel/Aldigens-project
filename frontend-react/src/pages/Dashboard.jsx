import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  AlertTriangle, 
  FileText, 
  PlusCircle, 
  Search, 
  X,
  Trash2,
  Plus
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // State form dengan dukungan multi-item
  const [formData, setFormData] = useState({
    quotation_number: '',
    date: new Date().toISOString().split('T')[0],
    admin_sales: '',
    customer_name: '',
    customer_address: 'Jakarta',
    customer_phone: '-',
    customer_email: '-',
    subject: '',
    items: [
      { description: '', qty: 1, unit_price: 0 }
    ]
  });

  const fetchQuotations = async () => {
    try {
      const response = await api.get('/quotations'); // Menggunakan instance api
      const result = response.data; // Axios otomatis memparsing JSON ke response.data

      if (result.status === 'success' && result.data) {
        const formattedData = result.data.map((item) => ({
          id: item.id,
          quotation_number: item.quotation_number,
          date: item.date,
          admin_sales: item.admin_sales,
          customer_name: item.customer_name,
          customer_address: item.customer_address,
          subject: item.subject,
          items: item.items,
          sub_total: item.sub_total,
          tax_amount: item.tax_amount,
          grand_total: item.grand_total,
          poNumber: item.quotation_number,
          client: item.customer_name,
          item: item.items && item.items.length > 0 ? `${item.items.length} Item Barang` : item.subject,
        }));
        setPoList(formattedData);
      }
    } catch (error) {
      console.error('Gagal mengambil data dari API Laravel:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Fungsi untuk menambah baris item baru
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', qty: 1, unit_price: 0 }]
    });
  };

  // Fungsi untuk menghapus baris item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return; // Sisakan minimal 1 baris
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  // Fungsi mengubah nilai pada baris item tertentu
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData({ ...formData, items: updatedItems });
  };

  // Handle submit form ke backend Laravel
  const handleSubmitNewPO = async (e) => {
    e.preventDefault();
    try {
      // Hitung total keseluruhan dari semua item
      let calculatedSubTotal = 0;
      const formattedItems = formData.items.map((item) => {
        const amount = Number(item.qty) * Number(item.unit_price);
        calculatedSubTotal += amount;
        return {
          part_number: 'PART-' + Math.floor(Math.random() * 1000),
          description: item.description,
          qty: Number(item.qty),
          unit: 'SET',
          unit_price: Number(item.unit_price),
          amount: amount
        };
      });

      const taxAmount = calculatedSubTotal * 0.11;
      const grandTotal = calculatedSubTotal + taxAmount;

      const payload = {
        quotation_number: formData.quotation_number,
        date: formData.date,
        admin_sales: formData.admin_sales,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        attention_person: 'Bpk. / Ibu',
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        subject: formData.subject,
        currency: 'IDR (Rupiah)',
        place_of_delivery: 'Jakarta',
        terms_of_payment: 'Cash / Transfer',
        terms_of_delivery: 'Franco',
        terms_of_warranty: '1 Bulan',
        sub_total: calculatedSubTotal,
        tax_percentage: 11,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        items: formattedItems
      };

      // Kirim lewat instance api agar token Sanctum otomatis ikut terkirim
      await api.post('/quotations', payload);

      alert('Berhasil menambahkan PO baru ke database dengan banyak item!');
      setIsModalOpen(false);
      setFormData({
        quotation_number: '',
        date: new Date().toISOString().split('T')[0],
        admin_sales: '',
        customer_name: '',
        customer_address: 'Jakarta',
        customer_phone: '-',
        customer_email: '-',
        subject: '',
        items: [{ description: '', qty: 1, unit_price: 0 }]
      });
      fetchQuotations();
    } catch (error) {
      console.error('Terjadi kesalahan saat menyimpan PO:', error);

      // Tampilkan pesan asli dari Laravel agar penyebabnya kelihatan
      const serverMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;

      if (error.response?.status === 401) {
        alert('Sesi login Anda sudah berakhir. Silakan login ulang.');
      } else if (validationErrors) {
        const detail = Object.values(validationErrors).flat().join('\n');
        alert('Data ditolak oleh server:\n' + detail);
      } else if (serverMessage) {
        alert('Gagal menyimpan data: ' + serverMessage);
      } else {
        alert('Gagal menyimpan data, periksa kembali inputan Anda.');
      }
    }
  };

  if (selectedQuotation) {
    return (
      <QuotationPreview 
        data={selectedQuotation} 
        onBack={() => setSelectedQuotation(null)} 
      />
    );
  }

  return (
    <div className="p-8 space-y-8 relative">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total PO Aktif</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{poList.length} Dokumen</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Radar Repeat Order (Mendesak)</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">3 Klien</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">BAST Selesai Bulan Ini</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">12 Unit</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <PackageCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar PO & Radar Pemeliharaan Berkala</h2>
            <p className="text-sm text-slate-500">Memantau siklus umur alat berat klien untuk peluang Repeat Order secara otomatis.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Input PO Baru</span>
          </button>
        </div>

        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nomor PO atau nama PT klien..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Terhubung ke Database Laravel 
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">No. PO & Klien</th>
                <th className="py-3.5 px-6">Spesifikasi Barang</th>
                <th className="py-3.5 px-6">Tanggal Pasang (BAST)</th>
                <th className="py-3.5 px-6">Status Pengerjaan</th>
                <th className="py-3.5 px-6">Radar Repeat Order</th>
                <th className="py-3.5 px-6 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Memuat data dari database...
                  </td>
                </tr>
              ) : poList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Belum ada data quotation di database.
                  </td>
                </tr>
              ) : (
                poList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{item.quotation_number}</div>
                      <div className="text-xs text-slate-500">{item.customer_name}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {item.items && item.items.length > 0 ? item.items[0].description : item.subject}
                      {item.items && item.items.length > 1 && (
                        <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          +{item.items.length - 1} item lainnya
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {item.date}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Safe (Aman)
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => setSelectedQuotation(item)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-medium transition shadow-xs cursor-pointer"
                      >
                        Buat Penawaran
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input PO Baru dengan Multi-Item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Input Data PO  </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Quotation / PO</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: AQ-26090003"
                    value={formData.quotation_number}
                    onChange={(e) => setFormData({...formData, quotation_number: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Dokumen</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Klien / Perusahaan</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: PT SANY PERKASA"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Sales</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nama Admin Sales"
                    value={formData.admin_sales}
                    onChange={(e) => setFormData({...formData, admin_sales: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* TAMBAHAN INPUT ALAMAT KLIEN */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Lengkap Klien</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Jl. Angkasa 1-3 Gunung Sahari Utara Sawah Besar - Jakarta Pusat"
                  value={formData.customer_address}
                  onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subjek / Proyek</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: FABRICATION / OVERHAUL"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bagian Multi-Item Barang */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-sm text-slate-700">Daftar Spesifikasi Barang / Item</h4>
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Baris Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                        {formData.items.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-500 hover:text-rose-700 p-1 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi Barang / Unit</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Contoh: REINFORCE MODIFICATION FLAT BUCKET"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kuantitas (QTY)</label>
                          <input 
                            type="number" 
                            min="1"
                            required
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                          <input 
                            type="number" 
                            min="0"
                            required
                            placeholder="Contoh: 1850000"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                >
                  Simpan PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}