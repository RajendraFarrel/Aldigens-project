import { Activity, CircleHelp, Gauge, Server, Wifi } from 'lucide-react';

const metrics = [
  { label: 'Server Status', value: 'Not Monitored', icon: Server },
  { label: 'API Status', value: 'Not Monitored', icon: Activity },
  { label: 'Database Status', value: 'Not Monitored', icon: CircleHelp },
  { label: 'Response Time', value: '--', icon: Gauge },
  { label: 'Throughput', value: '--', icon: Activity },
  { label: 'Packet Loss', value: '--', icon: Wifi },
  { label: 'Availability', value: '--', icon: Gauge },
  { label: 'Client Terhubung', value: '--', icon: Wifi },
];

export default function NetworkMonitoring() {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow"><Activity className="h-5 w-5 text-white" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Network Monitoring</h2>
          <p className="text-sm text-slate-500">Dashboard pemantauan jaringan perusahaan.</p>
        </div>
      </div>
      <div className="p-4 rounded-xl border-amber-200 bg-amber-50 text-amber-800 text-sm">
        Monitoring backend belum tersedia. Nilai di bawah adalah placeholder dan bukan data real-time.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-500">{label}</span><Icon className="h-5 w-5 text-slate-400" /></div>
            <p className="text-xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
