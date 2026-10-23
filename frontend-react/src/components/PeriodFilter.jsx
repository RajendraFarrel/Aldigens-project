import { CalendarDays } from 'lucide-react';
import { PERIOD_OPTIONS, getPeriodRange } from '../utils/printAldigensDocument';

/**
 * Kontrol periode laporan yang dipakai ulang antar halaman Inventory.
 * Nilai tanggal selalu 'YYYY-MM-DD' (lokal), tanpa konversi UTC.
 *
 * @param {{
 *   mode: string,
 *   onModeChange: (mode: string) => void,
 *   date: string,
 *   onDateChange: (date: string) => void,
 *   start: string,
 *   onStartChange: (date: string) => void,
 *   end: string,
 *   onEndChange: (date: string) => void,
 *   className?: string
 * }} props
 */
export default function PeriodFilter({
  mode,
  onModeChange,
  date,
  onDateChange,
  start,
  onStartChange,
  end,
  onEndChange,
  className = '',
}) {
  const range = getPeriodRange(mode, { date, start, end });
  const inputClass =
    'border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <CalendarDays className="h-4 w-4 text-slate-400" /> Periode
      </span>

      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value)}
        className={inputClass}
        title="Pilih jenis periode"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {mode === 'custom' ? (
        <>
          <input type="date" value={start} onChange={(e) => onStartChange(e.target.value)} className={inputClass} title="Tanggal awal" />
          <span className="text-xs text-slate-400">s/d</span>
          <input type="date" value={end} onChange={(e) => onEndChange(e.target.value)} className={inputClass} title="Tanggal akhir" />
        </>
      ) : (
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={inputClass}
          title={mode === 'yearly' ? 'Pilih tahun (bulan/tanggal diabaikan)' : 'Tanggal acuan periode'}
        />
      )}

      <span className="text-xs text-slate-500">
        {range.start === range.end ? range.label : `${range.label}`}
      </span>
    </div>
  );
}
