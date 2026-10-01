import React, { useMemo, useState } from 'react';
import { Scale, CheckCircle2, XCircle } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import { TRIAL_BALANCE_ROWS, rupiah } from '../../Data/mockAccounting';

export default function NeracaSaldo() {
  const [periode, setPeriode] = useState('2026-01');

  const rows = useMemo(() => {
    // Gabungkan akun dengan kode sama (mis. akun Hutang/Piutang pada kode yang sama).
    const map = new Map();
    TRIAL_BALANCE_ROWS.forEach((r) => {
      const key = `${r.kode} ${r.nama}`;
      const prev = map.get(key) || { ...r, debit: 0, kredit: 0 };
      prev.debit += r.debit;
      prev.kredit += r.kredit;
      map.set(key, prev);
    });
    return [...map.values()];
  }, []);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);
  const selisih = totalDebit - totalKredit;
  const seimbang = selisih === 0;

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
              Rekap saldo seluruh akun periode berjalan
            </p>
          </div>
        </div>
        <PrintButton label="Cetak Neraca Saldo" />
      </div>

      <PrintHeader judul="NERACA SALDO" periode={`Periode ${periode}`} />

      {/* Periode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Periode</label>
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${seimbang
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
        >
          {seimbang ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {seimbang ? 'Debit = Kredit (Seimbang)' : `Selisih ${rupiah(Math.abs(selisih))}`}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kode Akun</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nama Akun</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Debit</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kredit</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => {
                const total = (r.debit || 0) - (r.kredit || 0);
                return (
                  <tr key={`${r.kode}-${r.nama}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">
                        {r.kode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.nama}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{r.debit ? rupiah(r.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">{r.kredit ? rupiah(r.kredit) : '-'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${total >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600'}`}>
                      {rupiah(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{rupiah(totalDebit)}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{rupiah(totalKredit)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                  {rupiah(totalDebit - totalKredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 no-print">
        Catatan: nilai Neraca Saldo pada tahap ini masih data contoh. Perhitungan otomatis dari jurnal
        berposting akan dibuat setelah backend akuntansi tersedia.
      </p>
    </div>
  );
}
