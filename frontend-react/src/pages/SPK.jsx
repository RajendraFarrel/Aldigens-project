import React, { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    createSpk,
    deleteSpk,
    getCustomers,
    getDeliveryOrders,
    getPurchaseOrders,
    getSalesOrders,
    getSpks,
    updateSpk,
} from '../services/api';
import { swalConfirm, swalError, swalToast } from '../utils/swal';

/**
 * Halaman SPK (Surat Perintah Kerja) — daftar data induk pekerjaan operasional.
 *
 * Sumber data: GET /api/spks (data asli dari backend, tanpa dummy/localStorage).
 * Nomor SPK selalu dibuat backend; form tidak pernah mengirim spk_number.
 */

/** Status lifecycle SPK — mengikuti konstanta Spk::STATUSES di backend. */
const SPK_STATUSES = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

/** Nilai awal form. `customer_id: ''` = belum dipilih. */
const EMPTY_FORM = {
    spk_date: '',
    customer_id: '',
    po_number: '',
    so_number: '',
    do_number: '',
    project_name: '',
    serial_no: '',
    location: '',
    start_date: '',
    finish_date: '',
    contractor: '',
    project_leader: '',
    pic_ehs: '',
    person_responsible: '',
    employee_count: '',
    security_monitoring: '',
    notes: '',
    status: 'DRAFT',
};

/* Kelas label & input agar konsisten di seluruh form. */
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';
const inputCls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

/** Modal overlay standar project (mengikuti pola CustomerPartNumbers.jsx). */
function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-[fadeUp_.2s_ease]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/** Normalisasi nilai tanggal dari backend (bisa datetime) ke format <input type="date">. */
const toDateInputValue = (value) => (value ? String(value).substring(0, 10) : '');

/**
 * Ambil nomor dokumen dari sebuah record order, mencoba beberapa nama field umum.
 * PO → customer_po_number, SO → so_number, DO → do_number.
 */
const pickNumber = (row, ...keys) => {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    }
    return '';
};

/**
 * Dropdown dengan pencarian untuk referensi dokumen (PO/SO/DO).
 * Menampilkan input teks + datalist sehingga user bisa mengetik untuk mencari
 * sekaligus tetap bebas mengisi nomor yang belum ada di daftar.
 */
function DocumentSearchSelect({ id, value, onChange, options, placeholder }) {
    return (
        <>
            <input
                type="text"
                list={id}
                autoComplete="off"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputCls}
            />
            <datalist id={id}>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </datalist>
        </>
    );
}

export default function SPK() {
    const [spks, setSpks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data master untuk dropdown customer (diambil dari API, bukan hardcode).
    const [customers, setCustomers] = useState([]);

    // Data referensi dokumen untuk dropdown pencarian PO/SO/DO (diambil dari API).
    const [poOptions, setPoOptions] = useState([]);
    const [soOptions, setSoOptions] = useState([]);
    const [doOptions, setDoOptions] = useState([]);

    // State form Tambah/Edit.
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    // Nomor SPK hanya untuk display read-only saat edit (tidak pernah dikirim ke backend).
    const [editingNumber, setEditingNumber] = useState('');

    /** Ambil daftar SPK dari backend (satu-satunya sumber data tabel). */
    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getSpks();
            const data = res.data?.data ?? res.data ?? [];
            setSpks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal mengambil data SPK:', err);
            setError(
                err.response?.data?.message ||
                'Gagal mengambil data SPK. Pastikan server backend berjalan dan Anda memiliki akses.'
            );
            setSpks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /* Muat daftar customer untuk dropdown form (data asli dari API). */
    useEffect(() => {
        getCustomers()
            .then((res) => setCustomers(res.data?.data || res.data || []))
            .catch((err) => {
                console.error('Gagal mengambil data customer:', err);
                setCustomers([]);
            });
    }, []);

    /*
     * Muat referensi dokumen PO/SO/DO agar form bisa dipilih dari data yang sudah ada,
     * bukan diketik manual. Kegagalan salah satu sumber tidak boleh memblokir form.
     */
    useEffect(() => {
        getPurchaseOrders()
            .then((res) => {
                const rows = res.data?.data ?? res.data ?? [];
                setPoOptions(
                    (Array.isArray(rows) ? rows : [])
                        .map((row) => {
                            const value = pickNumber(row, 'customer_po_number', 'po_number', 'nomor_po');
                            if (!value) return null;
                            const date = toDateInputValue(row.po_date);
                            return { value, label: date ? `${value} — ${date}` : value };
                        })
                        .filter(Boolean)
                );
            })
            .catch((err) => {
                console.error('Gagal mengambil data Purchase Order:', err);
                setPoOptions([]);
            });

        getSalesOrders()
            .then((res) => {
                const rows = res.data?.data ?? res.data ?? [];
                setSoOptions(
                    (Array.isArray(rows) ? rows : [])
                        .map((row) => {
                            const value = pickNumber(row, 'so_number', 'nomor_so');
                            if (!value) return null;
                            const date = toDateInputValue(row.so_date);
                            const customer = row.customer_name || row.quotation?.customer_name || '';
                            const suffix = [date, customer].filter(Boolean).join(' — ');
                            return { value, label: suffix ? `${value} — ${suffix}` : value };
                        })
                        .filter(Boolean)
                );
            })
            .catch((err) => {
                console.error('Gagal mengambil data Sales Order:', err);
                setSoOptions([]);
            });

        getDeliveryOrders()
            .then((res) => {
                const rows = res.data?.data ?? res.data ?? [];
                setDoOptions(
                    (Array.isArray(rows) ? rows : [])
                        .map((row) => {
                            const value = pickNumber(row, 'do_number', 'nomor_do');
                            if (!value) return null;
                            const date = toDateInputValue(row.do_date);
                            const customer = row.customer_name || row.sales_order?.customer_name || '';
                            const suffix = [date, customer].filter(Boolean).join(' — ');
                            return { value, label: suffix ? `${value} — ${suffix}` : value };
                        })
                        .filter(Boolean)
                );
            })
            .catch((err) => {
                console.error('Gagal mengambil data Delivery Order:', err);
                setDoOptions([]);
            });
    }, []);

    /* ── Handler form Tambah/Edit ── */

    /** Buka form kosong untuk SPK baru (status default DRAFT). */
    const openAdd = () => {
        setEditingId(null);
        setEditingNumber('');
        setForm(EMPTY_FORM);
        setFormError('');
        setShowForm(true);
    };

    /** Buka form terisi dari baris yang dipilih. spk_number tetap read-only. */
    const openEdit = (row) => {
        setEditingId(row.id);
        setEditingNumber(row.spk_number || '');
        setForm({
            spk_date: toDateInputValue(row.spk_date),
            customer_id: row.customer_id || row.customer?.id || '',
            po_number: row.po_number || '',
            so_number: row.so_number || '',
            do_number: row.do_number || '',
            project_name: row.project_name || '',
            serial_no: row.serial_no || '',
            location: row.location || '',
            start_date: toDateInputValue(row.start_date),
            finish_date: toDateInputValue(row.finish_date),
            contractor: row.contractor || '',
            project_leader: row.project_leader || '',
            pic_ehs: row.pic_ehs || '',
            person_responsible: row.person_responsible || '',
            employee_count: row.employee_count ?? '',
            security_monitoring: row.security_monitoring || '',
            notes: row.notes || '',
            status: row.status || 'DRAFT',
        });
        setFormError('');
        setShowForm(true);
    };

    /** Tutup form dan bersihkan state-nya. */
    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setEditingNumber('');
        setForm(EMPTY_FORM);
        setFormError('');
    };

    /** Update satu field form. */
    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    /* ── Validasi frontend (backend tetap sumber validasi utama) ── */
    const validateForm = () => {
        if (!form.spk_date) return 'Tanggal SPK wajib diisi.';
        if (!form.customer_id) return 'Customer wajib dipilih.';
        if (!form.project_name.trim()) return 'Project / Deskripsi wajib diisi.';

        if (form.start_date && form.finish_date && form.finish_date < form.start_date) {
            return 'Tanggal Selesai tidak boleh lebih awal dari Tanggal Mulai.';
        }

        if (form.employee_count !== '' && form.employee_count !== null) {
            const count = Number(form.employee_count);
            if (Number.isNaN(count) || count < 0) return 'Jumlah Karyawan harus berupa angka 0 atau lebih.';
        }

        return '';
    };

    /** Kumpulkan pesan error dari response backend (422 errors / message / fallback). */
    const buildErrorMessage = (err, fallback) => {
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === 'object') {
            const messages = Object.values(data.errors).flat().filter(Boolean);
            if (messages.length) return messages.join(' ');
        }
        return data?.message || fallback;
    };

    /** Submit create/update. spk_number & id TIDAK pernah dikirim. */
    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;

        const validationError = validateForm();
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setSaving(true);
        setFormError('');

        try {
            const payload = {
                spk_date: form.spk_date,
                customer_id: Number(form.customer_id),
                po_number: form.po_number.trim() || null,
                so_number: form.so_number.trim() || null,
                do_number: form.do_number.trim() || null,
                project_name: form.project_name.trim(),
                serial_no: form.serial_no.trim() || null,
                location: form.location.trim() || null,
                start_date: form.start_date || null,
                finish_date: form.finish_date || null,
                contractor: form.contractor.trim() || null,
                project_leader: form.project_leader.trim() || null,
                pic_ehs: form.pic_ehs.trim() || null,
                person_responsible: form.person_responsible.trim() || null,
                employee_count: form.employee_count !== '' ? Number(form.employee_count) : null,
                security_monitoring: form.security_monitoring.trim() || null,
                notes: form.notes.trim() || null,
                status: form.status,
            };

            if (editingId) {
                await updateSpk(editingId, payload);
                swalToast('SPK berhasil diperbarui.', 'success');
            } else {
                await createSpk(payload);
                swalToast('SPK berhasil dibuat.', 'success');
            }

            closeForm();
            await fetchData();
        } catch (err) {
            setFormError(buildErrorMessage(err, 'Gagal menyimpan data SPK.'));
        } finally {
            setSaving(false);
        }
    };

    /** Hapus SPK dengan konfirmasi. Backend hanya mengizinkan status DRAFT. */
    const handleDelete = async (spk) => {
        const confirmed = await swalConfirm({
            title: 'Hapus SPK?',
            text: 'Apakah Anda yakin ingin menghapus SPK ini?',
            confirmText: 'Ya, hapus',
            danger: true,
        });
        if (!confirmed) return;

        try {
            await deleteSpk(spk.id);
            swalToast('SPK berhasil dihapus.', 'success');
            await fetchData();
        } catch (err) {
            swalError('Gagal menghapus SPK', buildErrorMessage(err, 'Gagal menghapus data SPK.'));
        }
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const statusBadge = (status) => {
        switch (status) {
            case 'OPEN':
                return 'bg-blue-100 text-blue-800';
            case 'IN_PROGRESS':
                return 'bg-amber-100 text-amber-800';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800';
            case 'CANCELLED':
                return 'bg-rose-100 text-rose-800';
            case 'DRAFT':
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    const columnCount = 12;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Surat Perintah Kerja (SPK)</h1>
                    <p className="text-sm text-slate-500">Daftar data induk pekerjaan operasional</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer disabled:cursor-not-allowed"
                    >
                        {loading ? 'Memuat...' : 'Muat Ulang'}
                    </button>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Tambah SPK
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex justify-between items-center gap-4">
                    <span>{error}</span>
                    <button
                        onClick={fetchData}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition whitespace-nowrap"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-slate-100">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                            <th className="p-4">No. SPK</th>
                            <th className="p-4">Tanggal</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">PO</th>
                            <th className="p-4">S/N</th>
                            <th className="p-4">Project/Deskripsi</th>
                            <th className="p-4">Lokasi</th>
                            <th className="p-4">Start</th>
                            <th className="p-4">Finish</th>
                            <th className="p-4">PIC</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-slate-400">Memuat data SPK...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-rose-500">Gagal memuat data. Silakan coba lagi.</td>
                            </tr>
                        ) : spks.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-slate-400">Belum ada data SPK.</td>
                            </tr>
                        ) : (
                            spks.map((spk) => (
                                <tr key={spk.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-semibold text-slate-700">{spk.spk_number || '-'}</td>
                                    <td className="p-4">{formatDate(spk.spk_date)}</td>
                                    <td className="p-4">{spk.customer?.customer_name || spk.customer_name || '-'}</td>
                                    <td className="p-4">{spk.po_number || '-'}</td>
                                    <td className="p-4">{spk.serial_no || '-'}</td>
                                    <td className="p-4">{spk.project_name || '-'}</td>
                                    <td className="p-4">{spk.location || '-'}</td>
                                    <td className="p-4">{formatDate(spk.start_date)}</td>
                                    <td className="p-4">{formatDate(spk.finish_date)}</td>
                                    <td className="p-4">{spk.person_responsible || spk.project_leader || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(spk.status)}`}>
                                            {spk.status || 'DRAFT'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEdit(spk)}
                                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(spk)}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ─── Modal Form Tambah/Edit SPK ─── */}
            {showForm && (
                <Modal
                    title={editingId ? 'Edit Surat Perintah Kerja (SPK)' : 'Tambah Surat Perintah Kerja (SPK)'}
                    onClose={closeForm}
                >
                    <form onSubmit={submit} className="flex flex-col min-h-0">
                        <div className="overflow-y-auto px-6 py-5 space-y-6">
                            {/* 1. INFORMASI SPK */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi SPK</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Tanggal SPK <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            value={form.spk_date}
                                            onChange={(e) => handleFormChange('spk_date', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Customer <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={form.customer_id}
                                            onChange={(e) => handleFormChange('customer_id', e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="">-- Pilih Customer --</option>
                                            {customers.map((c) => (
                                                <option key={c.id} value={c.id}>{c.customer_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Nomor SPK</label>
                                        {editingId ? (
                                            <input
                                                type="text"
                                                readOnly
                                                value={editingNumber}
                                                className={`${inputCls} bg-slate-100 text-slate-500 font-semibold cursor-not-allowed`}
                                            />
                                        ) : (
                                            <p className="text-xs text-slate-500 bg-slate-50 border border-dashed rounded-xl px-3 py-2">
                                                Nomor SPK dibuat otomatis oleh sistem.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* 2. REFERENSI DOKUMEN */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Referensi Dokumen</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className={labelCls}>No. PO</label>
                                        <DocumentSearchSelect
                                            id="spk-po-options"
                                            value={form.po_number}
                                            onChange={(v) => handleFormChange('po_number', v)}
                                            options={poOptions}
                                            placeholder="Cari / pilih No. PO"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>No. SO</label>
                                        <DocumentSearchSelect
                                            id="spk-so-options"
                                            value={form.so_number}
                                            onChange={(v) => handleFormChange('so_number', v)}
                                            options={soOptions}
                                            placeholder="Cari / pilih No. SO"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>No. DO</label>
                                        <DocumentSearchSelect
                                            id="spk-do-options"
                                            value={form.do_number}
                                            onChange={(v) => handleFormChange('do_number', v)}
                                            options={doOptions}
                                            placeholder="Cari / pilih No. DO"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Ketik untuk mencari, atau pilih dari daftar dokumen yang sudah ada.
                                </p>
                            </section>

                            {/* 3. INFORMASI PEKERJAAN */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Pekerjaan</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Project / Deskripsi <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={form.project_name}
                                            onChange={(e) => handleFormChange('project_name', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>S/N</label>
                                        <input
                                            type="text"
                                            value={form.serial_no}
                                            onChange={(e) => handleFormChange('serial_no', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Lokasi</label>
                                        <input
                                            type="text"
                                            value={form.location}
                                            onChange={(e) => handleFormChange('location', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            value={form.start_date}
                                            onChange={(e) => handleFormChange('start_date', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tanggal Selesai</label>
                                        <input
                                            type="date"
                                            min={form.start_date || undefined}
                                            value={form.finish_date}
                                            onChange={(e) => handleFormChange('finish_date', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 4. PENANGGUNG JAWAB */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penanggung Jawab</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Contractor</label>
                                        <input
                                            type="text"
                                            value={form.contractor}
                                            onChange={(e) => handleFormChange('contractor', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Project Leader</label>
                                        <input
                                            type="text"
                                            value={form.project_leader}
                                            onChange={(e) => handleFormChange('project_leader', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>PIC EHS</label>
                                        <input
                                            type="text"
                                            value={form.pic_ehs}
                                            onChange={(e) => handleFormChange('pic_ehs', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Person Responsible</label>
                                        <input
                                            type="text"
                                            value={form.person_responsible}
                                            onChange={(e) => handleFormChange('person_responsible', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Jumlah Karyawan</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={form.employee_count}
                                            onChange={(e) => handleFormChange('employee_count', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 5. INFORMASI EHS / LAINNYA */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi EHS / Lainnya</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Security Monitoring</label>
                                        <textarea
                                            rows={2}
                                            value={form.security_monitoring}
                                            onChange={(e) => handleFormChange('security_monitoring', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Catatan</label>
                                        <textarea
                                            rows={3}
                                            value={form.notes}
                                            onChange={(e) => handleFormChange('notes', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Status</label>
                                        <select
                                            value={form.status}
                                            onChange={(e) => handleFormChange('status', e.target.value)}
                                            className={inputCls}
                                        >
                                            {SPK_STATUSES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {formError && (
                                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex-1 border py-2.5 rounded-xl text-sm hover:bg-slate-50 transition cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {saving ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
