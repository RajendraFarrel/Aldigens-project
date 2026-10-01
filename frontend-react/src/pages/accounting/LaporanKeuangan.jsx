import React, { useMemo, useState } from 'react';
import { FileBarChart, TrendingUp, Scale, NotebookPen, BookOpen } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  INCOME_STATEMENT, BALANCE_SHEET, JOURNAL_VOUCHERS, LEDGER_MUTATIONS,
  accountByKode, rupiah, formatTanggal,
} from '../../Data/mockAccounting';

const TABS = [
  { key: 'laba-rugi', label: 'Laporan Laba Rugi', icon: TrendingUp },
  { key: 'neraca', label: 'Neraca', icon: Scale },
  { key: 'jurnal', label: 'Laporan Jurnal', icon: NotebookPen },
  { key: 'buku-besar', label: 'Buku Besar', icon: BookOpen },
];

export default function LaporanKeuangan() {
  const [tab, setTab] = useState('laba-rugi');
  const [periode, setPeriode] = useState('2026-01');

  const totalPendapatan = useMemo(
    () => INCOME_STATEMENT.pendapatan.reduce((s, r) => s + r.nilai, 0),
    []
  );
  const totalHPP = useMemo(() => INCOME_STATEMENT.hpp.reduce((s, r) => s + r.nilai, 0), []);
  const totalBeban = useMemo(() => INCOME_STATEMENT.beban.reduce((s, r) => s + r.nilai, 0), []);
  const labaKotor = totalPendapatan - totalHPP;
  const labaBersih = labaKotor - totalBeban;

  const totalAset = useMemo(() => BALANCE_SHEET.aset.reduce((s, r) => s + r.nilai, 0), []);
  const totalKewajiban = useMemo(() => BALANCE_SHEET.kewajiban.reduce((s, r) => s + r.nilai, 0), []);
  const totalEkuitas = useMemo(() => BALANCE_SHEET.ekuitas.reduce((s, r) => s + r.nilai, 0), []);
  const totalPasiva = totalKewajiban + totalEkuitas;
  const neracaSeimbang = totalAset === totalPasiva;

  const activeTabMeta = TABS.find((t) => t.key === tab);
  const Judul = activeTabMeta?.label || 'Laporan Keuangan';

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
              Laporan Laba Rugi, Neraca, Laporan Jurnal, dan Buku Besar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026-01">Januari 2026</option>
            <option value="2026-02">Februari 2026</option>
            <option value="2026-03">Maret 2026</option>
          </select>
          <PrintButton label="Cetak Laporan" />
        </div>
      </div>

      {/* Tab */}
      <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 no-print">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-40 py-2 rounded-lg text-sm font-medium transition cursor-pointer inline-flex items-center justify-center gap-2 ${tab === t.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <PrintHeader judul={Judul.toUpperCase()} periode={`Periode ${periode}`} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        {/* ---------------- Laporan Laba Rugi ---------------- */}
        {tab === 'laba-rugi' && (
          <>
            <h3 className="text-center font-bold text-slate-900 dark:text-white mb-1">LAPORAN LABA RUGI</h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-5">
              Untuk Periode {formatTanggal(`${periode}-01`)}
            </p>

            <Section title="PENDAPATAN">
              {INCOME_STATEMENT.pendapatan.map((r) => (
                <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
              ))}
              <Row bold label="Total Pendapatan" nilai={rupiah(totalPendapatan)} />
            </Section>

            <Section title="HARGA POKOK PENJUALAN">
              {INCOME_STATEMENT.hpp.map((r) => (
                <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
              ))}
              <Row bold label="Laba Kotor" nilai={rupiah(labaKotor)} />
            </Section>

            <Section title="BEBAN OPERASIONAL">
              {INCOME_STATEMENT.beban.map((r) => (
                <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
              ))}
              <Row bold label="Total Beban" nilai={rupiah(totalBeban)} />
            </Section>

            <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-50 border border-indigo-200 flex justify-between font-bold text-indigo-700">
              <span>LABA BERSIH</span>
              <span>{rupiah(labaBersih)}</span>
            </div>
          </>
        )}

        {/* ---------------- Neraca ---------------- */}
        {tab === 'neraca' && (
          <>
            <h3 className="text-center font-bold text-slate-900 dark:text-white mb-1">NERACA</h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-5">
              Per {formatTanggal(`${periode}-28`)}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-1 mb-2">ASET</h4>
                {BALANCE_SHEET.aset.map((r) => (
                  <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
                ))}
                <Row bold label="Total Aset" nilai={rupiah(totalAset)} />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-1 mb-2">KEWAJIBAN</h4>
                {BALANCE_SHEET.kewajiban.map((r) => (
                  <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
                ))}
                <Row bold label="Total Kewajiban" nilai={rupiah(totalKewajiban)} />

                <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-1 mb-2 mt-4">EKUITAS</h4>
                {BALANCE_SHEET.ekuitas.map((r) => (
                  <Row key={r.akun} kode={r.akun} nama={r.nama} nilai={rupiah(r.nilai)} />
                ))}
                <Row bold label="Total Ekuitas" nilai={rupiah(totalEkuitas)} />
                <Row bold label="Total Pasiva" nilai={rupiah(totalPasiva)} />
              </div>
            </div>

            <p className={`mt-4 text-center text-sm font-bold ${neracaSeimbang ? 'text-emerald-600' : 'text-rose-600'}`}>
              {neracaSeimbang
                ? '✓ Neraca seimbang: Total Aset = Total Pasiva'
                : `Total Aset (${rupiah(totalAset)}) ≠ Total Pasiva (${rupiah(totalPasiva)})`}
            </p>
          </>
        )}

        {/* ---------------- Laporan Jurnal ---------------- */}
        {tab === 'jurnal' && (
          <>
            <h3 className="text-center font-bold text-slate-900 dark:text-white mb-1">LAPORAN JURNAL</h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Periode {periode}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Tanggal</th>
                    <th className="px-3 py-2 text-left font-bold">No. Voucher</th>
                    <th className="px-3 py-2 text-left font-bold">Kode Akun</th>
                    <th className="px-3 py-2 text-left font-bold">Nama Akun</th>
                    <th className="px-3 py-2 text-left font-bold">Keterangan</th>
                    <th className="px-3 py-2 text-right font-bold">Debit</th>
                    <th className="px-3 py-2 text-right font-bold">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURNAL_VOUCHERS.map((v) =>
                    v.lines.map((l, i) => {
                      const a = accountByKode(l.kode);
                      return (
                        <tr key={`${v.id}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-1.5">{i === 0 ? formatTanggal(v.tanggal) : ''}</td>
                          <td className="px-3 py-1.5 font-mono">{i === 0 ? v.noVoucher : ''}</td>
                          <td className="px-3 py-1.5 font-mono">{l.kode}</td>
                          <td className="px-3 py-1.5">{a ? a.nama : '-'}</td>
                          <td className="px-3 py-1.5">{i === 0 ? v.keterangan : ''}</td>
                          <td className="px-3 py-1.5 text-right">{l.debit ? rupiah(l.debit) : '-'}</td>
                          <td className="px-3 py-1.5 text-right">{l.kredit ? rupiah(l.kredit) : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- Buku Besar ---------------- */}
        {tab === 'buku-besar' && (
          <>
            <h3 className="text-center font-bold text-slate-900 dark:text-white mb-1">BUKU BESAR</h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Periode {periode}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Tanggal</th>
                    <th className="px-3 py-2 text-left font-bold">No. Voucher</th>
                    <th className="px-3 py-2 text-left font-bold">Keterangan</th>
                    <th className="px-3 py-2 text-right font-bold">Debit</th>
                    <th className="px-3 py-2 text-right font-bold">Kredit</th>
                    <th className="px-3 py-2 text-right font-bold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {LEDGER_MUTATIONS.map((m, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-1.5">{formatTanggal(m.tanggal)}</td>
                      <td className="px-3 py-1.5 font-mono">{m.voucher}</td>
                      <td className="px-3 py-1.5">{m.keterangan}</td>
                      <td className="px-3 py-1.5 text-right">{m.debit ? rupiah(m.debit) : '-'}</td>
                      <td className="px-3 py-1.5 text-right">{m.kredit ? rupiah(m.kredit) : '-'}</td>
                      <td className="px-3 py-1.5 text-right font-bold">{rupiah(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tanda tangan */}
        <div className="flex justify-between mt-10 text-xs pt-6 border-t border-slate-200 dark:border-slate-700">
          <p>Jakarta, {formatTanggal(new Date().toISOString().slice(0, 10))}</p>
          <div className="text-center">
            <p>Mengetahui,</p>
            <p>Finance Manager</p>
            <div className="h-16" />
            <p className="underline">( ................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-1 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ kode, nama, nilai, bold, label }) {
  return (
    <div
      className={`flex justify-between py-1 text-sm ${bold ? 'font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 mt-1 pt-2' : 'text-slate-700 dark:text-slate-300'
        }`}
    >
      <span>
        {kode && <span className="font-mono text-xs text-slate-400 mr-2">{kode}</span>}
        {label || nama}
      </span>
      <span>{nilai}</span>
    </div>
  );
}
