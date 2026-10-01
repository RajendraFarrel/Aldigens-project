import React, { useMemo, useState } from 'react';
import { BookMarked, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  CHART_OF_ACCOUNTS, ACCOUNT_TYPES, formatTanggal,
} from '../../Data/mockAccounting';

export default function ChartOfAccount() {
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [tahun, setTahun] = useState('2026');

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CHART_OF_ACCOUNTS.filter((a) => {
      const matchTipe = filterTipe === 'Semua' || a.tipe === filterTipe;
      const matchQ =
        !q || a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q);
      return matchTipe && matchQ;
    });
  }, [search, filterTipe]);

  return (
    <div className="p-6 space-y-5 print-area">
      {/* Header halaman (tidak ikut tercetak lewat .no-print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <BookMarked className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chart of Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daftar akun dan struktur akun perusahaan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton label="Cetak COA" />
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" /> Tambah Akun
          </button>
        </div>
      </div>

      {/* Kop cetak */}
      <PrintHeader judul="DAFTAR CHART OF ACCOUNT" periode={`Tahun Buku ${tahun}`} />

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
        <div className="flex-1 min-w-55">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Cari Akun
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kode akun atau nama akun..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Tipe Akun
          </label>
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Semua">Semua Tipe</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Tahun Buku
          </label>
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Info jumlah akun */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
        {ACCOUNT_TYPES.map((t) => {
          const total = CHART_OF_ACCOUNTS.filter((a) => a.tipe === t).length;
          return (
            <div key={t} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{total}</p>
            </div>
          );
        })}
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kode Akun</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nama Akun</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tipe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Saldo Normal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada akun yang cocok.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">
                        {a.kode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.nama}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{a.tipe}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{a.saldoNormal}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${a.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 no-print">
                      <button
                        title="Ubah akun"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Ubah
                      </button>
                      <button
                        title="Hapus akun"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tanda tangan cetak */}
      <div className="hidden print:block mt-8 text-xs">
        <div className="flex justify-between">
          <p>Jakarta, {formatTanggal(new Date().toISOString().slice(0, 10))}</p>
          <div className="text-center">
            <p>Mengetahui,</p>
            <p>Finance Manager</p>
            <div className="h-16" />
            <p className="underline">( ................................ )</p>
          </div>
        </div>
        <p className="mt-6">Dicetak dari Sistem Terintegrasi Aldigens — Total {rows.length} akun.</p>
      </div>
    </div>
  );
}
