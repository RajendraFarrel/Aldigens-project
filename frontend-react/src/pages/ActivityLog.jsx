import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Info, RefreshCw } from 'lucide-react';
import { getActivityLogs } from '../services/api';

/**
 * Activity Log — data nyata dari tabel activity_logs (read-only).
 * Endpoint: GET /api/security/activity-logs (permission security.activity_logs.view).
 * Tidak ada tombol edit/hapus: log bersifat append-only untuk pengguna biasa.
 */
export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActivityLogs({ limit: 200 });
      setRows(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal memuat activity log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = filter.toLowerCase();
    return !q
      || (r.activity || '').toLowerCase().includes(q)
      || (r.user_email || '').toLowerCase().includes(q)
      || (r.module || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-700 p-2.5 rounded-xl shadow"><ClipboardList className="h-5 w-5 text-white" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Activity Log</h2>
            <p className="text-sm text-slate-500">Jejak aktivitas keamanan (append-only, read-only).</p>
          </div>
        </div>
        <button
          onClick={load}
          className="p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border-rose-200 bg-rose-50 text-rose-700 text-sm flex gap-2 items-start">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className="p-4 rounded-xl border-amber-200 bg-amber-50 text-amber-800 text-sm flex gap-2 items-start">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" /> Belum ada aktivitas tercatat
          (atau migration tabel activity_logs belum dijalankan).
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari aktivitas, user, modul..."
            className="w-full max-w-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {['Waktu', 'User', 'Aktivitas', 'Modul', 'Referensi', 'Status'].map((heading) => (
                <th key={heading} className="p-3 text-left font-semibold text-slate-600 dark:text-slate-400">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Memuat activity log...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tidak ada data yang cocok.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-3 text-slate-500 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{row.user_email || '-'}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{row.activity}{row.description ? ` — ${row.description}` : ''}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{row.module || '-'}</td>
                <td className="p-3 text-slate-500 text-xs">{row.reference_type ? `${row.reference_type}#${row.reference_id ?? ''}` : '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    row.result === 'failed'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  }`}>{String(row.result || '').toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
