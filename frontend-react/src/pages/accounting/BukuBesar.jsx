import React, { useMemo, useState } from 'react';
import { BookOpen, Search, Download } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  CHART_OF_ACCOUNTS, LEDGER_MUTATIONS, rupiah, formatTanggal,
} from '../../Data/mockAccounting';

export default function BukuBesar() {
  const [akun, setAkun] = useState(CHART_OF_ACCOUNTS[0].kode);
  const [dari, setDari] = useState('2026-01-01');
  const [sampai, setSampai] = useState('2026-12-31');
  const [q, setQ] = useState('');

  const akunTerpilih = useMemo(
    () => CHART_OF_ACCOUNTS.find((a) => a.kode === akun) || CHART_OF_ACCOUNTS[0],
    [akun]
  );

  const rows = useMemo(() => {
    const keyword = q.toLowerCase().trim();
    return LEDGER_MUTATIONS.filter((m) => {
      const dalamPeriode = m.tanggal >= dari && m.tanggal <= sampai;
      const matchQ =
        !keyword ||
        m.voucher.toLowerCase().includes(keyword) ||
        m.keterangan.toLowerCase().includes(keyword);
      return dalamPeriode && matchQ;
    });
  }, [dari, sampai, q]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);
  const saldoAkhir = rows.length ? rows[rows.length - 1].saldo : 0;

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
              Daftar mutasi per akun
            </p>
          </div>
        </div>
        <PrintButton label="Cetak Buku Besar" />
      </div>

      <PrintHeader
        judul="BUKU BESAR"
        periode={`${formatTanggal(dari)} - ${formatTanggal(sampai)}`}
      />

      {/* Filter akun & periode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pilih Akun</label>
          <select
            value={akun}
            onChange={(e) => setAkun(e.target.value)}
            className={inputCls}
          >
            {CHART_OF_ACCOUNTS.map((a) => (
              <option key={a.id} value={a.kode}>{a.kode} — {a.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Periode Dari</label>
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Periode Sampai</label>
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Kartu info akun */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kode Akun</p>
          <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{akunTerpilih.kode}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Nama Akun</p>
          <p className="font-bold text-slate-800 dark:text-white">{akunTerpilih.nama}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-emerald-600">Total Debit</p>
          <p className="font-bold text-emerald-700">{rupiah(totalDebit)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-rose-600">Total Kredit</p>
          <p className="font-bold text-rose-700">{rupiah(totalKredit)}</p>
        </div>
      </div>

      {/* Cari */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 no-print">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari No Voucher atau keterangan..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tanggal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">No. Voucher</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Keterangan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Debit</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kredit</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada mutasi pada periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatTanggal(m.tanggal)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{m.voucher}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{m.keterangan}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{m.debit ? rupiah(m.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">{m.kredit ? rupiah(m.kredit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">{rupiah(m.saldo)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{rupiah(totalDebit)}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{rupiah(totalKredit)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">{rupiah(saldoAkhir)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-2 no-print">
        <Download className="h-3.5 w-3.5" /> Logic pembukuan otomatis (perhitungan saldo dari jurnal) akan
        dihubungkan ke backend pada tahap berikutnya.
      </p>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
