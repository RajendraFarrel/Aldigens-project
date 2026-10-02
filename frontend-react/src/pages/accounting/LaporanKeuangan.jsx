import React, { useCallback, useEffect, useState } from 'react';
import { FileBarChart, RefreshCw, AlertTriangle } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  getLabaRugi, getNeraca, rupiah, angka, formatTanggal, periodeDefault,
} from '../../services/accountingApi';
import { swalError } from '../../utils/swal';

/**
 * Laporan Keuangan: Laba Rugi dan Neraca.
 *
 * Semua angka berasal dari jurnal POSTED. Bila COA atau saldo awal belum
 * disiapkan, sistem menampilkan peringatan dan TIDAK menampilkan laporan
 * seolah-olah valid.
 */
export default function LaporanKeuangan() {
  const [tab, setTab] = useState('laba-rugi');
  const [periode, setPeriode] = useState(periodeDefault());
  const [labaRugi, setLabaRugi] = useState(null);
  const [neraca, setNeraca] = useState(null);
  const [loading, setLoading] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: periode.from, to: periode.to };
      const [lr, nr] = await Promise.all([getLabaRugi(params), getNeraca(params)]);
      setLabaRugi(lr.data);
      setNeraca(nr.data);
    } catch (err) {
      swalError('Gagal memuat laporan keuangan', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { muat(); }, [muat]);

  const periodeLabel = `${formatTanggal(periode.from)} - ${formatTanggal(periode.to)}`;
  const semuaPeringatan = [...(labaRugi?.peringatan || []), ...(neraca?.peringatan || [])];

  const Baris = ({ label, items, total, totalLabel }) => (
    <div className="mb-5">
      <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">{label}</h4>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 && (
            <tr><td colSpan={2} className="py-2 text-slate-400 text-xs">Tidak ada akun.</td></tr>
          )}
          {items.map((a, i) => (
            <tr key={a.account_id ?? i}>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                {a.nomor_akun !== '-' && <span className="font-mono text-xs text-slate-400 mr-2">{a.nomor_akun}</span>}
                {a.nama_akun}
              </td>
              <td className="py-2 text-right whitespace-nowrap text-slate-800 dark:text-slate-100">{angka(a.saldo)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
          <tr>
            <td className="py-2 text-right">{totalLabel}</td>
            <td className="py-2 text-right whitespace-nowrap">{angka(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Keuangan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dihitung dari Chart of Account, saldo awal, dan jurnal yang sudah diposting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={muat}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
          <PrintButton label="Cetak Laporan" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 no-print">
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

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 no-print">
        {[
          { k: 'laba-rugi', label: 'Laporan Laba Rugi' },
          { k: 'neraca', label: 'Neraca' },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer
                            ${tab === t.k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Peringatan konfigurasi */}
      {semuaPeringatan.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 no-print">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Laporan belum dapat dianggap final
          </p>
          <ul className="list-disc pl-6 mt-1 space-y-0.5">
            {semuaPeringatan.map((p, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300">{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- LABA RUGI ---------- */}
      {tab === 'laba-rugi' && labaRugi && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <PrintHeader judul="LAPORAN LABA RUGI" periode={periodeLabel} />

          <Baris label="Pendapatan" items={labaRugi.pendapatan}
            total={labaRugi.total_pendapatan} totalLabel="Total Pendapatan" />
          <Baris label="Harga Pokok Penjualan" items={labaRugi.harga_pokok}
            total={labaRugi.total_hpp} totalLabel="Total HPP" />
          <Baris label="Beban" items={labaRugi.beban}
            total={labaRugi.total_beban} totalLabel="Total Beban" />

          <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-3 space-y-1">
            <div className="flex justify-between text-sm font-semibold">
              <span>Laba Kotor</span>
              <span>{rupiah(labaRugi.laba_kotor)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>LABA / RUGI BERSIH</span>
              <span className={labaRugi.laba_bersih >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {rupiah(labaRugi.laba_bersih)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------- NERACA ---------- */}
      {tab === 'neraca' && neraca && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <PrintHeader judul="NERACA (LAPORAN POSISI KEUANGAN)" periode={periodeLabel} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">ASET</h4>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {neraca.aset.length === 0 && <tr><td className="py-2 text-slate-400 text-xs">Tidak ada akun.</td></tr>}
                  {neraca.aset.map((a, i) => (
                    <tr key={a.account_id ?? i}>
                      <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                        <span className="font-mono text-xs text-slate-400 mr-2">{a.nomor_akun}</span>{a.nama_akun}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">{angka(a.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  <tr><td className="py-2 text-right">Total Aset</td><td className="py-2 text-right whitespace-nowrap">{angka(neraca.total_aset)}</td></tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">KEWAJIBAN</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {neraca.kewajiban.length === 0 && <tr><td className="py-2 text-slate-400 text-xs">Tidak ada akun.</td></tr>}
                    {neraca.kewajiban.map((a, i) => (
                      <tr key={a.account_id ?? i}>
                        <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                          <span className="font-mono text-xs text-slate-400 mr-2">{a.nomor_akun}</span>{a.nama_akun}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{angka(a.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                    <tr><td className="py-2 text-right">Total Kewajiban</td><td className="py-2 text-right whitespace-nowrap">{angka(neraca.total_kewajiban)}</td></tr>
                  </tfoot>
                </table>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">EKUITAS</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {neraca.ekuitas.length === 0 && <tr><td className="py-2 text-slate-400 text-xs">Tidak ada akun.</td></tr>}
                    {neraca.ekuitas.map((a, i) => (
                      <tr key={a.account_id ?? i}>
                        <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                          {a.nomor_akun !== '-' && <span className="font-mono text-xs text-slate-400 mr-2">{a.nomor_akun}</span>}{a.nama_akun}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{angka(a.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                    <tr><td className="py-2 text-right">Total Ekuitas</td><td className="py-2 text-right whitespace-nowrap">{angka(neraca.total_ekuitas)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t-2 border-slate-300 dark:border-slate-700 pt-3 space-y-1">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Pasiva (Kewajiban + Ekuitas)</span>
              <span>{rupiah(neraca.total_kewajiban + neraca.total_ekuitas)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{neraca.balanced ? 'NERACA SEIMBANG' : 'NERACA TIDAK SEIMBANG'}</span>
              <span className={neraca.balanced ? 'text-emerald-600' : 'text-red-600'}>
                Selisih {rupiah(Math.abs(neraca.selisih))}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-slate-400">Memuat laporan...</p>
      )}

      <div className="hidden print:block mt-8 text-xs">
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