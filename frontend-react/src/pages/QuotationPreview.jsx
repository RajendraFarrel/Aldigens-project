import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';

export default function QuotationPreview({ data, onBack }) {
  const handlePrint = () => {
    window.print();
  };

  // Menggunakan data asli yang dikirim dari baris tabel dashboard, 
  // dengan fallback jika data kosong
  const quotation = data || {};

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {/* Tombol Kontrol (Tidak akan ikut tercetak) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </button>
        
        <button 
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition shadow-sm cursor-pointer font-medium text-sm"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* Lembar Dokumen A4 */}
      <div className="max-w-4xl mx-auto bg-white p-10 shadow-lg rounded-xl print:shadow-none print:p-0 print:w-full">
        {/* Header / Kop Surat */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-wider">PT. ALDIGENS PUTERA PERSADA</h1>
            <p className="text-xs text-slate-500 mt-1">Sistem Terintegrasi PO & Pemeliharaan Alat Berat</p>
            <p className="text-xs text-slate-500">Jl. Industri Raya No. 88, Bekasi, Jawa Barat</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-600 uppercase">QUOTATION</h2>
            <p className="text-sm font-semibold text-slate-700 mt-1">No: {quotation.quotation_number || quotation.poNumber}</p>
            <p className="text-xs text-slate-500">Tanggal: {quotation.date}</p>
          </div>
        </div>

        {/* Informasi Klien */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kepada Yth:</p>
            <p className="font-bold text-slate-900 text-base">{quotation.customer_name || quotation.client}</p>
            <p className="text-slate-600">{quotation.customer_address || 'Jakarta'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Perihal / Proyek:</p>
            <p className="font-semibold text-slate-800">{quotation.subject}</p>
            <p className="text-xs text-slate-500 mt-2">Admin Sales: <span className="font-medium text-slate-700">{quotation.admin_sales || 'Admin'}</span></p>
          </div>
        </div>

        {/* Tabel Rincian Barang (Multi-Item) */}
        <table className="w-full mb-8 border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th className="py-3 px-4 text-center w-12">No.</th>
              <th className="py-3 px-4 text-left">Deskripsi / Spesifikasi Barang</th>
              <th className="py-3 px-4 text-center w-20">Qty</th>
              <th className="py-3 px-4 text-center w-20">Satuan</th>
              <th className="py-3 px-4 text-right">Harga Satuan</th>
              <th className="py-3 px-4 text-right">Jumlah (IDR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-200">
            {quotation.items && quotation.items.length > 0 ? (
              quotation.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 text-center text-slate-600">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{item.qty}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{item.unit || 'SET'}</td>
                  <td className="py-3 px-4 text-right text-slate-700">Rp {Number(item.unit_price).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">Rp {Number(item.amount).toLocaleString('id-ID')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-4 text-center text-slate-500">Tidak ada rincian item.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total & Kalkulasi Otomatis */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Sub Total:</span>
              <span className="font-medium">Rp {Number(quotation.sub_total || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-2">
              <span>PPN (11%):</span>
              <span className="font-medium">Rp {Number(quotation.tax_amount || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-base pt-1">
              <span>Grand Total:</span>
              <span className="text-blue-600">Rp {Number(quotation.grand_total || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end pt-8 text-sm">
          <div className="text-slate-500 text-xs">
            <p className="font-semibold text-slate-700 mb-1">Syarat & Ketentuan:</p>
            <p>1. Pembayaran dilakukan sesuai termin yang disepakati.</p>
            <p>2. Penawaran berlaku selama 14 hari sejak tanggal diterbitkan.</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600 mb-16">Hormat Kami,</p>
            <p className="font-bold text-slate-900 border-b border-slate-400 pb-1 px-8">PT. ALDIGENS PUTERA PERSADA</p>
            <p className="text-xs text-slate-500 mt-1">Authorized Representative</p>
          </div>
        </div>
      </div>
    </div>
  );
}