import React, { useEffect, useMemo, useState } from 'react';
import {
  NotebookPen, Plus, Search, Eye, Trash2, Save, CheckCircle2, XCircle, FileText,
} from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  JOURNAL_VOUCHERS, CHART_OF_ACCOUNTS, TRANSACTION_TYPES,
  accountByKode, rupiah, formatTanggal,
} from '../../Data/mockAccounting';
import { requestVoucherDetail, setSelectedVoucherId } from '../../Data/accountingStore';
import { swalSuccess, swalError, swalConfirm } from '../../utils/swal';

const emptyLine = () => ({ kode: '', memo: '', debit: '', kredit: '' });

export default function JurnalUmum() {
  const [view, setView] = useState('list'); // list | form
  const [search, setSearch] = useState('');

  /* ---- Header voucher ---- */
  const [form, setForm] = useState({
    noVoucher: '',
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: 'Penjualan',
    keterangan: '',
  });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (view !== 'form') return;
    const next = String(JOURNAL_VOUCHERS.length + 1).padStart(3, '0');
    setForm((f) => ({ ...f, noVoucher: `JV-${new Date().getFullYear()}-${next}` }));
    setLines([emptyLine(), emptyLine()]);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const totalDebit = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
    [lines]
  );
  const totalKredit = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.kredit) || 0), 0),
    [lines]
  );
  const selisih = totalDebit - totalKredit;
  const balanced = totalDebit > 0 && selisih === 0;

  const setLine = (idx, field, value) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, [field]: value };
        /* Debit & kredit tidak boleh terisi bersamaan (praktik pembukuan). */
        if (field === 'debit' && value) next.kredit = '';
        if (field === 'kredit' && value) next.debit = '';
        return next;
      })
    );
  };

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx) => setLines((p) => (p.length <= 2 ? p : p.filter((_, i) => i !== idx)));

  const validate = () => {
    const e = {};
    if (!form.noVoucher.trim()) e.noVoucher = 'No voucher wajib diisi';
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi';
    if (!form.keterangan.trim()) e.keterangan = 'Keterangan wajib diisi';

    const usable = lines.filter((l) => l.kode || Number(l.debit) || Number(l.kredit));
    if (usable.length < 2) e.lines = 'Minimal dua baris jurnal (debit & kredit)';
    usable.forEach((l, i) => {
      if (!l.kode) e[`line-${i}`] = 'Kode akun wajib dipilih';
      if (Number(l.debit) === 0 && Number(l.kredit) === 0) {
        e[`line-${i}`] = 'Nominal debit atau kredit harus diisi';
      }
    });

    if (totalDebit === 0) e.total = 'Total debit masih 0';
    if (selisih !== 0) {
      e.total = `Total Debit (${rupiah(totalDebit)}) harus sama dengan Total Kredit (${rupiah(totalKredit)})`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSimpanDraft = () => {
    if (totalDebit === 0) {
      setErrors({ total: 'Isi nominal jurnal sebelum menyimpan draft' });
      return;
    }
    swalSuccess('Draft Disimpan', `Voucher ${form.noVoucher} disimpan sebagai Draft (belum posting).`);
  };

  const handlePosting = () => {
    if (!validate()) {
      swalError('Validasi Gagal', 'Periksa kembali isian jurnal. Total Debit harus sama dengan Total Kredit.');
      return;
    }
    swalSuccess('Jurnal Diposting', `Voucher ${form.noVoucher} berhasil diposting ke buku besar.`);
    setView('list');
  };

  const handleBatal = () => {
    setView('list');
    setForm({ noVoucher: '', tanggal: new Date().toISOString().slice(0, 10), jenis: 'Penjualan', keterangan: '' });
    setLines([emptyLine(), emptyLine()]);
    setErrors({});
  };

  const handleHapus = async (v) => {
    const ok = await swalConfirm({
      title: 'Hapus Voucher?',
      text: `Voucher ${v.noVoucher} akan dihapus dari daftar.`,
      confirmText: 'Ya, Hapus',
      danger: true,
    });
    if (ok) swalSuccess('Dihapus', `Voucher ${v.noVoucher} telah dihapus.`);
  };

  const handleLihat = (v) => {
    setSelectedVoucherId(v.id);
    requestVoucherDetail(v.id);
    window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-voucher-detail' }));
  };

  const daftar = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return JOURNAL_VOUCHERS;
    return JOURNAL_VOUCHERS.filter(
      (v) =>
        v.noVoucher.toLowerCase().includes(q) ||
        v.keterangan.toLowerCase().includes(q) ||
        v.jenis.toLowerCase().includes(q)
    );
  }, [search]);

  /* =====================================================================
     DAFTAR JOURNAL VOUCHER
     ===================================================================== */
  if (view === 'list') {
    return (
      <div className="p-6 space-y-5 print-area">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
              <NotebookPen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jurnal Umum</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daftar Journal Voucher &mdash; Input Transaksi Jurnal Umum
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton label="Cetak Daftar" />
            <button
              onClick={() => setView('form')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Buat Voucher
            </button>
          </div>
        </div>

        <PrintHeader judul="DAFTAR JOURNAL VOUCHER" periode="Tahun Buku 2026" />

        {/* Ringkasan */}
        <div className="grid grid-cols-3 gap-3 no-print">
          <StatCard label="Total Voucher" value={JOURNAL_VOUCHERS.length} tone="slate" />
          <StatCard label="Sudah Posting" value={JOURNAL_VOUCHERS.filter((v) => v.status === 'Posted').length} tone="emerald" />
          <StatCard label="Draft" value={JOURNAL_VOUCHERS.filter((v) => v.status === 'Draft').length} tone="amber" />
        </div>

        {/* Cari */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 no-print">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No Voucher, Keterangan, atau Jenis Transaksi..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tabel daftar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">No Voucher</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Jenis Transaksi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Keterangan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Total Debit</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {daftar.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Tidak ada journal voucher yang cocok.
                    </td>
                  </tr>
                ) : (
                  daftar.map((v) => {
                    const d = v.lines.reduce((s, l) => s + l.debit, 0);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{v.noVoucher}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatTanggal(v.tanggal)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{v.jenis}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-xs truncate">{v.keterangan}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{rupiah(d)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${v.status === 'Posted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                              }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap no-print">
                          <button
                            onClick={() => handleLihat(v)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Lihat
                          </button>
                          <button
                            onClick={() => handleHapus(v)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================================
     FORM BUAT VOUCHER
     ===================================================================== */
  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <NotebookPen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buat Journal Voucher</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Input Transaksi Jurnal Umum</p>
          </div>
        </div>
        <PrintButton label="Cetak Voucher" />
      </div>

      <PrintHeader judul="JOURNAL VOUCHER" periode={formatTanggal(form.tanggal)} />

      {/* Info voucher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field label="No Voucher" error={errors.noVoucher}>
          <input
            value={form.noVoucher}
            onChange={(e) => setForm({ ...form, noVoucher: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Tanggal" error={errors.tanggal}>
          <input
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Jenis Transaksi" error={errors.jenis}>
          <select
            value={form.jenis}
            onChange={(e) => setForm({ ...form, jenis: e.target.value })}
            className={inputCls}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Keterangan" error={errors.keterangan}>
          <input
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            placeholder="Uraian transaksi..."
            className={inputCls}
          />
        </Field>
      </div>

      {/* Baris jurnal */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" /> Rincian Baris Jurnal
          </h3>
          <button
            onClick={addLine}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition text-xs font-semibold cursor-pointer no-print"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Baris
          </button>
        </div>

        {errors.lines && (
          <p className="px-5 py-2 text-xs font-semibold text-rose-600 bg-rose-50">{errors.lines}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-center px-3 py-3 w-12 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="text-left px-3 py-3 w-44 font-semibold text-slate-600 dark:text-slate-300">Kode Akun</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">Nama Akun</th>
                <th className="text-right px-3 py-3 w-40 font-semibold text-slate-600 dark:text-slate-300">Debit</th>
                <th className="text-right px-3 py-3 w-40 font-semibold text-slate-600 dark:text-slate-300">Kredit</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">Memo</th>
                <th className="text-center px-3 py-3 w-14 font-semibold text-slate-600 dark:text-slate-300 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((l, i) => {
                const akun = accountByKode(l.kode);
                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2 text-center text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        value={l.kode}
                        onChange={(e) => setLine(i, 'kode', e.target.value)}
                        className={`${inputCls} ${errors[`line-${i}`] ? 'border-rose-400' : ''}`}
                      >
                        <option value="">-- Pilih Akun --</option>
                        {CHART_OF_ACCOUNTS.map((a) => (
                          <option key={a.id} value={a.kode}>{a.kode} &mdash; {a.nama}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                      {akun ? akun.nama : <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={l.debit}
                        onChange={(e) => setLine(i, 'debit', e.target.value)}
                        placeholder="0"
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={l.kredit}
                        onChange={(e) => setLine(i, 'kredit', e.target.value)}
                        placeholder="0"
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={l.memo}
                        onChange={(e) => setLine(i, 'memo', e.target.value)}
                        placeholder="Keterangan baris..."
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-2 text-center no-print">
                      <button
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        title={lines.length <= 2 ? 'Minimal 2 baris' : 'Hapus baris'}
                        className="inline-flex p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                  TOTAL
                </td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">{rupiah(totalDebit)}</td>
                <td className="px-3 py-3 text-right font-bold text-rose-600">{rupiah(totalKredit)}</td>
                <td colSpan={2} className="px-3 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Validasi & tombol aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${balanced
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
        >
          {balanced ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span>
            Total Debit {rupiah(totalDebit)} &mdash; Total Kredit {rupiah(totalKredit)}
            {balanced ? ' (Seimbang)' : ` (Selisih ${rupiah(Math.abs(selisih))})`}
          </span>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleSimpanDraft}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" /> Simpan Draft
          </button>
          <button
            onClick={handlePosting}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition ${balanced
                ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
          >
            <CheckCircle2 className="h-4 w-4" /> Posting Jurnal
          </button>
          <button
            onClick={handleBatal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm cursor-pointer"
          >
            <XCircle className="h-4 w-4" /> Batal
          </button>
        </div>
      </div>

      {errors.total && (
        <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
          {errors.total}
        </p>
      )}

      {/* Area cetak voucher */}
      <div className="hidden print:block mt-6">
        <table className="w-full text-xs border border-slate-800">
          <thead>
            <tr>
              <th className="border border-slate-800 px-2 py-1">Kode Akun</th>
              <th className="border border-slate-800 px-2 py-1">Nama Akun</th>
              <th className="border border-slate-800 px-2 py-1">Memo</th>
              <th className="border border-slate-800 px-2 py-1 text-right">Debit</th>
              <th className="border border-slate-800 px-2 py-1 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {lines.filter((l) => l.kode).map((l, i) => {
              const a = accountByKode(l.kode);
              return (
                <tr key={i}>
                  <td className="border border-slate-800 px-2 py-1">{l.kode}</td>
                  <td className="border border-slate-800 px-2 py-1">{a ? a.nama : ''}</td>
                  <td className="border border-slate-800 px-2 py-1">{l.memo}</td>
                  <td className="border border-slate-800 px-2 py-1 text-right">{Number(l.debit || 0).toLocaleString('id-ID')}</td>
                  <td className="border border-slate-800 px-2 py-1 text-right">{Number(l.kredit || 0).toLocaleString('id-ID')}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={3} className="border border-slate-800 px-2 py-1 text-right font-bold">TOTAL</td>
              <td className="border border-slate-800 px-2 py-1 text-right font-bold">{totalDebit.toLocaleString('id-ID')}</td>
              <td className="border border-slate-800 px-2 py-1 text-right font-bold">{totalKredit.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-between mt-6 text-xs">
          <p>Jakarta, {formatTanggal(form.tanggal)}</p>
          <div className="text-center">
            <p>Dibuat oleh,</p><div className="h-14" /><p className="underline">( ................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helper kecil ---------- */
const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white',
    emerald: 'bg-emerald-50 dark:bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 dark:bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`border rounded-2xl p-4 shadow-sm text-center ${tones[tone]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
