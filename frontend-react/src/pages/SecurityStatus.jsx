import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

const statuses = [
  ['Authentication', 'UI only — backend status unavailable', KeyRound],
  ['Role & Permission', 'UI only — backend status unavailable', ShieldCheck],
  ['API Authorization', 'UI only — backend status unavailable', LockKeyhole],
  ['HTTPS', 'Not Monitored', LockKeyhole],
  ['Audit Log', 'UI only — backend status unavailable', CheckCircle2],
];

export default function SecurityStatus() {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow"><ShieldCheck className="h-5 w-5 text-white" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Security Status</h2>
          <p className="text-sm text-slate-500">Ringkasan kesiapan keamanan sistem.</p>
        </div>
      </div>
      <div className="p-4 rounded-xl border-amber-200 bg-amber-50 text-amber-800 text-sm">
        Halaman ini hanya tampilan status. Belum ada backend security monitoring yang terhubung.
      </div>
      <div className="bg-white border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
        {statuses.map(([label, status, Icon]) => (
          <div key={label} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-slate-400" /><span className="font-medium text-slate-800">{label}</span></div>
            <span className="text-xs font-medium text-slate-500 text-right">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
