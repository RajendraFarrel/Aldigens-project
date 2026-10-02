import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import { getAccounts, getBukuBesar, rupiah, angka, formatTanggal, periodeDefault } from '../../services/accountingApi';
import { swalError } from '../../utils/swal';

/**
 * Buku Besar — dibangun dari jurnal POSTED.
 * Saldo dihitung dari saldo awal COA + mutasi jurnal, mengikuti saldo normal akun.
 */
export default function BukuBesar() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [periode, setPeriode] = useState(periodeDefault());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await getAccounts();
        const list = res.filter((a) => !a.is_header);
        setAccounts(list);
        if (list.length && !accountId) setAccountId(String(list[0].id));
      } catch (err) {
        swalError('Gagal memuat daftar akun', err.response?.data?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const muat = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data: res } = await getBukuBesar({
        account_id: accountId,
        from: periode.from,
        to: periode.to,
      });
      setData(res);
    } catch (err) {
      swalError('Gagal memuat buku besar', err.response?.data?.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, periode]);

  useEffect(() => { muat(); }, [muat]);

  const badgeSaldo = (v) => (
    <span className={`text-xs font-semibold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {v >= 0 ? '' : '(-)'}{angka(Math.abs(v))}
    </span>
  );

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buku Besar</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mutasi akun dari jurnal yang sudah diposting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={muat}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
          <PrintButton label="Cetak Buku Besar" />
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
        <div className="flex-1 min-w-60">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nomor Akun</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
            {accounts.length === 0 && <option value="">Belum ada akun</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.nomor_akun} — {a.nama_akun}</option>
            ))}
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
        judul="BUKU BESAR"
        periode={data
          ? `${data.account.nomor_akun} — ${data.account.nama_akun} | ${formatTanggal(periode.from)} - ${formatTanggal(periode.to)}`
          : ''}
      />

      {accounts.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Chart of Account masih kosong. Tambahkan akun terlebih dahulu sebelum membuka buku besar.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Awal</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(Math.abs(data.saldo_awal))}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Debit</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(data.total_debit)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Kredit</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(data.total_kredit)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Akhir</p>
              <p className={`text-sm font-bold ${data.saldo_akhir >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {rupiah(Math.abs(data.saldo_akhir))}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase">
                  <tr>
                    <th className="px-3 py-3 text-left">Tanggal</th>
                    <th className="px-3 py-3 text-left">No. Voucher</th>
                    <th className="px-3 py-3 text-left">Keterangan</th>
                    <th className="px-3 py-3 text-right">Debit</th>
                    <th className="px-3 py-3 text-right">Kredit</th>
                    <th className="px-3 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Memuat buku besar...</td></tr>}
                  {!loading && data.mutasi.length === 1 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Belum ada mutasi pada periode ini.</td></tr>
                  )}
                  {!loading && data.mutasi.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(m.tanggal)}</td>
                      <td className="px-3 py-2 font-mono">{m.no_voucher}</td>
                      <td className="px-3 py-2">{m.keterangan || '-'}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{m.debit ? angka(m.debit) : ''}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{m.kredit ? angka(m.kredit) : ''}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{badgeSaldo(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.mutasi.length > 1 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-right">TOTAL</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">{angka(data.total_debit)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">{angka(data.total_kredit)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">{angka(Math.abs(data.saldo_akhir))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="hidden print:block mt-6 text-xs space-y-8">
            <div className="flex justify-between">
              <p>Jakarta, {formatTanggal(new Date().toISOString().slice(0, 10))}</p>
              <div className="text-center">
                <p>Mengetahui,</p><p>Finance Manager</p><div className="h-16" />
                <p className="underline">( ................................ )</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}