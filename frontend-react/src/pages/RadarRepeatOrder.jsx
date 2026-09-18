import React, { useState } from 'react';
import { AlertTriangle, Clock, ShieldAlert, Send, Building2, Wrench } from 'lucide-react';
import { initialPoList } from "../Data/mockData";

export default function RadarRepeatOrder() {
  // Filter khusus klien yang masuk status Warning atau Expired
  const [radarList] = useState(
    initialPoList.filter(item => 
      item.radarStatus.includes('Warning') || item.radarStatus.includes('Expired')
    )
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <span>Radar Repeat Order (Peringatan Dini & Jatuh Tempo)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantauan proaktif siklus umur alat klien untuk mengamankan peluang kontrak peremajaan atau pemeliharaan berkala.
          </p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-200 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{radarList.length} Klien Butuh Tindakan</span>
        </div>
      </div>

      {/* Grid Kartu Peringatan (Bukan Tabel Biasa) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {radarList.map((item) => {
          const isExpired = item.radarStatus.includes('Expired');
          
          return (
            <div 
              key={item.id} 
              className={`bg-white rounded-xl p-6 border transition shadow-xs flex flex-col justify-between space-y-6 ${
                isExpired ? 'border-rose-300 ring-2 ring-rose-100' : 'border-amber-300 ring-2 ring-amber-100'
              }`}
            >
              {/* Bagian Atas: Status Alarm & No PO */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.poNumber}</span>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-1">
                    <Building2 className="h-5 w-5 text-slate-500 shrink-0" />
                    <span>{item.client}</span>
                  </h3>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  isExpired 
                    ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {item.radarStatus}
                </span>
              </div>

              {/* Bagian Tengah: Detail Alat & Tanggal Pasang */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100">
                <div className="flex items-center space-x-2 text-sm text-slate-700">
                  <Wrench className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-medium">{item.item}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Tanggal BAST / Pemasangan: <strong>{item.installDate}</strong></span>
                </div>
              </div>

              {/* Bagian Bawah: Aksi Cepat Sales */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 italic">
                  {isExpired ? '⚠️ Masa garansi/pemeliharaan sudah habis!' : '⏰ Batas waktu servis berkala mendekati akhir.'}
                </span>
                <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition shadow-xs cursor-pointer">
                  <Send className="h-3.5 w-3.5" />
                  <span>Buat Penawaran Cepat</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}