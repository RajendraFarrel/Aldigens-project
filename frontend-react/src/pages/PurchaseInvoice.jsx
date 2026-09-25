import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, FileText } from 'lucide-react';

export default function PurchaseInvoice() {
  const [searchTerm, setSearchTerm] = useState('');

  const dummyPI = [
    { id: 1, date: '27 Sep 2026', piNo: 'PI-202609-001', vendor: 'PT. Plastikindo', amount: 'Rp 25.000.000', status: 'Belum Lunas' },
    { id: 2, date: '20 Sep 2026', piNo: 'PI-202609-002', vendor: 'CV. Komputer Jaya', amount: 'Rp 14.500.000', status: 'Lunas' },
    { id: 3, date: '15 Sep 2026', piNo: 'PI-202609-003', vendor: 'Toko ATK Makmur', amount: 'Rp 2.100.000', status: 'Jatuh Tempo' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Lunas':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Belum Lunas':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'Jatuh Tempo':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. faktur atau vendor..." 
                className="pl-9 pr-4 py-2 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="h-4 w-4" />
            Buat Faktur Beli
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. Faktur (PI)</th>
                <th className="px-6 py-4 font-medium">Pemasok (Vendor)</th>
                <th className="px-6 py-4 font-medium">Total Tagihan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummyPI.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    {item.piNo}
                  </td>
                  <td className="px-6 py-4">{item.vendor}</td>
                  <td className="px-6 py-4 font-medium">{item.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <MoreVertical className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}