import React, { useCallback, useEffect, useState } from 'react';
import { Scale, RefreshCw } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import { getNeracaSaldo, ACCOUNT_TYPES, rupiah, angka, formatTanggal, periodeDefault } from '../../services/accountingApi';
import { swalError } from '../../utils/swal';

/**
 * Neraca Saldo — dihitung otomatis dari jurnal POSTED.
 * Tidak dapat diedit manual.
 */
export default function NeracaSaldo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipe, setTipe] = useState('Semua');
  const [periode, setPeriode] = useState(periodeDefault());

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getNeracaSaldo({
        from: periode.from,
        to: periode.to,
        tipe,
      });
      setData(res);
    } catch (err) {
      swalError('Gagal memuat neraca saldo', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, [periode, tipe]);

  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Neraca Saldo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dihitung otomatis dari jurnal yang sudah diposting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={muat}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
          <PrintButton label="Cetak Neraca Saldo" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipe Akun</label>
          <select value={tipe} onChange={(e) => setTipe(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            <option value="Semua">Semua</option>
            {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Dari</label>
          <input type="date" value={periode.from} onChange={(e) => setPeriode({ ...periode, from: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Sampai</label>
          <input type="date" value={periode.to} onChange={(e) => setPeriode({ ...periode, to: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
        </div>
      </div>

      <PrintHeader
        judul="NERACA SALDO"
        periode={`${formatTanggal(periode.from)} - ${formatTanggal(periode.to)}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Debit</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(data?.total_debit)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Kredit</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(data?.total_kredit)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Selisih Mutasi</p>
                            <p className={`text-sm font-bold ${data?.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                {rupiah(data?.selisih)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Status Jurnal</p>
                            <p className={`text-sm font-bold ${data?.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                {data?.balanced ? 'BALANCE' : 'TIDAK BALANCE'}
                            </p>
                        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Nomor Akun</th>
                <th className="px-4 py-3 text-left">Nama Akun</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat neraca saldo...</td></tr>}
              {!loading && (data?.rows?.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada akun. Tambahkan Chart of Account terlebih dahulu.
                </td></tr>
              )}
              {(data?.rows || []).map((r) => (
                <tr key={r.account_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{r.nomor_akun}</td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{r.nama_akun}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{r.tipe_akun}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{r.debit ? angka(r.debit) : ''}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{r.kredit ? angka(r.kredit) : ''}</td>
                </tr>
              ))}
            </tbody>
            {data?.rows?.length > 0 && (
                            <tr className="bg-slate-50 dark:bg-slate-800/60 border-t">
                                <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold">Total Mutasi Jurnal</td>
                                <td className="px-4 py-2 text-right text-xs font-semibold whitespace-nowrap">{angka(data.mutasi_debit)}</td>
                                <td className="px-4 py-2 text-right text-xs font-semibold whitespace-nowrap">{angka(data.mutasi_kredit)}</td>
                            </tr>
                        )}
                        {data?.rows?.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">TOTAL SALDO</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(data.total_debit)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(data.total_kredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="hidden print:block mt-6 text-xs">
        <div className="flex justify-between">
          <p>Jakarta, {formatTanggal(new Date().toISOString().slice(0, 10))}</p>
          <div className="text-center">
            <p>Mengetahui,</p><p>Finance Manager</p><div className="h-16" />
            <p className="underline">( ................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}