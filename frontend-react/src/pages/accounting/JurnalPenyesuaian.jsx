import React, { useMemo, useState } from 'react';
import { FileStack, Plus, Search, CheckCircle2 } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
  ADJUSTMENT_JOURNALS, CHART_OF_ACCOUNTS, accountByKode, rupiah, formatTanggal,
} from '../../Data/mockAccounting';
import { swalSuccess, swalError } from '../../utils/swal';

const JENIS_ADJUSTMENT = [
  'Akrual',
  'Depresiasi',
  'Amortisasi',
  'Pendapatan Diterima Dimuka',
  'Beban Dibayar Dimuka',
  'Koreksi',
];

const emptyForm = () => ({
  id: '',
  tanggal: new Date().toISOString().slice(0, 10),
  tipe: 'Akrual',
  akun: '',
  keterangan: '',
  nominal: '',
});

export default function JurnalPenyesuaian() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);

  const daftar = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ADJUSTMENT_JOURNALS;
    return ADJUSTMENT_JOURNALS.filter(
      (j) => j.id.toLowerCase().includes(q) || j.keterangan.toLowerCase().includes(q) || j.tipe.toLowerCase().includes(q)
    );
  }, [search]);

  const handleBuat = () => {
    const next = String(ADJUSTMENT_JOURNALS.length + 1).padStart(3, '0');
    setForm({ ...emptyForm(), id: `AJ-${next}` });
  };

  const handleSimpan = () => {
    if (!form.akun || !form.keterangan.trim() || !Number(form.nominal)) {
      swalError('Validasi Gagal', 'Akun, keterangan, dan nominal wajib diisi.');
      return;
    }
    swalSuccess('Jurnal Penyesuaian Disimpan', `${form.id} tersimpan sebagai "Belum Posting".`);
    setForm(null);
  };

  return (
    <div className="p-6 space-y-5 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <FileStack className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jurnal Penyesuaian</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Penyesuaian akhir periode sebelum laporan keuangan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton label="Cetak Daftar" />
          <button
            onClick={handleBuat}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Buat Jurnal Penyesuaian
          </button>
        </div>
      </div>

      <PrintHeader judul="DAFTAR JURNAL PENYESUAIAN" periode="Periode 2026" />

      {/* Form buat (inline) */}
      {form && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm p-5 space-y-4 no-print">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Buat Jurnal Penyesuaian {form.id}
            </h3>
            <button onClick={() => setForm(null)} className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer">
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Jenis Penyesuaian</label>
              <select
                value={form.tipe}
                onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                className={inputCls}
              >
                {JENIS_ADJUSTMENT.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Akun</label>
              <select
                value={form.akun}
                onChange={(e) => setForm({ ...form, akun: e.target.value })}
                className={inputCls}
              >
                <option value="">-- Pilih Akun --</option>
                {CHART_OF_ACCOUNTS.map((a) => (
                  <option key={a.id} value={a.kode}>{a.kode} — {a.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nominal</label>
              <input
                type="number"
                min="0"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                placeholder="0"
                className={`${inputCls} text-right`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Keterangan</label>
            <input
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Uraian jurnal penyesuaian..."
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setForm(null)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSimpan}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              Simpan Jurnal
            </button>
          </div>
        </div>
      )}

      {/* Cari */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 no-print">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No Jurnal, Keterangan, atau Jenis..."
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">No Jurnal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tanggal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Jenis</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Akun</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Keterangan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nominal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {daftar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Belum ada jurnal penyesuaian.
                  </td>
                </tr>
              ) : (
                daftar.map((j) => {
                  const a = accountByKode(j.akun);
                  return (
                    <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{j.id}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatTanggal(j.tanggal)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{j.tipe}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{j.akun}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{a ? a.nama : '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-xs">{j.keterangan}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{rupiah(j.nominal)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${j.status === 'Sudah Posting'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                          {j.status === 'Sudah Posting' && <CheckCircle2 className="h-3 w-3" />}
                          {j.status}
                        </span>
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

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
