import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileStack, Plus, RefreshCw, Eye, Undo2, Pencil, CheckCircle2, Trash2 } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import JournalVoucherForm from '../../components/accounting/JournalVoucherForm';
import {
  getVouchers, getVoucher, postVoucher, reverseVoucher, deleteVoucher,
  rupiah, angka, formatTanggal,
} from '../../services/accountingApi';
import { requestVoucherDetail } from '../../Data/accountingStore';
import { swalSuccess, swalError, swalConfirm } from '../../utils/swal';

/**
 * Jurnal Penyesuaian.
 *
 * Menggunakan alur yang sama dengan Journal Voucher: draft, validasi
 * debit-kredit berpasangan, dan posting. Setelah diposting, jurnal otomatis
 * masuk ke Rekap Jurnal, Buku Besar, dan Neraca Saldo karena sumber datanya sama.
 */
export default function JurnalPenyesuaian() {
  const [tab, setTab] = useState('daftar');
  const [formEdit, setFormEdit] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getVouchers({ tipe: 'PENYESUAIAN', per_page: 200 });
      setItems(data.data || []);
    } catch (err) {
      swalError('Gagal memuat jurnal penyesuaian', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const daftar = useMemo(
    () => items.filter((v) => !filterStatus || v.status === filterStatus),
    [items, filterStatus]
  );

  const posting = async (v) => {
    const ok = await swalConfirm({
      title: `Posting ${v.no_voucher}?`,
      text: 'Jurnal penyesuaian akan langsung memengaruhi Buku Besar dan Neraca Saldo.',
      confirmText: 'Ya, Posting',
    });
    if (!ok) return;
    try {
      const { data } = await postVoucher(v.id);
      swalSuccess(data.message || 'Jurnal penyesuaian berhasil diposting.');
      muat();
    } catch (err) {
      swalError('Posting gagal', err.response?.data?.message);
    }
  };

  const reversal = async (v) => {
    const Swal = (await import('sweetalert2')).default;
    const { value: alasan } = await Swal.fire({
      title: `Reversal ${v.no_voucher}`,
      input: 'textarea',
      inputLabel: 'Alasan reversal (wajib)',
      inputValidator: (val) => (!val || val.trim() === '') ? 'Alasan wajib diisi.' : undefined,
      showCancelButton: true,
      confirmButtonText: 'Buat Reversal',
    });
    if (!alasan) return;
    try {
      const { data } = await reverseVoucher(v.id, alasan);
      swalSuccess(data.message || 'Reversal berhasil dibuat.');
      muat();
    } catch (err) {
      swalError('Reversal gagal', err.response?.data?.message);
    }
  };

  const hapusDraft = async (v) => {
    const ok = await swalConfirm({ title: `Hapus ${v.no_voucher}?`, confirmText: 'Hapus', danger: true });
    if (!ok) return;
    try {
      await deleteVoucher(v.id);
      swalSuccess('Jurnal draft dihapus.');
      muat();
    } catch (err) {
      swalError('Gagal menghapus', err.response?.data?.message);
    }
  };

  const bukaDetail = async (v) => {
    try {
      const { data } = await getVoucher(v.id);
      requestVoucherDetail(data.id);
      window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-voucher-detail' }));
    } catch (err) {
      swalError('Gagal membuka detail', err.response?.data?.message);
    }
  };

  const badge = (status) => {
    const map = {
      DRAFT: 'bg-amber-100 text-amber-700',
      POSTED: 'bg-emerald-100 text-emerald-700',
      VOID: 'bg-slate-200 text-slate-600',
    };
    return `inline-block px-2 py-1 rounded-full text-xs font-bold ${map[status] || ''}`;
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
              Penyesuaian akhir periode dengan alur posting yang sama seperti voucher
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={muat}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
          <button onClick={() => { setFormEdit(null); setTab('form'); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" /> Buat Penyesuaian
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 no-print">
        {[
          { k: 'daftar', label: 'Daftar Penyesuaian' },
          { k: 'form', label: formEdit ? 'Edit' : 'Penyesuaian Baru' },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer
                            ${tab === t.k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daftar' && (
        <>
          <div className="flex flex-wrap items-end gap-3 no-print">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="">Semua</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTED">Posted</option>
                <option value="VOID">Dibatalkan</option>
              </select>
            </div>
            <PrintButton label="Cetak Daftar" />
          </div>

          <PrintHeader judul="DAFTAR JURNAL PENYESUAIAN" />

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left">No. Voucher</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Keterangan</th>
                    <th className="px-4 py-3 text-right">Total Debit</th>
                    <th className="px-4 py-3 text-right">Total Kredit</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>}
                  {!loading && daftar.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Belum ada jurnal penyesuaian.
                    </td></tr>
                  )}
                  {daftar.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{v.no_voucher}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(v.tanggal)}</td>
                      <td className="px-4 py-3 text-xs max-w-72 truncate">{v.keterangan || '-'}</td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap">{angka(v.total_debit)}</td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap">{angka(v.total_kredit)}</td>
                      <td className="px-4 py-3 text-center"><span className={badge(v.status)}>{v.status}</span></td>
                      <td className="px-4 py-3 no-print">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => bukaDetail(v)} title="Lihat detail"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {v.status === 'DRAFT' && (
                            <>
                              <button onClick={() => { setFormEdit(v); setTab('form'); }} title="Edit"
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition cursor-pointer">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => posting(v)} title="Posting"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => hapusDraft(v)} title="Hapus"
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {v.status === 'POSTED' && !v.reversal_of_id && (
                            <button onClick={() => reversal(v)} title="Reversal"
                              className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition cursor-pointer">
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'form' && (
        <div className="no-print">
          <JournalVoucherForm
            key={formEdit?.id || 'penyesuaian'}
            jenisAwal="Jurnal Penyesuaian"
            voucherEdit={formEdit}
            onBatal={() => { setFormEdit(null); setTab('daftar'); }}
            onTersimpan={() => { muat(); setTab('daftar'); }}
          />
        </div>
      )}
    </div>
  );
}