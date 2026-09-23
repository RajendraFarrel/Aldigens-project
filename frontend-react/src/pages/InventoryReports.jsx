import React, { useState, useEffect } from 'react';
import {
  BarChart3, RefreshCw, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, TrendingUp
} from 'lucide-react';
import { getWeeklyReport } from '../services/api';

export default function InventoryReports() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [weekDate, setWeekDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState('transactions'); // transactions | summary | stock

  const fetchReport = async (date) => {
    setLoading(true);
    try {
      const res = await getWeeklyReport(date);
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(weekDate);
  }, [weekDate]);

  const goToPrevWeek = () => {
    const d = new Date(weekDate);
    d.setDate(d.getDate() - 7);
    setWeekDate(d.toISOString().slice(0, 10));
  };

  const goToNextWeek = () => {
    const d = new Date(weekDate);
    d.setDate(d.getDate() + 7);
    setWeekDate(d.toISOString().slice(0, 10));
  };

  const formatDt = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Laporan Stok</h2>
          <p className="text-xs text-slate-500">Rekap pergerakan barang mingguan</p>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={goToPrevWeek}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-400">Periode Minggu</p>
          <p className="font-bold text-slate-800 text-sm">
            {report ? `${report.week_start} – ${report.week_end}` : '...'}
          </p>
          <input
            type="date"
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
            className="mt-1 text-xs text-indigo-600 border-0 outline-none cursor-pointer bg-transparent text-center"
          />
        </div>
        <button
          onClick={goToNextWeek}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 mb-1">Total Transaksi</p>
            <p className="text-2xl font-bold text-slate-800">{report.total_transactions}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-emerald-600 mb-1">Total Masuk</p>
            <p className="text-2xl font-bold text-emerald-700">{report.total_in}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-rose-600 mb-1">Total Keluar</p>
            <p className="text-2xl font-bold text-rose-700">{report.total_out}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        {[
          { key: 'transactions', label: 'Detail Transaksi' },
          { key: 'summary',      label: 'Ringkasan Produk' },
          { key: 'stock',        label: 'Stok Saat Ini' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin inline mr-2" />
          Memuat laporan...
        </div>
      ) : report ? (
        <>
          {/* Detail Transaksi */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Jenis</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.weekly_transactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada transaksi minggu ini.</td></tr>
                    ) : report.weekly_transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDt(t.transaction_time)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${
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
                          <p className="font-medium text-slate-800">{t.product?.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{t.product?.product_code}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{t.quantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.user_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ringkasan Produk */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                      <th className="text-right px-4 py-3 font-semibold text-emerald-600">Total Masuk</th>
                      <th className="text-right px-4 py-3 font-semibold text-rose-600">Total Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.product_summary.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada data.</td></tr>
                    ) : report.product_summary.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.part_number || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.category || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">+{p.total_in}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">-{p.total_out}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stok Saat Ini */}
          {activeTab === 'stock' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kode</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Produk</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Satuan</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.current_products.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">{p.product_code}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.category || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${p.stock <= 0 ? 'text-red-500' : 'text-slate-800'}`}>
                            {p.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
