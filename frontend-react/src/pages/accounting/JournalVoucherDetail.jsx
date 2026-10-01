import React, { useMemo } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  JOURNAL_VOUCHERS, accountByKode, rupiah, formatTanggal,
} from '../../Data/mockAccounting';
import { getSelectedVoucherId } from '../../Data/accountingStore';

export default function JournalVoucherDetail() {
  const voucher = useMemo(() => {
    const id = getSelectedVoucherId();
    return JOURNAL_VOUCHERS.find((v) => v.id === id) || JOURNAL_VOUCHERS[0];
  }, []);

  const totalDebit = voucher.lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = voucher.lines.reduce((s, l) => s + l.kredit, 0);

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Detail Journal Voucher
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen cetak Journal Voucher
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-journal' }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <PrintButton label="Cetak Voucher" />
        </div>
      </div>

      <PrintHeader judul="JOURNAL VOUCHER" periode={formatTanggal(voucher.tanggal)} />

      {/* Kop dokumen */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">JURNAL VOUCHER</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">PT. Aldigens Putera Persada</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-sm border-b border-slate-200 dark:border-slate-700">
          <Meta label="No Voucher" value={voucher.noVoucher} mono />
          <Meta label="Tanggal" value={formatTanggal(voucher.tanggal)} />
          <Meta label="Jenis Transaksi" value={voucher.jenis} />
          <Meta label="Status" value={voucher.status} />
        </div>

        <div className="py-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Keterangan</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{voucher.keterangan}</p>
        </div>

        {/* Tabel jurnal */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold">Kode Akun</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Nama Akun</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Memo</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Debit</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {voucher.lines.map((l, i) => {
                const a = accountByKode(l.kode);
                return (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-mono text-xs">{l.kode}</td>
                    <td className="px-3 py-2 text-xs">{a ? a.nama : '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{l.memo || '-'}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold">{l.debit ? rupiah(l.debit) : '-'}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold">{l.kredit ? rupiah(l.kredit) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold">TOTAL</td>
                <td className="px-3 py-2 text-right text-xs font-bold text-emerald-600">{rupiah(totalDebit)}</td>
                <td className="px-3 py-2 text-right text-xs font-bold text-rose-600">{rupiah(totalKredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 text-xs text-emerald-600 font-semibold">
          ✓ Jurnal seimbang: Total Debit = Total Kredit ({rupiah(totalDebit)})
        </p>

        {/* Tanda tangan */}
        <div className="grid grid-cols-3 gap-4 mt-10 text-xs text-center">
          <Sig role="Dibuat oleh" />
          <Sig role="Diperiksa oleh" />
          <Sig role="Disetujui oleh" />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`font-semibold text-slate-800 dark:text-slate-100 ${mono ? 'font-mono text-indigo-600 dark:text-indigo-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function Sig({ role }) {
  return (
    <div>
      <p>{role},</p>
      <div className="h-16" />
      <p className="underline">( ................................ )</p>
    </div>
  );
}
