import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  AlertTriangle, 
  FileText, 
  Search
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

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
    </div>
  );
}