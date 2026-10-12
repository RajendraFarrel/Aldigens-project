import React, { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    createSpk,
    deleteSpk,
    getCustomers,
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

/* ─── Modal overlay (konsisten dengan CustomerPartNumbers / Warehouse) ─── */
function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition" type="button">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

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

export default function SPK() {
    const [spks, setSpks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data master untuk dropdown customer (diambil dari API, bukan hardcode).
    const [customers, setCustomers] = useState([]);

    // State form Tambah/Edit.
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Helper API resmi (token dilampirkan otomatis oleh interceptor di services/api.js).
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

    /* ── Handler form Tambah/Edit ── */

    /** Buka form kosong untuk SPK baru (status default DRAFT). */
    const openAdd = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowForm(true);
    };

    /** Buka form terisi dari baris yang dipilih. spk_number tetap read-only. */
    const openEdit = (row) => {
        setEditingId(row.id);
        setForm({
            spk_date: row.spk_date ? String(row.spk_date).substring(0, 10) : '',
            customer_id: row.customer_id || row.customer?.id || '',
            po_number: row.po_number || '',
            so_number: row.so_number || '',
            do_number: row.do_number || '',
            project_name: row.project_name || '',
            serial_no: row.serial_no || '',
            location: row.location || '',
            start_date: row.start_date ? String(row.start_date).substring(0, 10) : '',
            finish_date: row.finish_date ? String(row.finish_date).substring(0, 10) : '',
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
        setForm(EMPTY_FORM);
        setFormError('');
    };

    /** Update satu field form. */
    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    /**
     * Simpan SPK — dipakai untuk Tambah (POST) maupun Edit (PUT).
     * Nomor SPK TIDAK pernah dikirim; backend yang membuatnya.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // ── Validasi sebelum request API ──
        if (!form.spk_date) {
            setFormError('Tanggal SPK wajib diisi.');
            return;
        }
        if (!form.customer_id) {
            setFormError('Customer wajib dipilih.');
            return;
        }
        if (!form.project_name.trim()) {
            setFormError('Project / Deskripsi wajib diisi.');
            return;
        }
        if (form.start_date && form.finish_date && form.finish_date < form.start_date) {
            setFormError('Tanggal Selesai tidak boleh lebih awal dari Tanggal Mulai.');
            return;
        }
        if (form.employee_count !== '' && Number(form.employee_count) < 0) {
            setFormError('Jumlah Karyawan tidak boleh negatif.');
            return;
        }

        // Cegah double submit.
        if (saving) return;

        setSaving(true);
        setFormError('');

        try {
            // Payload: TANPA spk_number dan TANPA id.
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

            if (editingId === null) {
                await createSpk(payload);
                swalToast('SPK berhasil dibuat.', 'success');
            } else {
                await updateSpk(editingId, payload);
                swalToast('SPK berhasil diperbarui.', 'success');
            }

            closeForm();
            fetchData();
        } catch (err) {
            // Prioritaskan detail validasi 422 jika ada.
            const validationErrors = err.response?.data?.errors;
            if (validationErrors && typeof validationErrors === 'object') {
                const messages = Object.values(validationErrors).flat().filter(Boolean);
                setFormError(
                    messages.length
                        ? messages.join(' ')
                        : err.response?.data?.message || 'Gagal menyimpan data SPK.'
                );
            } else {
                setFormError(err.response?.data?.message || 'Gagal menyimpan data SPK.');
            }
        } finally {
            setSaving(false);
        }
    };

    /** Hapus SPK — backend menentukan apakah data boleh dihapus. */
    const handleDelete = async (spk) => {
        const ok = await swalConfirm({
            title: 'Hapus SPK?',
            text: `SPK "${spk.spk_number || '-'}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            danger: true,
        });
        if (!ok) return;

        try {
            await deleteSpk(spk.id);
            swalToast('SPK berhasil dihapus.', 'success');
            fetchData();
        } catch (err) {
            swalError('Gagal menghapus', err.response?.data?.message || 'Gagal menghapus data SPK.');
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

    /* Kelas label & input agar konsisten di seluruh form. */
    const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';
    const inputCls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

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
                                                type="button"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(spk)}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                                                title="Hapus"
                                                type="button"
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

            {/* ─── Modal Form Tambah / Edit SPK ─── */}
            {showForm && (
                <Modal
                    title={editingId ? 'Edit Surat Perintah Kerja (SPK)' : 'Tambah Surat Perintah Kerja (SPK)'}
                    onClose={closeForm}
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Nomor SPK: dibuat backend, hanya ditampilkan read-only saat edit. */}
                        {editingId === null ? (
                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                Nomor SPK dibuat otomatis oleh sistem.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                <label className={labelCls}>No. SPK</label>
                                <input
                                    value={editingId ? (spks.find((s) => s.id === editingId)?.spk_number || '') : ''}
                                    readOnly
                                    disabled
                                    className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`}
                                />
                            </div>
                        )}

                        {/* ── INFORMASI SPK ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informasi SPK</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className={labelCls}>Tanggal SPK <span className="text-rose-500">*</span></label>
                                    <input
                                        type="date"
                                        value={form.spk_date}
                                        onChange={(e) => handleFormChange('spk_date', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Customer <span className="text-rose-500">*</span></label>
                                    <select
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
                            </div>
                        </div>

                        {/* ── REFERENSI DOKUMEN ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referensi Dokumen</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className={labelCls}>No. PO</label>
                                    <input
                                        value={form.po_number}
                                        onChange={(e) => handleFormChange('po_number', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>No. SO</label>
                                    <input
                                        value={form.so_number}
                                        onChange={(e) => handleFormChange('so_number', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>No. DO</label>
                                    <input
                                        value={form.do_number}
                                        onChange={(e) => handleFormChange('do_number', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── INFORMASI PEKERJAAN ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informasi Pekerjaan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1 md:col-span-2">
                                    <label className={labelCls}>Project / Deskripsi <span className="text-rose-500">*</span></label>
                                    <input
                                        value={form.project_name}
                                        onChange={(e) => handleFormChange('project_name', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>S/N</label>
                                    <input
                                        value={form.serial_no}
                                        onChange={(e) => handleFormChange('serial_no', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Lokasi</label>
                                    <input
                                        value={form.location}
                                        onChange={(e) => handleFormChange('location', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => handleFormChange('start_date', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={form.finish_date}
                                        onChange={(e) => handleFormChange('finish_date', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── PENANGGUNG JAWAB ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penanggung Jawab</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className={labelCls}>Contractor</label>
                                    <input
                                        value={form.contractor}
                                        onChange={(e) => handleFormChange('contractor', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Project Leader</label>
                                    <input
                                        value={form.project_leader}
                                        onChange={(e) => handleFormChange('project_leader', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>PIC EHS</label>
                                    <input
                                        value={form.pic_ehs}
                                        onChange={(e) => handleFormChange('pic_ehs', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Person Responsible</label>
                                    <input
                                        value={form.person_responsible}
                                        onChange={(e) => handleFormChange('person_responsible', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
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
                        </div>

                        {/* ── INFORMASI EHS / LAINNYA ── */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informasi EHS / Lainnya</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className={labelCls}>Security Monitoring</label>
                                    <input
                                        value={form.security_monitoring}
                                        onChange={(e) => handleFormChange('security_monitoring', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
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
                                <div className="space-y-1 md:col-span-2">
                                    <label className={labelCls}>Catatan</label>
                                    <textarea
                                        rows={3}
                                        value={form.notes}
                                        onChange={(e) => handleFormChange('notes', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {formError && (
                            <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{formError}</p>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex-1 border py-2.5 rounded-xl text-sm hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
