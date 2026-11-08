import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, RefreshCw, ChevronLeft, ChevronRight, Printer,
  ArrowDownCircle, ArrowUpCircle, ArrowRightLeft
} from 'lucide-react';
import { getPeriodReport, getWeeklyReport } from '../services/api';
import PeriodFilter from '../components/PeriodFilter';
import {
  printAldigensDocument, makeReportNumber, getCurrentUserName,
  fmtDateTime, fmtQty, getPeriodRange, todayInput, sumQtyByUnit, PERIOD_OPTIONS,
} from '../utils/printAldigensDocument';

export default function InventoryReports() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('transactions'); // transactions | summary | stock

  // Filter periode (harian/mingguan/bulanan/tahunan/rentang).
  const [periodMode, setPeriodMode] = useState('weekly');
  const [periodDate, setPeriodDate] = useState(todayInput());
  const [periodStart, setPeriodStart] = useState(todayInput());
  const [periodEnd, setPeriodEnd] = useState(todayInput());

  const periodRange = useMemo(
    () => getPeriodRange(periodMode, { date: periodDate, start: periodStart, end: periodEnd }),
    [periodMode, periodDate, periodStart, periodEnd]
  );

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      // Mingguan tetap memakai endpoint lama agar kompatibel; periode lain memakai endpoint baru.
      const res = periodMode === 'weekly'
        ? await getWeeklyReport(periodDate)
        : await getPeriodReport({
            period: periodMode,
            date: periodDate,
            ...(periodMode === 'custom' ? { start_date: periodRange.start, end_date: periodRange.end } : {}),
          });
      setReport(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Laporan gagal dimuat.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, periodDate, periodRange.start, periodRange.end]);

  const shiftPeriod = (direction) => {
    const d = new Date(periodDate || todayInput());
    if (Number.isNaN(d.getTime())) return;
    if (periodMode === 'daily') d.setDate(d.getDate() + direction);
    else if (periodMode === 'weekly') d.setDate(d.getDate() + direction * 7);
    else if (periodMode === 'monthly') d.setMonth(d.getMonth() + direction);
    else if (periodMode === 'yearly') d.setFullYear(d.getFullYear() + direction);
    else return;
    const pad = (n) => String(n).padStart(2, '0');
    setPeriodDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  const formatDt = (dt) => fmtDateTime(dt);

  const rows = report?.weekly_transactions || [];
  const productSummary = report?.product_summary || [];
  const currentProducts = report?.current_products || [];

  // Statistik jenis mutasi dari data detail periode (bukan asumsi).
  const typeStats = useMemo(() => {
    const count = (type) => rows.filter((t) => t.transaction_type === type).length;
    const transferDocs = new Set(
      rows.filter((t) => t.transaction_type === 'TRANSFER').map((t) => t.reference_number || t.id)
    ).size;
    return {
      masuk: count('MASUK'),
      keluar: count('KELUAR'),
      transfer: transferDocs,
      adjustment: count('ADJUSTMENT'),
      produksi: count('PRODUKSI MASUK') + count('PRODUKSI KELUAR'),
      retur: count('RETURN'),
    };
  }, [rows]);

  /* Cetak Laporan Stok PDF: ringkasan, detail, ringkasan produk, snapshot stok. */
  const handlePrintReport = () => {
    const printedAt = new Date();

    printAldigensDocument({
      title: 'LAPORAN STOK INVENTORY',
      reportNumber: makeReportNumber('STK'),
      printedAt,
      printedBy: getCurrentUserName(),
      periodLabel: periodRange.label,
      metadataLeft: [
        { label: 'Jenis Periode', value: PERIOD_OPTIONS.find((p) => p.value === periodMode)?.label || periodMode, strong: true },
        { label: 'Total Transaksi', value: `${report?.total_transactions ?? rows.length}`, strong: true },
      ],
      metadataRight: [
        { label: 'Total Masuk', value: fmtQty(report?.total_in ?? 0) },
        { label: 'Total Keluar', value: fmtQty(report?.total_out ?? 0) },
      ],
      infoBox: [
        {
          label: 'Catatan Snapshot',
          value: 'Stok saat ini merupakan snapshot pada waktu laporan dicetak, bukan saldo historis akhir periode.',
          full: true,
        },
      ],
      sections: [
        {
          title: '1. RINGKASAN TRANSAKSI PERIODE',
          columns: [
            { header: 'Keterangan', width: '70%', value: (r) => r.label },
            { header: 'Jumlah', width: '30%', align: 'right', value: (r) => r.value },
          ],
          rows: [
            { label: 'Total Transaksi', value: `${report?.total_transactions ?? rows.length}` },
            { label: 'Transaksi Masuk (MASUK)', value: `${typeStats.masuk}` },
            { label: 'Transaksi Keluar (KELUAR)', value: `${typeStats.keluar}` },
            { label: 'Transfer (dokumen)', value: `${typeStats.transfer}` },
            { label: 'Adjustment', value: `${typeStats.adjustment}` },
            { label: 'Produksi', value: `${typeStats.produksi}` },
            { label: 'Return', value: `${typeStats.retur}` },
            ...sumQtyByUnit(rows.filter((t) => t.transaction_type === 'MASUK'), (t) => t.quantity, (t) => t.product?.unit || '-').map((s) => ({ label: `Qty masuk — ${s.label.replace('Total ', '')}`, value: s.value })),
            ...sumQtyByUnit(rows.filter((t) => t.transaction_type === 'KELUAR'), (t) => t.quantity, (t) => t.product?.unit || '-').map((s) => ({ label: `Qty keluar — ${s.label.replace('Total ', '')}`, value: s.value })),
          ],
        },
        {
          title: '2. DETAIL TRANSAKSI DALAM PERIODE',
          columns: [
            { header: 'No.', width: '5%', align: 'center', value: (r) => r._no },
            { header: 'Tanggal', width: '13%', value: (r) => fmtDateTime(r.transaction_time) },
            { header: 'Jenis', width: '11%', value: (r) => r.transaction_type },
            { header: 'Part Number', width: '14%', value: (r) => r.product?.part_number },
            { header: 'Nama Produk', width: '24%', value: (r) => r.product?.name },
            { header: 'Qty', width: '8%', align: 'right', value: (r) => fmtQty(r.quantity) },
            { header: 'Satuan', width: '8%', align: 'center', value: (r) => r.product?.unit },
            { header: 'Petugas', width: '17%', value: (r) => r.user_name },
          ],
          rows: rows.map((r, idx) => ({ ...r, _no: idx + 1 })),
          emptyMessage: 'Tidak ada transaksi pada periode yang dipilih.',
        },
        {
          title: '3. RINGKASAN PER PRODUK (PERIODE)',
          columns: [
            { header: 'No.', width: '5%', align: 'center', value: (r) => r._no },
            { header: 'Kode', width: '12%', value: (r) => r.product_code },
            { header: 'Part Number', width: '14%', value: (r) => r.part_number },
            { header: 'Nama Produk', width: '27%', value: (r) => r.name },
            { header: 'Kategori', width: '12%', value: (r) => r.category },
            { header: 'Satuan', width: '8%', align: 'center', value: (r) => r.unit },
            { header: 'Total Masuk', width: '11%', align: 'right', value: (r) => fmtQty(r.total_in) },
            { header: 'Total Keluar', width: '11%', align: 'right', value: (r) => fmtQty(r.total_out) },
          ],
          rows: productSummary.map((p, idx) => ({ ...p, _no: idx + 1 })),
          emptyMessage: 'Tidak ada pergerakan produk pada periode yang dipilih.',
        },
      ],
      notes: [
        `Periode laporan: ${periodRange.label}.`,
        'Stok saat ini merupakan snapshot pada waktu laporan dicetak, bukan saldo historis akhir periode.',
        'TRANSFER dihitung sebagai perpindahan, bukan barang masuk + barang keluar.',
        'Snapshot stok saat ini dicetak pada dokumen terpisah (Bagian 2).',
      ],
      summary: [
        { label: 'Total Transaksi', value: `${report?.total_transactions ?? rows.length}`, total: true },
        { label: 'Total Masuk', value: fmtQty(report?.total_in ?? 0) },
        { label: 'Total Keluar', value: fmtQty(report?.total_out ?? 0) },
        { label: 'Produk Bergerak', value: `${productSummary.length}` },
        { label: 'Produk Terdaftar', value: `${currentProducts.length}` },
      ],
      signatories: [
        { label: 'Dibuat Oleh', name: getCurrentUserName(), role: 'Administrator Inventory' },
        { label: 'Diperiksa Oleh', name: '........................', role: 'Kepala Gudang' },
      ],
      landscape: true,
      pageLabel: 'Bagian 1 dari 2 - Pergerakan Periode',
    });

    // Bagian 2: snapshot stok saat ini (dipisah agar tabel panjang tidak terpotong).
    printAldigensDocument({
      title: 'LAPORAN STOK INVENTORY - SNAPSHOT STOK',
      reportNumber: makeReportNumber('STK'),
      printedAt,
      printedBy: getCurrentUserName(),
      periodLabel: periodRange.label,
      metadataLeft: [
        { label: 'Jenis Laporan', value: 'Snapshot stok saat cetak', strong: true },
        { label: 'Produk Terdaftar', value: `${currentProducts.length}`, strong: true },
      ],
      metadataRight: [
        { label: 'Periode Acuan', value: periodRange.label },
      ],
      infoBox: [
        {
          label: 'Catatan Snapshot',
          value: 'Stok saat ini merupakan snapshot pada waktu laporan dicetak, bukan saldo historis akhir periode.',
          full: true,
        },
      ],
      sections: [
        {
          title: '4. SNAPSHOT STOK SAAT INI',
          columns: [
            { header: 'No.', width: '5%', align: 'center', value: (r) => r._no },
            { header: 'Kode', width: '13%', value: (r) => r.product_code },
            { header: 'Part Number', width: '15%', value: (r) => r.part_number },
            { header: 'Nama Produk', width: '34%', value: (r) => r.name },
            { header: 'Kategori', width: '13%', value: (r) => r.category },
            { header: 'Satuan', width: '8%', align: 'center', value: (r) => r.unit },
            { header: 'Stok', width: '12%', align: 'right', value: (r) => fmtQty(r.stock) },
          ],
          rows: currentProducts.map((p, idx) => ({ ...p, _no: idx + 1 })),
          emptyMessage: 'Belum ada produk terdaftar.',
        },
      ],
      notes: [
        'Stok saat ini merupakan snapshot pada waktu laporan dicetak, bukan saldo historis akhir periode.',
        'Dokumen ini melengkapi Bagian 1 (ringkasan, detail transaksi, dan ringkasan per produk).',
      ],
      summary: [
        { label: 'Produk Terdaftar', value: `${currentProducts.length}`, total: true },
        { label: 'Periode Acuan', value: periodRange.label },
      ],
      signatories: [
        { label: 'Dibuat Oleh', name: getCurrentUserName(), role: 'Administrator Inventory' },
        { label: 'Diperiksa Oleh', name: '........................', role: 'Kepala Gudang' },
      ],
      landscape: false,
      pageLabel: 'Bagian 2 dari 2 - Snapshot Stok',
    });
  };

  const periodTitle = PERIOD_OPTIONS.find((p) => p.value === periodMode)?.label || 'Mingguan';

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Laporan Stok</h2>
            <p className="text-xs text-slate-500">Rekap pergerakan barang — {periodTitle.toLowerCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            disabled={!report}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            title="Cetak laporan stok PDF"
          >
            <Printer className="h-4 w-4" /> Cetak Laporan Stok PDF
          </button>
          <button onClick={fetchReport} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer" title="Muat ulang">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Filter periode + navigasi */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter
          mode={periodMode}
          onModeChange={setPeriodMode}
          date={periodDate}
          onDateChange={setPeriodDate}
          start={periodStart}
          onStartChange={setPeriodStart}
          end={periodEnd}
          onEndChange={setPeriodEnd}
        />
        {['daily', 'weekly', 'monthly', 'yearly'].includes(periodMode) && (
          <div className="flex items-center gap-2">
            <button onClick={() => shiftPeriod(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer" title="Periode sebelumnya">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Periode Aktif</p>
              <p className="font-bold text-slate-800 text-sm">{periodRange.label}</p>
            </div>
            <button onClick={() => shiftPeriod(1)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer" title="Periode berikutnya">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 mb-1">Total Transaksi</p>
            <p className="text-2xl font-bold text-slate-800">{fmtQty(report.total_transactions)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-emerald-600 mb-1">Total Masuk</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtQty(report.total_in)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-rose-600 mb-1">Total Keluar</p>
            <p className="text-2xl font-bold text-rose-700">{fmtQty(report.total_out)}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        {[
          { key: 'transactions', label: 'Detail Transaksi' },
          { key: 'summary',      label: 'Ringkasan Produk' },
          { key: 'stock',        label: 'Stok Saat Ini' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin inline mr-2" />
          Memuat laporan...
        </div>
      ) : report ? (
        <>
          {/* Detail Transaksi */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Jenis</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.weekly_transactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada transaksi minggu ini.</td></tr>
                    ) : report.weekly_transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDt(t.transaction_time)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${
                            t.transaction_type === 'MASUK'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.transaction_type === 'TRANSFER'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {t.transaction_type === 'MASUK'
                              ? <ArrowDownCircle className="h-3 w-3" />
                              : t.transaction_type === 'TRANSFER'
                              ? <ArrowRightLeft className="h-3 w-3" />
                              : <ArrowUpCircle className="h-3 w-3" />
                            }
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{t.product?.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{t.product?.product_code}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtQty(t.quantity)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.user_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ringkasan Produk */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                      <th className="text-right px-4 py-3 font-semibold text-emerald-600">Total Masuk</th>
                      <th className="text-right px-4 py-3 font-semibold text-rose-600">Total Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.product_summary.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada data.</td></tr>
                    ) : report.product_summary.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.part_number || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.category || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">+{fmtQty(p.total_in)}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">-{fmtQty(p.total_out)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stok Saat Ini */}
          {activeTab === 'stock' && (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                Stok saat ini merupakan snapshot pada waktu laporan dicetak, bukan saldo historis akhir periode.
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kode</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Produk</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Satuan</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.current_products.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">{p.product_code}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.category || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${p.stock <= 0 ? 'text-red-500' : 'text-slate-800'}`}>
                            {p.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
