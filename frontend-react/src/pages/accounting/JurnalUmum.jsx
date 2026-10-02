import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    NotebookPen, Plus, Search, RefreshCw, Eye, Pencil, CheckCircle2,
    Undo2, Trash2,
} from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import JournalVoucherForm from '../../components/accounting/JournalVoucherForm';
import {
    getVouchers, getVoucher, postVoucher, reverseVoucher, deleteVoucher,
    getJournalUmum, VOUCHER_TYPES, rupiah, angka, formatTanggal, periodeDefault,
} from '../../services/accountingApi';
import { requestVoucherDetail } from '../../Data/accountingStore';
import { swalSuccess, swalError, swalConfirm } from '../../utils/swal';

/**
 * Jurnal Umum / Journal Voucher.
 *
 * Tab "Rekap Jurnal"  : jurnal hasil POSTED, susunan mengikuti Excel rekap perusahaan.
 * Tab "Daftar Voucher" : semua voucher (Draft & Posted) dari database.
 */
export default function JurnalUmum() {
    const [tab, setTab] = useState('rekap'); // rekap | daftar | form
    const [formEdit, setFormEdit] = useState(null);

    /* --- state daftar voucher --- */
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterJenis, setFilterJenis] = useState('');

    /* --- state rekap jurnal --- */
    const [rekap, setRekap] = useState(null);
    const [rekapLoading, setRekapLoading] = useState(false);
    const [periode, setPeriode] = useState(periodeDefault());

    const muatVouchers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getVouchers({ per_page: 200 });
            setVouchers(data.data || []);
        } catch (err) {
            swalError('Gagal memuat daftar voucher', err.response?.data?.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const muatRekap = useCallback(async () => {
        setRekapLoading(true);
        try {
            const { data } = await getJournalUmum({ from: periode.from, to: periode.to });
            setRekap(data);
        } catch (err) {
            swalError('Gagal memuat rekap jurnal', err.response?.data?.message);
        } finally {
            setRekapLoading(false);
        }
    }, [periode]);

    useEffect(() => { muatVouchers(); }, [muatVouchers]);
    useEffect(() => { muatRekap(); }, [muatRekap]);

    const daftar = useMemo(() => vouchers.filter((v) => {
        const q = search.toLowerCase().trim();
        const mQ = !q
            || v.no_voucher.toLowerCase().includes(q)
            || (v.keterangan || '').toLowerCase().includes(q)
            || (v.no_referensi || '').toLowerCase().includes(q);
        const mS = !filterStatus || v.status === filterStatus;
        const mJ = !filterJenis || v.jenis === filterJenis;
        return mQ && mS && mJ;
    }), [vouchers, search, filterStatus, filterJenis]);

    /* --- aksi --- */
    const bukaDetail = async (v) => {
        try {
            const { data } = await getVoucher(v.id);
            requestVoucherDetail(data.id);
            window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-voucher-detail' }));
        } catch (err) {
            swalError('Gagal membuka detail voucher', err.response?.data?.message);
        }
    };

    const posting = async (v) => {
        const ok = await swalConfirm({
            title: `Posting Voucher ${v.no_voucher}?`,
            text: 'Setelah diposting, voucher terkunci danjournalsnya masuk ke Buku Besar serta Neraca Saldo.',
            confirmText: 'Ya, Posting',
        });
        if (!ok) return;

        try {
            const { data } = await postVoucher(v.id);
            swalSuccess(data.message || 'Voucher berhasil diposting.');
            muatVouchers();
            muatRekap();
        } catch (err) {
            swalError('Posting gagal', err.response?.data?.message);
        }
    };

    const reversal = async (v) => {
        const Swal = (await import('sweetalert2')).default;
        const { value: alasan } = await Swal.fire({
            title: `Reversal Voucher ${v.no_voucher}`,
            input: 'textarea',
            inputLabel: 'Alasan reversal (wajib)',
            inputPlaceholder: 'Contoh: salah input nominal',
            inputValidator: (val) => (!val || val.trim() === '') ? 'Alasan wajib diisi.' : undefined,
            showCancelButton: true,
            confirmButtonText: 'Buat Reversal',
        });
        if (!alasan) return;

        try {
            const { data } = await reverseVoucher(v.id, alasan);
            swalSuccess(data.message || 'Reversal berhasil dibuat.');
            muatVouchers();
            muatRekap();
        } catch (err) {
            swalError('Reversal gagal', err.response?.data?.message);
        }
    };

    const hapusDraft = async (v) => {
        const ok = await swalConfirm({
            title: `Hapus voucher ${v.no_voucher}?`,
            text: 'Hanya voucher Draft yang dapat dihapus.',
            confirmText: 'Hapus',
            danger: true,
        });
        if (!ok) return;

        try {
            await deleteVoucher(v.id);
            swalSuccess('Voucher draft dihapus.');
            muatVouchers();
        } catch (err) {
            swalError('Gagal menghapus voucher', err.response?.data?.message);
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
                        <NotebookPen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jurnal Umum</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Journal Voucher dan rekap jurnal dari transaksi yang sudah diposting
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { muatVouchers(); muatRekap(); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Muat Ulang</span>
                    </button>
                    <button onClick={() => { setFormEdit(null); setTab('form'); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer">
                        <Plus className="h-4 w-4" /> Buat Voucher
                    </button>
                </div>
            </div>

            {/* Tab */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 no-print">
                {[
                    { k: 'rekap', label: 'Rekap Jurnal' },
                    { k: 'daftar', label: 'Daftar Voucher' },
                    { k: 'form', label: formEdit ? 'Edit Voucher' : 'Voucher Baru' },
                ].map((t) => (
                    <button key={t.k} onClick={() => setTab(t.k)}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer
                            ${tab === t.k
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ---------------- TAB: REKAP JURNAL ---------------- */}
            {tab === 'rekap' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3 no-print">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Dari Tanggal</label>
                            <input type="date" value={periode.from}
                                onChange={(e) => setPeriode({ ...periode, from: e.target.value })}
                                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Sampai Tanggal</label>
                            <input type="date" value={periode.to}
                                onChange={(e) => setPeriode({ ...periode, to: e.target.value })}
                                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                        </div>
                        <PrintButton label="Cetak Rekap" />
                    </div>

                    <PrintHeader
                        judul="REKAP JURNAL UMUM"
                        periode={`${formatTanggal(periode.from)} - ${formatTanggal(periode.to)}`}
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total Debit</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(rekap?.total_debit)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total Kredit</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(rekap?.total_kredit)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Selisih</p>
                            <p className={`text-sm font-bold ${rekap?.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                {rupiah(rekap?.selisih)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                            <p className={`text-sm font-bold ${rekap?.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                {rekap?.balanced ? 'BALANCE' : 'TIDAK BALANCE'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase">
                                    <tr>
                                        <th className="px-2 py-3 text-left">Tanggal</th>
                                        <th className="px-2 py-3 text-left">Bln</th>
                                        <th className="px-2 py-3 text-left">No Ref</th>
                                        <th className="px-2 py-3 text-left">Nomor Akun Debit</th>
                                        <th className="px-2 py-3 text-left">Nama Akun Debit</th>
                                        <th className="px-2 py-3 text-right">Debit</th>
                                        <th className="px-2 py-3 text-right">Kredit</th>
                                        <th className="px-2 py-3 text-left">Nomor Akun Kredit</th>
                                        <th className="px-2 py-3 text-left">Nama Akun Kredit</th>
                                        <th className="px-2 py-3 text-left">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rekapLoading && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Memuat rekap...</td></tr>}
                                    {!rekapLoading && (rekap?.rows?.length ?? 0) === 0 && (
                                        <tr><td colSpan={10} className="px-3 py-10 text-center text-slate-400">
                                            Belum ada jurnal posted pada periode ini. Voucher Draft tidak memengaruhi rekap.
                                        </td></tr>
                                    )}
                                    {(rekap?.rows || []).map((r) => {
                                        const d = Number(r.debit) > 0;
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-2 py-2 whitespace-nowrap">{formatTanggal(r.tanggal)}</td>
                                                <td className="px-2 py-2">{String(r.tanggal).slice(5, 7)}</td>
                                                <td className="px-2 py-2 font-mono whitespace-nowrap">{r.no_voucher}</td>
                                                <td className="px-2 py-2 font-mono">{d ? r.nomor_akun : ''}</td>
                                                <td className="px-2 py-2">{d ? r.nama_akun : ''}</td>
                                                <td className="px-2 py-2 text-right whitespace-nowrap">{d ? angka(r.debit) : ''}</td>
                                                <td className="px-2 py-2 text-right whitespace-nowrap">{d ? '' : angka(r.kredit)}</td>
                                                <td className="px-2 py-2 font-mono">{d ? '' : r.nomor_akun}</td>
                                                <td className="px-2 py-2">{d ? '' : r.nama_akun}</td>
                                                <td className="px-2 py-2">{r.memo || r.keterangan || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {rekap?.rows?.length > 0 && (
                                    <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                                        <tr>
                                            <td colSpan={5} className="px-2 py-3 text-right">TOTAL</td>
                                            <td className="px-2 py-3 text-right whitespace-nowrap">{angka(rekap.total_debit)}</td>
                                            <td className="px-2 py-3 text-right whitespace-nowrap">{angka(rekap.total_kredit)}</td>
                                            <td colSpan={3} className="px-2 py-3 text-right">
                                                Selisih {angka(rekap.selisih)} — {rekap.balanced ? 'BALANCE' : 'TIDAK BALANCE'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {rekap?.rows?.length > 0 && (
                        <div className="hidden print:block mt-6 text-xs">
                            <p>Dicetak dari Sistem Terintegrasi Aldigens — {rekap.jumlah_voucher} voucher posted.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- TAB: DAFTAR VOUCHER ---------------- */}
            {tab === 'daftar' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
                        <div className="flex-1 min-w-55">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cari</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)}
                                    placeholder="No. voucher, keterangan, atau referensi..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                            </div>
                        </div>
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
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Jenis</label>
                            <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                                <option value="">Semua</option>
                                {VOUCHER_TYPES.map((j) => <option key={j}>{j}</option>)}
                            </select>
                        </div>
                        <PrintButton label="Cetak Daftar" />
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
                                    <tr>
                                        <th className="px-4 py-3 text-left">No. Voucher</th>
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-left">Jenis</th>
                                        <th className="px-4 py-3 text-left">Keterangan</th>
                                        <th className="px-4 py-3 text-right">Total Debit</th>
                                        <th className="px-4 py-3 text-right">Total Kredit</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center no-print">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat voucher...</td></tr>}
                                    {!loading && daftar.length === 0 && (
                                        <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum ada voucher.</td></tr>
                                    )}
                                    {daftar.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{v.no_voucher}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(v.tanggal)}</td>
                                            <td className="px-4 py-3 text-xs">{v.jenis}</td>
                                            <td className="px-4 py-3 text-xs max-w-64 truncate">{v.keterangan || '-'}</td>
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
                                                            <button onClick={() => { setFormEdit(v); setTab('form'); }} title="Edit draft"
                                                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition cursor-pointer">
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => posting(v)} title="Posting"
                                                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => hapusDraft(v)} title="Hapus draft"
                                                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {v.status === 'POSTED' && !v.reversal_of_id && (
                                                        <button onClick={() => reversal(v)} title="Buat reversal (koreksi)"
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
                </div>
            )}

            {/* ---------------- TAB: FORM ---------------- */}
            {tab === 'form' && (
                <div className="no-print">
                    {formEdit && formEdit.status !== 'DRAFT' && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 mb-4">
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                Voucher berstatus <strong>{formEdit.status}</strong> tidak dapat diedit.
                                Gunakan Reversal untuk koreksi agar histori tetap tercatat.
                            </p>
                        </div>
                    )}
                    <JournalVoucherForm
                        key={formEdit?.id || 'baru'}
                        jenisAwal={formEdit?.jenis || 'Jurnal Umum'}
                        voucherEdit={formEdit}
                        onBatal={() => { setFormEdit(null); setTab('daftar'); }}
                        onTersimpan={() => { muatVouchers(); muatRekap(); setTab('daftar'); }}
                    />
                </div>
            )}
        </div>
    );
}