import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, ListTree } from 'lucide-react';

export default function BillOfMaterials() {
  const [searchTerm, setSearchTerm] = useState('');

  const dummyBOM = [
    { id: 1, date: '01 Sep 2026', bomNo: 'BOM-202609-001', product: 'Meja Belajar Kayu', qty: '1 Unit', status: 'Aktif' },
    { id: 2, date: '10 Sep 2026', bomNo: 'BOM-202609-002', product: 'Kursi Kantor Ergonomis', qty: '1 Unit', status: 'Aktif' },
    { id: 3, date: '15 Sep 2026', bomNo: 'BOM-202609-003', product: 'Rak Buku Minimalis', qty: '1 Unit', status: 'Tidak Aktif' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Tidak Aktif':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
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
                placeholder="Cari no. BOM atau produk..." 
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
            Buat BOM Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Tanggal Dibuat</th>
                <th className="px-6 py-4 font-medium">No. BOM</th>
                <th className="px-6 py-4 font-medium">Produk Jadi</th>
                <th className="px-6 py-4 font-medium">Kuantitas Hasil</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummyBOM.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    {item.bomNo}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.product}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.qty}</td>
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