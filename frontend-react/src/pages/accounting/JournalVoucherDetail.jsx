import React, { useCallback, useEffect, useState } from 'react';
import { FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import { getVoucher, rupiah, angka, formatTanggal, formatTanggalPanjang, VOUCHER_TEMPLATES } from '../../services/accountingApi';
import { consumeVoucherDetailRequest } from '../../Data/accountingStore';
import { swalError } from '../../utils/swal';

/**
 * Dokumen cetak Journal Voucher.
 *
 * Field header mengikuti template dokumen Aldigens per jenis voucher
 * (mis. Voucher Pembelian memuat Supplier & PO Number,
 *  Voucher Bank Keluar memuat "Dibayar Kepada" & Kas/Bank).
 */
export default function JournalVoucherDetail() {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  const muat = useCallback(async () => {
    const id = consumeVoucherDetailRequest();
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await getVoucher(id);
      setVoucher(data);
    } catch (err) {
      swalError('Gagal memuat detail voucher', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Memuat voucher...</div>;

  if (!voucher) {
    return (
      <div className="p-6 space-y-4 print-area">
        <div className="flex items-center justify-between no-print">
          <p className="text-sm text-slate-500">Belum ada voucher yang dipilih.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-journal' }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
        </div>
      </div>
    );
  }

  const templateFields = VOUCHER_TEMPLATES[voucher.jenis] || [
    { key: 'pihak_terkait', label: 'Pihak Terkait' },
  ];
  const lines = voucher.lines || [];
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalKredit = lines.reduce((s, l) => s + Number(l.kredit || 0), 0);
  const balanced = Math.abs(totalDebit - totalKredit) < 0.009;

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detail Journal Voucher</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen siap cetak untuk {voucher.no_voucher}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={muat}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-journal' }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <PrintButton label="Cetak Voucher" />
        </div>
      </div>

      <PrintHeader judul={voucher.jenis.toUpperCase()} periode={formatTanggalPanjang(voucher.tanggal)} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        {/* Identitas dokumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 text-sm border-b border-slate-200 dark:border-slate-700">
          <Meta label="No Voucher" value={voucher.no_voucher} mono />
          <Meta label="Tanggal" value={formatTanggal(voucher.tanggal)} />
          <Meta label="Jenis Voucher" value={voucher.jenis} />
          <Meta label="Status" value={voucher.status} />
        </div>

        {/* Field khusus per template dokumen Aldigens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-sm border-b border-slate-200 dark:border-slate-700">
          {templateFields.map((f) => (
            <Meta key={f.key} label={f.label} value={voucher[f.key] || '-'} />
          ))}
          <Meta label="Referensi" value={voucher.no_referensi || '-'} />
        </div>

        <div className="py-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Keterangan</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{voucher.keterangan || '-'}</p>
        </div>

        {/* Tabel jurnal */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold">Nomor Akun</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Nama Akun</th>
                <th className="px-3 py-2 text-left text-xs font-bold">Memo</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Debit</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id ?? i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs">{l.nomor_akun}</td>
                  <td className="px-3 py-2 text-xs">{l.nama_akun}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{l.memo || '-'}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">
                    {Number(l.debit) ? angka(l.debit) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">
                    {Number(l.kredit) ? angka(l.kredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold">TOTAL</td>
                <td className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">{rupiah(totalDebit)}</td>
                <td className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">{rupiah(totalKredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={`mt-3 text-xs font-semibold ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>
          {balanced
            ? `Jurnal seimbang: Total Debit = Total Kredit (${rupiah(totalDebit)})`
            : `Jurnal belum seimbang. Selisih ${rupiah(Math.abs(totalDebit - totalKredit))}`}
        </div>

        {/* Tanda tangan sesuai dokumen Aldigens */}
        <div className="grid grid-cols-3 gap-4 mt-12 text-xs text-center">
          <Sig role="Dibuat Oleh" />
          <Sig role="Disetujui Oleh" />
          <Sig role="Diterima Oleh" />
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
        {value || '-'}
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