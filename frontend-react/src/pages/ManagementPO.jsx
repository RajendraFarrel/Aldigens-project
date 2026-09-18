import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, UploadCloud, CheckCircle, Clock, X, FileText, Download, Calendar
} from 'lucide-react';

export default function ManagementPO() {
  const [recapList, setRecapList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [bastForm, setBastForm] = useState({
    id: '',
    bastNumber: '',
    bastDate: new Date().toISOString().split('T')[0],
  });

  // Fetch data PO & Gabungkan dengan data BAST yang tersimpan di Local Storage
  const fetchRecapData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/quotations');
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        // Ambil data BAST yang pernah disimpan di memori browser
        const savedBastData = JSON.parse(localStorage.getItem('bast_records')) || {};

        const formattedData = result.data.map((item) => {
          // Cek apakah PO ini sudah pernah di-upload BAST-nya
          const existingBast = savedBastData[item.id];

          return {
            id: item.id,
            poNumber: item.quotation_number,
            client: item.customer_name,
            poDate: item.date,
            // Jika ada di local storage, pakai data itu. Jika tidak, pending.
            bastNumber: existingBast ? existingBast.bastNumber : 'Menunggu BAST', 
            bastDate: existingBast ? existingBast.bastDate : '-', 
            status: existingBast ? 'Verified' : 'Pending',
            fullData: item 
          };
        });
        setRecapList(formattedData);
      }
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecapData();
  }, []);

  // Simpan data upload ke Local Storage agar tidak hilang saat pindah tab
  const handleUploadBAST = (e) => {
    e.preventDefault();
    
    // 1. Simpan ke memori browser (Local Storage)
    const savedBastData = JSON.parse(localStorage.getItem('bast_records')) || {};
    savedBastData[bastForm.id] = {
      bastNumber: bastForm.bastNumber,
      bastDate: bastForm.bastDate
    };
    localStorage.setItem('bast_records', JSON.stringify(savedBastData));

    // 2. Update tampilan tabel
    const updatedList = recapList.map(item => {
      if (item.id === Number(bastForm.id)) {
        return {
          ...item,
          bastNumber: bastForm.bastNumber,
          bastDate: bastForm.bastDate,
          status: 'Verified'
        };
      }
      return item;
    });

    setRecapList(updatedList);
    setIsUploadModalOpen(false);
    alert('Berkas BAST berhasil diunggah dan tersimpan!');
    
    setBastForm({ id: '', bastNumber: '', bastDate: new Date().toISOString().split('T')[0] });
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // ... (SISA KODE KE BAWAH TETAP SAMA SEPERTI SEBELUMNYA) ...
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen relative">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Dokumen PO & BAST</h2>
          <p className="text-sm text-slate-500">Pusat kontrol arsip Purchase Order dan Berita Acara Serah Terima (BAST).</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Unggah Berkas BAST</span>
        </button>
      </div>

      {/* Tabel Rekap */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nomor BAST atau nama klien..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer">
            <Filter className="h-4 w-4" />
            <span>Filter Status</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Nomor PO & Klien</th>
                <th className="py-4 px-6">Nomor Dokumen BAST</th>
                <th className="py-4 px-6">Tanggal PO</th>
                <th className="py-4 px-6">Tanggal BAST (Instalasi)</th>
                <th className="py-4 px-6">Status Berkas</th>
                <th className="py-4 px-6 text-center">Kelola Arsip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">Menarik data rekap...</td>
                </tr>
              ) : recapList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">Belum ada data PO.</td>
                </tr>
              ) : (
                recapList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">{item.poNumber}</div>
                      <div className="text-xs text-slate-500">{item.client}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-700">{item.bastNumber}</td>
                    <td className="py-4 px-6 text-slate-600">{item.poDate}</td>
                    <td className="py-4 px-6 text-slate-600">{item.bastDate}</td>
                    <td className="py-4 px-6">
                      {item.status === 'Verified' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => openDetail(item)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded transition cursor-pointer"
                      >
                        Detail Arsip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: UNGGAH BAST */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Unggah Berkas BAST</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadBAST} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Pilih Dokumen PO (Klien)</label>
                <select 
                  required
                  value={bastForm.id}
                  onChange={(e) => setBastForm({...bastForm, id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>-- Pilih PO yang sudah selesai --</option>
                  {recapList.filter(item => item.status === 'Pending').map(po => (
                    <option key={po.id} value={po.id}>{po.poNumber} - {po.client}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Surat BAST</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: BAST/2026/IX/001"
                  value={bastForm.bastNumber}
                  onChange={(e) => setBastForm({...bastForm, bastNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Pasang / BAST (Instalasi)</label>
                <input 
                  type="date" 
                  required
                  value={bastForm.bastDate}
                  onChange={(e) => setBastForm({...bastForm, bastDate: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-amber-600 mt-1">*Tanggal ini akan digunakan sebagai acuan Radar Repeat Order.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Upload File BAST (PDF/Scan)</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer">Verifikasi & Unggah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL ARSIP */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Detail Arsip Proyek</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{selectedItem.client}</h4>
                  <p className="text-sm text-slate-500 mt-1">{selectedItem.fullData.subject}</p>
                </div>
                {selectedItem.status === 'Verified' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                    <span>Dokumen Lengkap</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-4 w-4" />
                    <span>Menunggu BAST</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Nomor Quotation / PO</p>
                  <p className="font-bold text-slate-900">{selectedItem.poNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Tanggal PO</p>
                  <p className="font-bold text-slate-900 flex items-center"><Calendar className="h-4 w-4 mr-1 text-slate-400"/> {selectedItem.poDate}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <p className="text-slate-500 font-medium">Nomor BAST</p>
                  <p className="font-bold text-slate-900">{selectedItem.bastNumber}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <p className="text-slate-500 font-medium">Tanggal BAST (Instalasi)</p>
                  <p className="font-bold text-slate-900 flex items-center"><Calendar className="h-4 w-4 mr-1 text-slate-400"/> {selectedItem.bastDate}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h5 className="font-bold text-slate-700 text-sm">Unduh Dokumen Berkas</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center justify-between p-3 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="bg-slate-100 p-2 rounded text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-100 transition">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">Dokumen PO / Quotation</p>
                        <p className="text-xs text-slate-500">PDF Document</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                  </button>

                  <button 
                    disabled={selectedItem.status !== 'Verified'}
                    className={`flex items-center justify-between p-3 border rounded-lg transition group ${
                      selectedItem.status === 'Verified' 
                      ? 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer' 
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded transition ${selectedItem.status === 'Verified' ? 'bg-slate-100 text-slate-600 group-hover:text-emerald-600 group-hover:bg-emerald-100' : 'bg-slate-200 text-slate-400'}`}>
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">Dokumen BAST Scan</p>
                        <p className="text-xs text-slate-500">{selectedItem.status === 'Verified' ? 'PDF/Image Document' : 'Belum Tersedia'}</p>
                      </div>
                    </div>
                    <Download className={`h-4 w-4 ${selectedItem.status === 'Verified' ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}