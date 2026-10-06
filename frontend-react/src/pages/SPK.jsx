import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { getCustomers } from '../services/api';

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

        const token = localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await axios.get('http://127.0.0.1:8000/api/spks', { headers });
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
