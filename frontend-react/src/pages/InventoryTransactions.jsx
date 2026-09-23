import React, { useState, useEffect, useCallback } from 'react';
import {
  History, RefreshCw, ArrowDownCircle, ArrowUpCircle, Filter
} from 'lucide-react';
import { getTransactions } from '../services/api';

export default function InventoryTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filterType, setFilterType]     = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterType ? { type: filterType } : {};
      const res    = await getTransactions(params);
      setTransactions(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-xl shadow">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Riwayat Transaksi</h2>
            <p className="text-xs text-slate-500">Log masuk/keluar seluruh barang inventory</p>
          </div>
        </div>
        <button
          onClick={fetchTransactions}
          className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex gap-2">
          {['', 'MASUK', 'KELUAR'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer border ${
                filterType === type
                  ? type === 'MASUK'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : type === 'KELUAR'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type || 'Semua'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-2">{transactions.length} transaksi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Jenis</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok Sebelum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok Sesudah</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Tidak ada data transaksi.
                  </td>
                </tr>
              ) : transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(t.transaction_time)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      t.transaction_type === 'MASUK'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {t.transaction_type === 'MASUK'
                        ? <ArrowDownCircle className="h-3 w-3" />
                        : <ArrowUpCircle className="h-3 w-3" />
                      }
                      {t.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.product?.name || '-'}</p>
                    <p className="text-xs text-slate-400 font-mono">{t.product?.product_code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.product?.part_number || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{t.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{t.stock_before}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${t.transaction_type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.stock_after}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.user_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
