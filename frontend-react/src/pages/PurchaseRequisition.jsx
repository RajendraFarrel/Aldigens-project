import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ClipboardList } from 'lucide-react';

export default function PurchaseRequisition() {
  const [searchTerm, setSearchTerm] = useState('');

  const dummyPR = [
    { id: 1, date: '25 Sep 2026', prNo: 'PR-202609-001', department: 'Produksi', requestor: 'Budi Santoso', notes: 'Bahan baku plastik', status: 'Disetujui' },
    { id: 2, date: '24 Sep 2026', prNo: 'PR-202609-002', department: 'IT', requestor: 'Andi Wijaya', notes: 'Pengadaan 2 unit Laptop', status: 'Menunggu' },
    { id: 3, date: '20 Sep 2026', prNo: 'PR-202609-003', department: 'HRD', requestor: 'Siti Aminah', notes: 'Kebutuhan ATK Bulanan', status: 'Ditolak' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Menunggu':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'Ditolak':
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
                placeholder="Cari no. PR atau departemen..." 
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
            Buat PR
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">No. PR</th>
                <th className="px-6 py-4 font-medium">Departemen</th>
                <th className="px-6 py-4 font-medium">Pemohon</th>
                <th className="px-6 py-4 font-medium">Keterangan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummyPR.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    {item.prNo}
                  </td>
                  <td className="px-6 py-4">{item.department}</td>
                  <td className="px-6 py-4">{item.requestor}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                    {item.notes}
                  </td>
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