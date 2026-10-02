import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, Search, Plus, Pencil, Power, RefreshCw } from 'lucide-react';
import PrintButton from '../../components/PrintButton';
import PrintHeader from '../../components/PrintHeader';
import {
    getAccounts, createAccount, updateAccount, toggleAccountStatus,
    ACCOUNT_TYPES, SALDO_NORMAL_BY_TIPE, todayISODate, formatTanggal,
} from '../../services/accountingApi';
import { swalError, swalSuccess } from '../../utils/swal';

const FORM_KOSONG = {
    nomor_akun: '',
    nama_akun: '',
    tipe_akun: 'Aset',
    saldo_normal: 'Debit',
    keterangan: '',
    is_active: true,
    is_header: false,
    parent_nomor_akun: '',
    saldo_awal: 0,
    saldo_awal_tanggal: todayISODate(),
};

export default function ChartOfAccount() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTipe, setFilterTipe] = useState('Semua');
    const [filterStatus, setFilterStatus] = useState('Semua');

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(FORM_KOSONG);
    const [editId, setEditId] = useState(null);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const muatData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getAccounts();
            setAccounts(data);
        } catch (err) {
            swalError('Gagal memuat Chart of Account', err.response?.data?.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { muatData(); }, [muatData]);

    const rows = useMemo(() => {
        const q = search.toLowerCase().trim();
        return accounts.filter((a) => {
            const matchTipe = filterTipe === 'Semua' || a.tipe_akun === filterTipe;
            const matchStatus = filterStatus === 'Semua'
                || (filterStatus === 'Aktif' ? a.is_active : !a.is_active);
            const matchQ = !q
                || a.nomor_akun.toLowerCase().includes(q)
                || a.nama_akun.toLowerCase().includes(q)
                || (a.keterangan || '').toLowerCase().includes(q);
            return matchTipe && matchStatus && matchQ;
        });
    }, [accounts, search, filterTipe, filterStatus]);

    const bukaTambah = () => {
        setForm(FORM_KOSONG); setEditId(null); setFormError(''); setModalOpen(true);
    };

    const bukaEdit = (a) => {
        setForm({
            nomor_akun: a.nomor_akun,
            nama_akun: a.nama_akun,
            tipe_akun: a.tipe_akun,
            saldo_normal: a.saldo_normal,
            keterangan: a.keterangan || '',
            is_active: a.is_active,
            is_header: a.is_header,
            parent_nomor_akun: a.parent_nomor_akun || '',
            saldo_awal: a.saldo_awal ?? 0,
            saldo_awal_tanggal: a.saldo_awal_tanggal?.slice(0, 10) || '',
        });
        setEditId(a.id); setFormError(''); setModalOpen(true);
    };

    const ubahTipe = (tipe) => setForm((f) => ({
        ...f, tipe_akun: tipe, saldo_normal: SALDO_NORMAL_BY_TIPE[tipe] ?? f.saldo_normal,
    }));

    const simpan = async () => {
        if (!form.nomor_akun.trim()) return setFormError('Nomor Akun wajib diisi.');
        if (!form.nama_akun.trim()) return setFormError('Nama Akun wajib diisi.');

        const duplikat = accounts.find(
            (a) => a.nomor_akun.trim().toLowerCase() === form.nomor_akun.trim().toLowerCase()
                && a.id !== editId
        );
        if (duplikat) return setFormError(`Nomor Akun ${form.nomor_akun} sudah digunakan.`);

        setSaving(true);
        try {
            const payload = {
                ...form,
                parent_nomor_akun: form.parent_nomor_akun || null,
                keterangan: form.keterangan || null,
                saldo_awal_tanggal: form.saldo_awal_tanggal || null,
            };
            if (editId) await updateAccount(editId, payload);
            else await createAccount(payload);

            swalSuccess(editId ? 'Akun berhasil diperbarui.' : 'Akun berhasil ditambahkan.');
            setModalOpen(false);
            muatData();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Gagal menyimpan akun.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (a) => {
        try {
            await toggleAccountStatus(a.id);
            swalSuccess(a.is_active
                ? `Akun ${a.nomor_akun} dinonaktifkan. Transaksi lama tetap tersimpan.`
                : `Akun ${a.nomor_akun} diaktifkan kembali.`);
            muatData();
        } catch (err) {
            swalError('Gagal mengubah status akun', err.response?.data?.message);
        }
    };

    const totalAktif = accounts.filter((a) => a.is_active && !a.is_header).length;
    const totalNonaktif = accounts.filter((a) => !a.is_active).length;

    return (
        <div className="p-6 space-y-5 print-area">
            {/* Header halaman */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
                        <BookMarked className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chart of Account</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Daftar akun dan struktur akun perusahaan
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={muatData}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Muat Ulang</span>
                    </button>
                    <PrintButton label="Cetak COA" />
                    <button onClick={bukaTambah}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer">
                        <Plus className="h-4 w-4" /> Tambah Akun
                    </button>
                </div>
            </div>

            <PrintHeader judul="DAFTAR CHART OF ACCOUNT" />

            {/* Ringkasan */}
            <div className="grid grid-cols-3 gap-3 no-print">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Akun Detail</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{accounts.filter((a) => !a.is_header).length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Aktif</p>
                    <p className="text-lg font-bold text-emerald-600">{totalAktif}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nonaktif</p>
                    <p className="text-lg font-bold text-slate-500">{totalNonaktif}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-end gap-3 no-print">
                <div className="flex-1 min-w-55">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cari Akun</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Nomor akun, nama akun, atau keterangan..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipe Akun</label>
                    <select value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Semua">Semua Tipe</option>
                        {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Semua">Semua</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Nonaktif">Nonaktif</option>
                    </select>
                </div>
            </div>

            {/* Tabel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nomor Akun</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nama Akun</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tipe Akun</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Saldo Normal</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Keterangan</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 no-print">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading && <tr><td colSpan={7} className="text-center py-8 text-slate-400">Memuat data...</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10">
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada akun.</p>
                                    <p className="text-xs text-slate-400 mt-1">Tambahkan akun sebelum membuat voucher.</p>
                                </td></tr>
                            )}
                            {rows.map((a) => (
                                <tr key={a.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${a.is_active ? '' : 'opacity-60'}`}>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">{a.nomor_akun}</span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                                        {a.nama_akun}
                                        {a.is_header && <span className="ml-2 text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">Induk</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{a.tipe_akun}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{a.saldo_normal}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-64 truncate">{a.keterangan || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {a.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 no-print">
                                        <div className="flex gap-1.5">
                                            <button title="Ubah akun" onClick={() => bukaEdit(a)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer">
                                                <Pencil className="h-3.5 w-3.5" /> Ubah
                                            </button>
                                            <button title={a.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'} onClick={() => toggleStatus(a)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${a.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                                <Power className="h-3.5 w-3.5" /> {a.is_active ? 'Nonaktif' : 'Aktif'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tanda tangan cetak */}
            <div className="hidden print:block mt-8 text-xs">
                <div className="flex justify-between">
                    <p>Jakarta, {formatTanggal(todayISODate())}</p>
                    <div className="text-center">
                        <p>Mengetahui,</p>
                        <p>Finance Manager</p>
                        <div className="h-16" />
                        <p className="underline">( ................................ )</p>
                    </div>
                </div>
                <p className="mt-6">Dicetak dari Sistem Terintegrasi Aldigens — Total {rows.length} akun.</p>
            </div>

            {/* Modal Tambah / Edit */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Edit Akun' : 'Tambah Akun'}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Nomor Akun harus unik.</p>
                        </div>

                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nomor Akun <span className="text-red-500">*</span></label>
                                <input value={form.nomor_akun} onChange={(e) => setForm({ ...form, nomor_akun: e.target.value })} placeholder="Contoh: 1-1000"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nama Akun <span className="text-red-500">*</span></label>
                                <input value={form.nama_akun} onChange={(e) => setForm({ ...form, nama_akun: e.target.value })} placeholder="Contoh: Kas"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipe Akun</label>
                                <select value={form.tipe_akun} onChange={(e) => ubahTipe(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Saldo Normal</label>
                                <select value={form.saldo_normal} onChange={(e) => setForm({ ...form, saldo_normal: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>Debit</option><option>Kredit</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Keterangan</label>
                                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} rows={2}
                                    placeholder="Uraian singkat fungsi akun ini..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nomor Akun Induk</label>
                                <input value={form.parent_nomor_akun} onChange={(e) => setForm({ ...form, parent_nomor_akun: e.target.value })} placeholder="Opsional, mis. 1-0000"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Saldo Awal</label>
                                <input type="number" min="0" value={form.saldo_awal} onChange={(e) => setForm({ ...form, saldo_awal: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                <p className="text-[10px] text-slate-400 mt-1">Diisi sesuai data perusahaan, bukan diasumsikan sistem.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tanggal Saldo Awal</label>
                                <input type="date" value={form.saldo_awal_tanggal || ''} onChange={(e) => setForm({ ...form, saldo_awal_tanggal: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="flex items-center gap-5">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /> Aktif
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                                    <input type="checkbox" checked={form.is_header} onChange={(e) => setForm({ ...form, is_header: e.target.checked })} className="w-4 h-4 rounded" /> Akun Induk
                                </label>
                            </div>

                            {formError && (
                                <div className="sm:col-span-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
                                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">{formError}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <button onClick={() => setModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">Batal</button>
                            <button onClick={simpan} disabled={saving}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer disabled:opacity-60">
                                {saving ? 'Menyimpan...' : 'Simpan Akun'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
