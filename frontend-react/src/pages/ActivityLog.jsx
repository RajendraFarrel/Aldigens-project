import { ClipboardList, Info } from 'lucide-react';

const demoRows = [
  { time: '--', user: 'Demo User', activity: 'Contoh aktivitas UI', module: 'Network & Security', status: 'DUMMY' },
  { time: '--', user: 'System', activity: 'Contoh pencatatan aktivitas', module: 'Activity Log', status: 'DEVELOPMENT' },
];

export default function ActivityLog() {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-slate-700 p-2.5 rounded-xl shadow"><ClipboardList className="h-5 w-5 text-white" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Activity Log</h2>
          <p className="text-sm text-slate-500">Tampilan awal pencatatan aktivitas sistem.</p>
        </div>
      </div>
      <div className="p-4 rounded-xl border-amber-200 bg-amber-50 text-amber-800 text-sm flex gap-2 items-start">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" /> Data pada tabel ini adalah dummy/development dan bukan log aktivitas nyata.
      </div>
      <div className="bg-white border-slate-200 rounded-2xl shadow-sm overflow-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-slate-50"><tr>{['Waktu', 'User', 'Aktivitas', 'Modul', 'Status'].map((heading) => <th key={heading} className="p-3 text-left font-semibold text-slate-600">{heading}</th>)}</tr></thead>
          <tbody>{demoRows.map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3 text-slate-500">{row.time}</td><td className="p-3 text-slate-700">{row.user}</td><td className="p-3 text-slate-700">{row.activity}</td><td className="p-3 text-slate-700">{row.module}</td><td className="p-3"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold">{row.status}</span></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
