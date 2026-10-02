import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, CheckCircle2, ArrowLeft } from 'lucide-react';
import {
    createVoucher, updateVoucher, getAccounts,
    VOUCHER_TYPES, VOUCHER_TEMPLATES, rupiah, angka, todayISODate,
} from '../../services/accountingApi';
import { swalError, swalSuccess, swalConfirm } from '../../utils/swal';

/**
 * Form Journal Voucher generik.
 *
 * - Mendukung semua jenis voucher lewat form generik berpasangan debit/kredit.
 * - Field header khusus per jenis diambil dari VOUCHER_TEMPLATES
 *   (mengikuti dokumen asli Aldigens).
 * - Total Debit / Kredit / Selisih / status BALANCE dihitung real-time.
 * - Akun dipilih dari COA; Nama Akun terisi otomatis dan tidak bisa diketik bebas.
 */

const barisKosong = () => ({
    uid: Math.random().toString(36).slice(2),
    account_id: '',
    debit: '',
    kredit: '',
    memo: '',
});

const FORM_KOSONG = {
    tanggal: todayISODate(),
    jenis: 'Jurnal Umum',
    keterangan: '',
    no_referensi: '',
    pihak_terkait: '',
    kas_bank: '',
};

export default function JournalVoucherForm({
    jenisAwal = 'Jurnal Umum',
    voucherEdit = null,
    onBatal = null,
    onTersimpan = null,
}) {
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState(() => ({ ...FORM_KOSONG, jenis: jenisAwal }));
    const [lines, setLines] = useState([barisKosong(), barisKosong()]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await getAccounts();
                // Hanya akun aktif & bukan akun induk yang boleh dipilih.
                setAccounts(data.filter((a) => a.is_active && !a.is_header));
            } catch (err) {
                swalError('Gagal memuat daftar akun', err.response?.data?.message);
            }
        })();
    }, []);

    // Mode edit: isi form dari voucher yang dipilih.
    useEffect(() => {
        if (!voucherEdit) return;
        setForm({
            tanggal: voucherEdit.tanggal?.slice(0, 10) || todayISODate(),
            jenis: voucherEdit.jenis,
            keterangan: voucherEdit.keterangan || '',
            no_referensi: voucherEdit.no_referensi || '',
            pihak_terkait: voucherEdit.pihak_terkait || '',
            kas_bank: voucherEdit.kas_bank || '',
        });
        setLines(
            voucherEdit.lines?.length
                ? voucherEdit.lines.map((l) => ({
                    uid: Math.random().toString(36).slice(2),
                    account_id: String(l.account_id),
                    debit: l.debit ? String(l.debit) : '',
                    kredit: l.kredit ? String(l.kredit) : '',
                    memo: l.memo || '',
                }))
                : [barisKosong(), barisKosong()]
        );
        setError('');
    }, [voucherEdit]);

    const accountMap = useMemo(
        () => Object.fromEntries(accounts.map((a) => [String(a.id), a])),
        [accounts]
    );

    const templateFields = VOUCHER_TEMPLATES[form.jenis] || [
        { key: 'pihak_terkait', label: 'Pihak Terkait', type: 'text' },
    ];

    /* --- Perhitungan real-time --- */
    const totalDebit = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0),
        [lines]
    );
    const totalKredit = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.kredit) || 0), 0),
        [lines]
    );
    const selisih = Math.round((totalDebit - totalKredit) * 100) / 100;
    const balanced = Math.abs(selisih) < 0.009 && totalDebit > 0 && totalKredit > 0;

    const ubahLine = (uid, patch) =>
        setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));

    /** Pilih akun -> nama terisi otomatis, dan baris jadi hanya debit atau kredit. */
    const pilihAkun = (uid, accountId, sisi) => {
        ubahLine(uid, sisi === 'debit'
            ? { account_id: accountId, kredit: '' }
            : { account_id: accountId, debit: '' });
    };

    const tambahBaris = () => setLines((ls) => [...ls, barisKosong()]);
    const hapusBaris = (uid) => setLines((ls) => ls.length > 2 ? ls.filter((l) => l.uid !== uid) : ls);

    /* --- Validasi frontend --- */
    const validasi = () => {
        if (!form.tanggal) return 'Tanggal wajib diisi.';
        if (!form.jenis) return 'Jenis Voucher wajib dipilih.';

        const dipakai = lines.filter((l) => l.account_id || l.debit || l.kredit);
        if (dipakai.length < 2) return 'Minimal terdapat dua baris jurnal (satu debit, satu kredit).';

        for (const [i, l] of dipakai.entries()) {
            if (!l.account_id) return `Baris ${i + 1}: Nomor Akun belum dipilih.`;
            const d = parseFloat(l.debit) || 0;
            const k = parseFloat(l.kredit) || 0;
            if (d < 0 || k < 0) return `Baris ${i + 1}: nominal tidak boleh negatif.`;
            if (d > 0 && k > 0) return `Baris ${i + 1}: debit dan kredit tidak boleh diisi bersamaan.`;
            if (d === 0 && k === 0) return `Baris ${i + 1}: nominal debit atau kredit harus diisi.`;
        }

        if (totalDebit <= 0 || totalKredit <= 0) return 'Total debit dan kredit harus lebih dari nol.';
        if (!balanced) return 'Voucher tidak seimbang. Total Debit harus sama dengan Total Kredit.';

        return '';
    };

    const simpanDraft = async (langsungPosting = false) => {
        // Saat posting, wajib seimbang. Draft boleh disimpan untuk diselesaikan nanti.
        if (langsungPosting) {
            const err = validasi();
            if (err) return setError(err);
        } else {
            const dipakai = lines.filter((l) => l.account_id);
            if (dipakai.length < 2) return setError('Minimal terdapat dua baris jurnal.');
            for (const [i, l] of dipakai.entries()) {
                if (!l.account_id) return setError(`Baris ${i + 1}: Nomor Akun belum dipilih.`);
            }
            setError('');
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                no_referensi: form.no_referensi || null,
                pihak_terkait: form.pihak_terkait || null,
                kas_bank: form.kas_bank || null,
                lines: lines
                    .filter((l) => l.account_id)
                    .map((l) => ({
                        account_id: parseInt(l.account_id, 10),
                        debit: parseFloat(l.debit) || 0,
                        kredit: parseFloat(l.kredit) || 0,
                        memo: l.memo || null,
                    })),
            };

            const { data } = voucherEdit
                ? await updateVoucher(voucherEdit.id, payload)
                : await createVoucher(payload);

            if (langsungPosting) {
                if (!balanced) {
                    setError('Voucher harus seimbang sebelum dapat diposting.');
                    setSaving(false);
                    return;
                }
                const { postVoucher } = await import('../../services/accountingApi');
                const res = await postVoucher(data.id);
                swalSuccess(res.data.message || 'Voucher berhasil dibuat dan diposting.');
            } else {
                swalSuccess(
                    balanced
                        ? `Voucher ${data.no_voucher} disimpan sebagai Draft.`
                        : `Voucher ${data.no_voucher} disimpan sebagai Draft (belum seimbang).`
                );
            }

            if (!voucherEdit) {
                setForm({ ...FORM_KOSONG, jenis: form.jenis });
                setLines([barisKosong(), barisKosong()]);
            }
            onTersimpan?.();
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan voucher.');
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
    const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';

    return (
        <div className="space-y-4">
            {/* Header umum */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Nomor Voucher</label>
                        <input
                            value={voucherEdit?.no_voucher || 'Otomatis saat disimpan'}
                            disabled
                            className={`${inputClass} bg-slate-100 dark:bg-slate-800/60 text-slate-500`}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Tanggal <span className="text-red-500">*</span></label>
                        <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Jenis Voucher <span className="text-red-500">*</span></label>
                        <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className={inputClass}>
                            {VOUCHER_TYPES.map((j) => <option key={j}>{j}</option>)}
                        </select>
                    </div>
                </div>

                {/* Field khusus mengikuti template dokumen Aldigens */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {templateFields.map((f) => (
                        <div key={f.key}>
                            <label className={labelClass}>{f.label}</label>
                            <input
                                value={form[f.key] || ''}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    ))}
                </div>

                <div>
                    <label className={labelClass}>Keterangan</label>
                    <textarea
                        value={form.keterangan}
                        onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                        rows={2}
                        placeholder="Uraian transaksi pada voucher ini..."
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Detail akun debit & kredit */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Detail Transaksi</h3>
                    <button onClick={tambahBaris} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer">
                        <Plus className="h-3.5 w-3.5" /> Tambah Baris
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
                            <tr>
                                <th className="px-3 py-3 text-left w-12">#</th>
                                <th className="px-3 py-3 text-left">Nomor Akun</th>
                                <th className="px-3 py-3 text-left">Nama Akun</th>
                                <th className="px-3 py-3 text-right w-40">Debit</th>
                                <th className="px-3 py-3 text-right w-40">Kredit</th>
                                <th className="px-3 py-3 text-left">Memo</th>
                                <th className="px-3 py-3 no-print"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                                        Belum ada akun aktif. Tambahkan Chart of Account terlebih dahulu.
                                    </td>
                                </tr>
                            )}
                            {lines.map((l, idx) => {
                                const akun = accountMap[l.account_id];
                                return (
                                    <tr key={l.uid}>
                                        <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={l.account_id}
                                                onChange={(e) => pilihAkun(l.uid, e.target.value, l.kredit ? 'kredit' : 'debit')}
                                                className={`${inputClass} py-1.5 text-xs`}
                                            >
                                                <option value="">— Pilih akun —</option>
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.nomor_akun}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* Nama akun otomatis, tidak bisa diketik bebas */}
                                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                            {akun ? akun.nama_akun : <span className="text-slate-400">otomatis dari COA</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number" min="0" step="0.01" disabled={!!l.kredit && !!l.account_id && !l.debit}
                                                value={l.debit}
                                                onChange={(e) => ubahLine(l.uid, { debit: e.target.value, kredit: l.account_id ? '' : l.kredit })}
                                                placeholder="0"
                                                className={`${inputClass} py-1.5 text-xs text-right`}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number" min="0" step="0.01" disabled={!!l.debit && !!l.account_id && !l.kredit}
                                                value={l.kredit}
                                                onChange={(e) => ubahLine(l.uid, { kredit: e.target.value, debit: l.account_id ? '' : l.debit })}
                                                placeholder="0"
                                                className={`${inputClass} py-1.5 text-xs text-right`}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={l.memo}
                                                onChange={(e) => ubahLine(l.uid, { memo: e.target.value })}
                                                placeholder="Memo baris"
                                                className={`${inputClass} py-1.5 text-xs`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 no-print">
                                            <button
                                                onClick={() => hapusBaris(l.uid)}
                                                disabled={lines.length <= 2}
                                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Hapus baris"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800">
                            <tr>
                                <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Total
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 dark:text-white">{rupiah(totalDebit)}</td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 dark:text-white">{rupiah(totalKredit)}</td>
                                <td colSpan={2} className="px-3 py-3 text-xs">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={balanced ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                            {balanced ? 'BALANCE' : 'TIDAK BALANCE'}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Selisih: {rupiah(Math.abs(selisih))}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Ringkasan balancing */}
            <div className={`rounded-2xl border p-4 ${balanced ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Total Debit</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(totalDebit)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Total Kredit</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(totalKredit)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Selisih</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{rupiah(selisih)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Status</p>
                        <p className={`text-sm font-bold ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                            {balanced ? 'BALANCE' : 'TIDAK BALANCE'}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Aksi */}
            <div className="flex flex-wrap items-center gap-2 no-print">
                {onBatal && (
                    <button onClick={onBatal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer">
                        <ArrowLeft className="h-4 w-4" /> Kembali
                    </button>
                )}
                <button onClick={() => simpanDraft(false)} disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-60">
                    <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
                </button>
                <button onClick={() => simpanDraft(true)} disabled={saving || !balanced}
                    title={!balanced ? 'Voucher harus seimbang sebelum dapat diposting' : 'Simpan dan langsung posting'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <CheckCircle2 className="h-4 w-4" /> Simpan &amp; Posting
                </button>
                {!balanced && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total Debit ({angka(totalDebit)}) harus sama dengan Total Kredit ({angka(totalKredit)}).
                    </p>
                )}
            </div>
        </div>
    );
}