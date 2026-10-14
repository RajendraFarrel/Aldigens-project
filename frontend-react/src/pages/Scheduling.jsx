import React, { useState, useEffect, useMemo } from 'react';
import { getSpkSchedules } from '../services/api';

/**
 * Halaman Penjadwalan — daftar jadwal pekerjaan operasional berdasarkan SPK.
 *
 * Sumber data: GET /api/spk-schedules (data asli dari backend, tanpa dummy/localStorage).
 * Tahap 4D-1 hanya menampilkan data (read-only): belum ada form Tambah/Edit/Delete.
 */

/** Status lifecycle jadwal — mengikuti konstanta di backend. */
const SCHEDULE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'DONE', 'POSTPONED', 'CANCELLED'];

/** Warna badge status, konsisten dengan pola halaman SPK. */
const statusBadge = (status) => {
    switch (status) {
        case 'SCHEDULED':
            return 'bg-blue-100 text-blue-800';
        case 'IN_PROGRESS':
            return 'bg-amber-100 text-amber-800';
        case 'DONE':
            return 'bg-emerald-100 text-emerald-800';
        case 'POSTPONED':
            return 'bg-orange-100 text-orange-800';
        case 'CANCELLED':
            return 'bg-rose-100 text-rose-800';
        default:
            return 'bg-slate-100 text-slate-700';
    }
};

export default function Scheduling() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter dasar: pencarian teks & filter status (dilakukan di sisi klien).
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Helper API resmi (token dilampirkan otomatis oleh interceptor di services/api.js).
            const res = await getSpkSchedules();
            const data = res.data?.data ?? res.data ?? [];
            setSchedules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal mengambil data penjadwalan:', err);
            setError(
                err.response?.data?.message ||
                'Gagal mengambil data penjadwalan. Pastikan server backend berjalan dan Anda memiliki akses.'
            );
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /** Format tanggal Indonesia yang mudah dibaca, mis. "30 Sep 2026". */
    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    /** Gabungkan jam mulai & selesai; "-" bila keduanya kosong. */
    const formatTime = (start, end) => {
        const s = start ? String(start).substring(0, 5) : '';
        const e = end ? String(end).substring(0, 5) : '';
        if (!s && !e) return '-';
        if (s && e) return `${s} - ${e}`;
        return s || e;
    };

    /** Kumpulkan nama personel dari relasi assignments.employee.employee_name. */
    const getPersonnel = (schedule) => {
        const assignments = Array.isArray(schedule.assignments) ? schedule.assignments : [];
        const names = assignments
            .map((a) => a?.employee?.employee_name)
            .filter(Boolean);
        return names;
    };

    /** Normalisasi progress ke persen 0-100 untuk tampilan. */
    const getProgress = (value) => {
        const num = Number(value);
        if (isNaN(num)) return 0;
        // Mendukung nilai 0-100 maupun 0-1 (rasio).
        const pct = num <= 1 && num > 0 ? num * 100 : num;
        return Math.max(0, Math.min(100, Math.round(pct)));
    };

    /* ── Filter data di sisi klien ── */
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return schedules.filter((s) => {
            // Filter status.
            if (statusFilter !== 'ALL' && (s.status || '') !== statusFilter) return false;

            if (!q) return true;

            // Pencarian pada field utama + relasi SPK.
            const haystack = [
                s.schedule_code,
                s.spk?.spk_number,
                s.spk?.project_name,
                s.spk?.serial_no,
                s.activity,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [schedules, search, statusFilter]);

    const columnCount = 12;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Penjadwalan</h1>
                    <p className="text-sm text-slate-500">Jadwal pekerjaan operasional berdasarkan SPK</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer disabled:cursor-not-allowed"
                    >
                        {loading ? 'Memuat...' : 'Muat Ulang'}
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

            {/* ─── Filter dasar: Search & Status ─── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari kode jadwal, No. SPK, project, aktivitas..."
                    className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="sm:w-56 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                    <option value="ALL">Semua Status</option>
                    {SCHEDULE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-slate-100">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                            <th className="p-4">No.</th>
                            <th className="p-4">Kode Jadwal</th>
                            <th className="p-4">No. SPK</th>
                            <th className="p-4">Project</th>
                            <th className="p-4">Aktivitas</th>
                            <th className="p-4">Tanggal Rencana</th>
                            <th className="p-4">Jam</th>
                            <th className="p-4">Lokasi</th>
                            <th className="p-4">Personel</th>
                            <th className="p-4">Prioritas</th>
                            <th className="p-4">Progress</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-slate-400">Memuat data penjadwalan...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-rose-500">Gagal memuat data. Silakan coba lagi.</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount} className="p-4 text-center text-slate-400">
                                    {schedules.length === 0
                                        ? 'Belum ada data penjadwalan.'
                                        : 'Tidak ada data yang sesuai filter.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((schedule, index) => {
                                const personnel = getPersonnel(schedule);
                                const progress = getProgress(schedule.progress);

                                return (
                                    <tr key={schedule.id ?? index} className="hover:bg-slate-50 align-top">
                                        <td className="p-4 text-slate-500">{index + 1}</td>
                                        <td className="p-4 font-semibold text-slate-700">{schedule.schedule_code || '-'}</td>
                                        <td className="p-4">{schedule.spk?.spk_number || '-'}</td>
                                        <td className="p-4">{schedule.spk?.project_name || '-'}</td>
                                        <td className="p-4">{schedule.activity || '-'}</td>
                                        <td className="p-4">{formatDate(schedule.planned_date)}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            {formatTime(schedule.planned_start_time, schedule.planned_end_time)}
                                        </td>
                                        <td className="p-4">{schedule.location || '-'}</td>
                                        <td className="p-4">
                                            {personnel.length === 0 ? (
                                                '-'
                                            ) : (
                                                <div className="flex flex-col gap-0.5">
                                                    {personnel.map((name, i) => (
                                                        <span key={i} className="text-slate-700">{name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">{schedule.priority || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-600 whitespace-nowrap">{progress}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(schedule.status)}`}>
                                                {schedule.status || '-'}
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
    );
}
