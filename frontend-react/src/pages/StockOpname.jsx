import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Printer, RefreshCw, Save } from 'lucide-react';
import { completeStockOpname, createStockOpname, getProducts, getStockOpnames, getWarehouses } from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import PeriodFilter from '../components/PeriodFilter';
import {
  printAldigensDocument, makeReportNumber, getCurrentUserName, fmtDateLong, fmtQty,
  getPeriodRange, isWithinRange, sumQtyByUnit, todayInput, isBlank, fmtText,
} from '../utils/printAldigensDocument';

export default function StockOpname() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({
    document_number: '',
    opname_date: new Date().toISOString().slice(0, 10),
    warehouse_id: '',
    items: []
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter periode (berdasarkan opname_date, bukan tanggal cetak).
  const [periodMode, setPeriodMode] = useState('monthly');
  const [periodDate, setPeriodDate] = useState(todayInput());
  const [periodStart, setPeriodStart] = useState(todayInput());
  const [periodEnd, setPeriodEnd] = useState(todayInput());
  const [statusFilter, setStatusFilter] = useState('');

  const periodRange = useMemo(
    () => getPeriodRange(periodMode, { date: periodDate, start: periodStart, end: periodEnd }),
    [periodMode, periodDate, periodStart, periodEnd]
  );

  const filteredRows = useMemo(
    () => rows.filter(
      (r) => isWithinRange(r.opname_date, periodRange.start, periodRange.end)
        && (!statusFilter || r.status === statusFilter)
    ),
    [rows, periodRange.start, periodRange.end, statusFilter]
  );

  const pagination = usePagination(filteredRows, 10);

  const load = useCallback(async () => {
    try {
      const [o, p, w] = await Promise.all([getStockOpnames(), getProducts(), getWarehouses()]);
      setRows(o.data?.data || []);
      setProducts(p.data?.data || []);
      setWarehouses(w.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Data stock opname gagal dimuat.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', physical_quantity: 0, notes: '' }]
    }));

  const updateItem = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createStockOpname({
        ...form,
        items: form.items.map((item) => ({
          ...item,
          product_id: Number(item.product_id),
          physical_quantity: Number(item.physical_quantity)
        }))
      });
      setMessage('Stock opname berhasil dibuat sebagai DRAFT.');
      setForm({
        document_number: '',
        opname_date: new Date().toISOString().slice(0, 10),
        warehouse_id: '',
        items: []
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Stock opname gagal dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (id) => {
    if (!window.confirm('Selesaikan stock opname dan lakukan adjustment?')) return;
    try {
      await completeStockOpname(id);
      setMessage('Stock opname selesai dan adjustment tercatat.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Stock opname gagal diselesaikan.');
    }
  };

  /* Cetak PDF Stock Opname — hanya MEMBACA data. Tidak menyelesaikan opname,
     tidak membuat adjustment, dan tidak mengubah stok. */
  const handlePrintReport = () => {
    const data = filteredRows;
    const printedAt = new Date();

    // Satu baris tabel = satu item opname, dengan dokumen dikelompokkan berurutan.
    const printRows = [];
    let no = 0;
    data.forEach((doc) => {
      (doc.items || []).forEach((item) => {
        no += 1;
        printRows.push({
          _no: no,
          document_number: doc.document_number,
          opname_date: doc.opname_date,
          warehouse: doc.warehouse?.name,
          status: doc.status,
          part_number: item.product?.part_number,
          name: item.product?.name,
          unit: item.product?.unit,
          location: item.warehouse_location_id ? `Lokasi #${item.warehouse_location_id}` : 'Saldo umum',
          system_quantity: item.system_quantity,
          physical_quantity: item.physical_quantity,
          difference: item.difference,
          notes: item.notes,
        });
      });
    });

    const allItems = data.flatMap((d) => d.items || []);
    const noDiff = allItems.filter((i) => Number(i.difference) === 0).length;
    const positive = allItems.filter((i) => Number(i.difference) > 0).length;
    const negative = allItems.filter((i) => Number(i.difference) < 0).length;
    const draft = data.filter((d) => d.status === 'DRAFT').length;
    const completed = data.filter((d) => d.status === 'COMPLETED').length;
    const correctionRows = allItems.map((i) => ({
      difference: Math.abs(Number(i.difference) || 0),
      product: i.product,
    }));

    printAldigensDocument({
      title: 'LAPORAN STOCK OPNAME',
      reportNumber: makeReportNumber('OPN'),
      printedAt,
      printedBy: getCurrentUserName(),
      periodLabel: periodRange.label,
      metadataLeft: [
        { label: 'Status', value: statusFilter || 'Semua Status', strong: true },
        { label: 'Jumlah Dokumen', value: `${data.length}` },
      ],
      metadataRight: [
        { label: 'DRAFT', value: `${draft}`, strong: true },
        { label: 'COMPLETED', value: `${completed}`, strong: true },
      ],
      infoBox: [
        { label: 'Periode Opname', value: periodRange.label },
        { label: 'Keterangan', value: 'DRAFT = belum diselesaikan (belum ada adjustment). COMPLETED = sudah diselesaikan sesuai proses opname.' },
      ],
      sections: [
        {
          title: 'DETAIL STOCK OPNAME',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
            { header: 'No. Dokumen', width: '11%', value: (r) => r.document_number },
            { header: 'Tgl Opname', width: '8%', align: 'center', value: (r) => (r.opname_date ? fmtDateLong(r.opname_date) : null) },
            { header: 'Warehouse', width: '12%', value: (r) => r.warehouse },
            { header: 'Status', width: '7%', align: 'center', value: (r) => r.status },
            { header: 'Part Number', width: '11%', value: (r) => r.part_number },
            { header: 'Nama Produk', width: '17%', value: (r) => r.name },
            { header: 'Lokasi', width: '8%', value: (r) => r.location },
            { header: 'Sistem', width: '5%', align: 'right', value: (r) => fmtQty(r.system_quantity) },
            { header: 'Fisik', width: '5%', align: 'right', value: (r) => fmtQty(r.physical_quantity) },
            { header: 'Selisih', width: '5%', align: 'right', value: (r) => fmtQty(r.difference) },
            { header: 'Ket.', width: '7%', value: (r) => r.notes },
          ],
          rows: printRows,
          emptyMessage: 'Tidak ada data stock opname pada periode/filter yang dipilih.',
        },
      ],
      notes: [
        `Total ${data.length} dokumen opname, ${allItems.length} item diperiksa.`,
        `Item tanpa selisih: ${noDiff} | Selisih positif: ${positive} | Selisih negatif: ${negative}.`,
        'Laporan ini hanya membaca data. Tidak menjalankan penyelesaian opname atau adjustment.',
      ],
      summary: [
        { label: 'Jumlah Dokumen', value: `${data.length}`, total: true },
        { label: 'DRAFT / COMPLETED', value: `${draft} / ${completed}` },
        { label: 'Item Diperiksa', value: `${allItems.length}` },
        { label: 'Tanpa Selisih', value: `${noDiff}` },
        { label: 'Selisih Positif', value: `${positive}` },
        { label: 'Selisih Negatif', value: `${negative}` },
        ...sumQtyByUnit(correctionRows, (r) => r.difference, (r) => r.product?.unit || '-'),
      ],
      signatories: [
        { label: 'Dibuat Oleh', name: getCurrentUserName(), role: 'Administrator Inventory' },
        { label: 'Diperiksa Oleh', name: '........................', role: 'Kepala Gudang' },
      ],
      landscape: true,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Stock Opname</h2>
          <p className="text-sm text-slate-500">Bandingkan stok sistem dengan stok fisik tanpa menghilangkan histori.</p>
        </div>
        <button onClick={load} className="p-2 border rounded-lg hover:bg-slate-50 transition cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white"
          title="Filter status opname"
        >
          <option value="">Semua Status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
        <button
          onClick={handlePrintReport}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm transition shadow-sm"
          title="Cetak PDF sesuai periode & filter status"
        >
          <Printer className="w-4 h-4" /> Cetak PDF Stock Opname
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{message}</div>}

      <form onSubmit={submit} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            required
            placeholder="Nomor dokumen"
            value={form.document_number}
            onChange={(e) => setForm({ ...form, document_number: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="date"
            value={form.opname_date}
            onChange={(e) => setForm({ ...form, opname_date: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            required
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pilih warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>

        {form.items.map((item, index) => (
          <div key={index} className="grid md:grid-cols-3 gap-3">
            <select
              required
              value={item.product_id}
              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Pilih item</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.part_number || p.product_code} — {p.name}
                </option>
              ))}
            </select>
            <input
              required
              min="0"
              type="number"
              value={item.physical_quantity}
              onChange={(e) => updateItem(index, 'physical_quantity', e.target.value)}
              placeholder="Stok fisik"
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={item.notes}
              onChange={(e) => updateItem(index, 'notes', e.target.value)}
              placeholder="Keterangan"
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" onClick={addItem} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 cursor-pointer">
            Tambah Item
          </button>
          <button
            disabled={saving || !form.items.length}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm flex gap-2 items-center disabled:opacity-60 hover:bg-blue-700 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Draft
          </button>
        </div>
      </form>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Dokumen</th>
                <th className="p-3 text-left font-semibold text-slate-600">Tanggal</th>
                <th className="p-3 text-left font-semibold text-slate-600">Warehouse</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3 text-center font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Belum ada stock opname pada periode/filter ini.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-700">{row.document_number}</td>
                    <td className="p-3 text-slate-600">{row.opname_date}</td>
                    <td className="p-3 text-slate-600">{row.warehouse?.name || '-'}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {row.status === 'DRAFT' && (
                        <button
                          onClick={() => complete(row.id)}
                          className="text-blue-600 hover:text-blue-800 transition p-1 hover:bg-blue-50 rounded"
                          title="Selesaikan Opname"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  );
}
