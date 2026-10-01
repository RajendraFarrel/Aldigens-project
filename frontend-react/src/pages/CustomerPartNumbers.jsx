import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Pencil, Plus, Printer, Search, Trash2, Upload, X } from 'lucide-react';
import {
  createCustomerPartNumber, deleteCustomerPartNumber,
  downloadCustomerPartNumbersTemplate, exportCustomerPartNumbers,
  getCustomerPartNumbers, getCustomers,
  importCustomerPartNumbers, updateCustomerPartNumber,
} from '../services/api';
import { swalError, swalToast } from '../utils/swal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const EMPTY_FORM = { customer_id: '', part_number: '', item_description: '', selling_price: '', status: 'AKTIF' };

/* ─── Modal overlay kecil ─── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-[fadeUp_.2s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CustomerPartNumbers() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form CRUD
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Import modal
  const [showImport, setShowImport]       = useState(false);
  const [file, setFile]                   = useState(null);
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState(null);
  const [importError, setImportError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomerPartNumbers({ search, customer_id: customerId });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || {});
    } catch (e) {
      setError(e.response?.data?.message || 'Data gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [search, customerId]);

  useEffect(() => {
    getCustomers().then(res => setCustomers(res.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const pagination = usePagination(rows, 10);

  /* ── CRUD handlers ── */
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      customer_id:      row.customer_id || row.customer?.id || '',
      part_number:      row.part_number || '',
      item_description: row.item_description || '',
      selling_price:    row.selling_price || '',
      status:           row.status || 'AKTIF',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) return setFormError('Pilih customer terlebih dahulu.');
    if (!form.part_number.trim()) return setFormError('Part Number wajib diisi.');
    setSaving(true); setFormError('');
    try {
      const payload = {
        customer_id:      Number(form.customer_id),
        part_number:      form.part_number.trim().toUpperCase(),
        item_description: form.item_description.trim() || null,
        selling_price:    form.selling_price !== '' ? Number(form.selling_price) : null,
        status:           form.status,
      };
      if (editingId) {
        await updateCustomerPartNumber(editingId, payload);
        swalToast('Data berhasil diperbarui.', 'success');
      } else {
        await createCustomerPartNumber(payload);
        swalToast('Data berhasil ditambahkan.', 'success');
      }
      closeForm();
      load();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors || {}).flat().join(' ')
        : 'Gagal menyimpan data.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus part number "${row.part_number}" milik ${row.customer?.customer_name || ''}?`)) return;
    try {
      await deleteCustomerPartNumber(row.id);
      swalToast('Data berhasil dihapus.', 'success');
      load();
    } catch (err) {
      swalError('Gagal', err.response?.data?.message || 'Gagal menghapus data.');
    }
  };

  /* ── Import handlers ── */
  const importFile = async () => {
    if (!file) return setImportError('Pilih file Excel terlebih dahulu.');
    setImporting(true); setImportError(''); setImportResult(null);
    try {
      const res = await importCustomerPartNumbers(file);
      setImportResult(res.data);
      setFile(null);
      load();
      swalToast(`Import selesai: ${res.data.imported} data masuk.`, 'success');
    } catch (e) {
      setImportError(e.response?.data?.message || 'Import gagal.');
    } finally {
      setImporting(false);
    }
  };

  const download = async () => {
    const res = await exportCustomerPartNumbers();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([res.data]));
    a.download = 'data-customer.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadTemplate = async () => {
    try {
      const res = await downloadCustomerPartNumbersTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'template-import-data-customer.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      swalToast('Template berhasil diunduh.', 'success');
    } catch (e) {
      swalError('Gagal mengunduh', 'Tidak dapat mengunduh template import.');
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Customer</h2>
          <p className="text-sm text-slate-500">Database part number dan item berdasarkan customer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />Tambah
          </button>
          <button
            onClick={() => { setShowImport(true); setFile(null); setImportResult(null); setImportError(''); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition"
          >
            <Upload className="w-4 h-4" />Import Excel
          </button>
          <button onClick={download} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm transition">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm transition">
            <Printer className="w-4 h-4" />Print
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5">
          <p className="text-xs text-slate-500">Total Customer</p>
          <p className="text-3xl font-bold text-blue-600">{summary.total_customer || 0}</p>
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <p className="text-xs text-slate-500">Total Part Number</p>
          <p className="text-3xl font-bold text-blue-600">{summary.total_part_number || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Part Number / Item Description"
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Semua Customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Customer', 'Part Number', 'Item Description', 'Harga Jual', 'Status', 'Aksi'].map(h => (
                <th key={h} className={`p-4 font-semibold text-slate-600 ${h === 'Aksi' ? 'text-center' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">Memuat data...</td></tr>
              : pagination.paginatedItems.map(r => (
                <tr key={r.id} className="border-t hover:bg-slate-50/60 transition">
                  <td className="p-4 font-medium text-slate-800">{r.customer?.customer_name || '-'}</td>
                  <td className="p-4 font-mono text-blue-700 font-semibold">{r.part_number}</td>
                  <td className="p-4 text-slate-600">{r.item_description || '-'}</td>
                  <td className="p-4 text-slate-700">
                    {r.selling_price ? `Rp ${Number(r.selling_price).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
            {!loading && !rows.length && (
              <tr><td colSpan="6" className="p-10 text-center text-slate-400">Belum ada data. Klik <b>Tambah</b> atau <b>Import Excel</b>.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controller */}
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* ─── FORM Modal (Tambah / Edit) ─── */}
      {showForm && (
        <Modal title={editingId ? 'Edit Part Number' : 'Tambah Part Number'} onClose={closeForm}>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Customer <span className="text-red-500">*</span></label>
              <select
                required
                value={form.customer_id}
                onChange={e => setForm({ ...form, customer_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Part Number <span className="text-red-500">*</span></label>
              <input
                required
                placeholder="contoh: OPT-ALRM-SCAN-001"
                value={form.part_number}
                onChange={e => setForm({ ...form, part_number: e.target.value.toUpperCase() })}
                className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Item Description</label>
              <input
                placeholder="Nama / deskripsi barang"
                value={form.item_description}
                onChange={e => setForm({ ...form, item_description: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Harga Jual (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.selling_price}
                  onChange={e => setForm({ ...form, selling_price: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>
            </div>

            {formError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeForm} className="flex-1 border py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
                Batal
              </button>
              <button
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── IMPORT Modal ─── */}
      {showImport && (
        <Modal title="Import Data Customer" onClose={() => setShowImport(false)}>
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-3 rounded-xl leading-relaxed space-y-1.5">
              <p className="font-bold">✅ File PARTNUMBER_APP.xlsx asli langsung bisa di-upload!</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-700">
                <li>Nama sheet = nama customer (UNITED TRACTORS, KOBEXINDO, dll)</li>
                <li>Kolom Part Number, Description, Harga Jual dibaca otomatis</li>
                <li>Sheet ALL CUSTOMER dilewati otomatis</li>
              </ul>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4" />Download Template Excel (Opsional)
            </button>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => { setFile(e.target.files[0] || null); setImportResult(null); }}
              className="w-full border rounded-xl px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs"
            />
            {file && <p className="text-xs text-blue-600">File dipilih: {file.name}</p>}

            {importResult && (
              <div className="bg-slate-50 border rounded-xl p-3 text-sm space-y-1">
                <div>Berhasil diimpor: <b className="text-emerald-600">{importResult.imported}</b></div>
                <div>Dilewati: <b className="text-amber-600">{importResult.skipped}</b></div>
                {importResult.errors?.map((msg, i) => <p key={i} className="text-xs text-slate-500">{msg}</p>)}
              </div>
            )}
            {importError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{importError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowImport(false)} className="flex-1 border py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">Tutup</button>
              <button
                onClick={importFile}
                disabled={importing || !file}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition"
              >
                {importing ? 'Mengimpor...' : 'Mulai Import'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
