import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, ClipboardPlus, PackageMinus, Pencil, Plus, RefreshCw, Save,
  Search, Trash2, X,
} from 'lucide-react';
import {
  getInventoryMutations, getProducts, getWarehouses,
  receiveInventory, issueInventory, transferInventory,
  updateInventoryMutation, deleteInventoryMutation,
} from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const CONFIG = {
  receive: {
    label: 'Penerimaan Barang',
    referenceType: 'RECEIVE',
    icon: ClipboardPlus,
    color: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  issue: {
    label: 'Pengeluaran Barang',
    referenceType: 'ISSUE',
    icon: PackageMinus,
    color: 'text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
  transfer: {
    label: 'Transfer Lokasi',
    referenceType: 'TRANSFER',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

const EMPTY = {
  barcode: '',
  quantity: 1,
  warehouse_id: '',
  warehouse_location_id: '',
  source_warehouse_id: '',
  source_location_id: '',
  destination_warehouse_id: '',
  destination_location_id: '',
  reference_number: '',
  notes: '',
};

/* ─── Modal ─── */
function Modal({ title, subtitle, icon: Icon, iconColor, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition" type="button">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
const labelClass = 'text-xs font-semibold text-slate-600';

export default function InventoryWarehouse({ operation = 'receive' }) {
  const config = CONFIG[operation] ?? CONFIG.receive;
  const isTransfer = operation === 'transfer';
  const Icon = config.icon;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  const pagination = usePagination(rows, 10);

  const load = useCallback(async () => {
    try {
      const [mutationRes, productRes, warehouseRes] = await Promise.all([
        getInventoryMutations({ reference_types: config.referenceType, search: search || undefined }),
        getProducts(),
        getWarehouses(),
      ]);
      setRows(mutationRes.data?.data || []);
      setProducts(productRes.data?.data || []);
      setWarehouses(warehouseRes.data?.data || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Data gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [config.referenceType, search]);

  // Debounce pencarian agar tidak memanggil API setiap ketikan.
  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const locations = (id) => warehouses.find(w => String(w.id) === String(id))?.locations || [];

  const openAdd = () => {
    setEditingKey(null);
    setForm(EMPTY);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (row) => {
    const p = row.product || {};
    setEditingKey(row.group_key);
    setForm({
      ...EMPTY,
      barcode: p.barcode || p.part_number || '',
      quantity: row.quantity,
      reference_number: row.reference_number || '',
      notes: row.notes || '',
      warehouse_id: row.warehouse?.id || '',
      warehouse_location_id: row.location?.id || '',
      source_warehouse_id: row.warehouse?.id || '',
      source_location_id: row.location?.id || '',
      destination_warehouse_id: row.destination_warehouse?.id || '',
      destination_location_id: row.destination_location?.id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingKey(null);
    setForm(EMPTY);
    setFormError('');
  };

  const buildPayload = () => {
    const quantity = Number(form.quantity);
    const base = {
      quantity,
      reference_type: config.referenceType,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    };
    if (isTransfer) {
      return {
        ...base,
        barcode: form.barcode,
        source_warehouse_id: form.source_warehouse_id,
        source_location_id: form.source_location_id || null,
        destination_warehouse_id: form.destination_warehouse_id,
        destination_location_id: form.destination_location_id || null,
      };
    }
    return {
      ...base,
      barcode: form.barcode,
      warehouse_id: form.warehouse_id || null,
      warehouse_location_id: form.warehouse_location_id || null,
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setMessage('');
    try {
      const payload = buildPayload();
      let response;
      if (editingKey) {
        response = await updateInventoryMutation(editingKey, payload);
      } else if (operation === 'receive') {
        response = await receiveInventory(payload);
      } else if (operation === 'issue') {
        response = await issueInventory(payload);
      } else {
        response = await transferInventory(payload);
      }
      setMessage(response.data?.message || `${config.label} berhasil disimpan.`);
      closeModal();
      setLoading(true);
      await load();
    } catch (e) {
      setFormError(
        e.response?.data?.message ||
        Object.values(e.response?.data?.errors || {}).flat()[0] ||
        'Transaksi gagal disimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const doc = row.reference_number || 'tanpa nomor dokumen';
    if (!window.confirm(`Hapus ${config.label} ${doc}? Stok akan dikembalikan ke saldo sebelum transaksi.`)) return;
    setLoading(true);
    try {
      const response = await deleteInventoryMutation(row.group_key);
      setMessage(response.data?.message || 'Transaksi berhasil dihapus.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Transaksi gagal dihapus.');
    }
  };

  /* ── Field lokasi di modal ── */
  const warehouseFields = (key, locationKey, title) => (
    <div className="space-y-1">
      <label className={labelClass}>{title} <span className="text-red-500">*</span></label>
      <div className="grid grid-cols-2 gap-2">
        <select
          required
          value={form[key]}
          onChange={e => { set(key, e.target.value); set(locationKey, ''); }}
          className={inputClass}
        >
          <option value="">Pilih Warehouse</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
        </select>
        <select value={form[locationKey]} onChange={e => set(locationKey, e.target.value)} className={inputClass}>
          <option value="">Saldo umum / tanpa lokasi</option>
          {locations(form[key]).map(l => (
            <option key={l.id} value={l.id}>{l.code}{l.name ? ` — ${l.name}` : ''}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const selectedProduct = useMemo(
    () => products.find(p => (p.barcode || p.part_number || p.product_code) === form.barcode),
    [products, form.barcode]
  );

  const columns = useMemo(() => {
    const base = [
      {
        header: 'Dokumen', render: r => (
          <div>
            <p className="font-mono font-semibold text-slate-800">{r.reference_number || '-'}</p>
            <p className="text-xs text-slate-400">
              {r.transaction_time ? new Date(r.transaction_time).toLocaleString('id-ID') : '-'}
            </p>
          </div>
        )
      },
      {
        header: 'Part Number', render: r => (
          <div>
            <p className="font-mono font-medium text-blue-600">{r.product?.part_number || '-'}</p>
            <p className="text-xs text-slate-500 max-w-[220px] truncate">{r.product?.name || '-'}</p>
          </div>
        )
      },
    ];

    if (isTransfer) {
      base.push(
        {
          header: 'Dari', render: r => (
            <div className="text-sm">
              <p className="font-semibold text-slate-700">{r.warehouse?.name || '-'}</p>
              <p className="text-xs text-slate-500">{r.location?.code || 'Saldo umum'}</p>
            </div>
          )
        },
        {
          header: 'Ke', render: r => (
            <div className="text-sm">
              <p className="font-semibold text-slate-700">{r.destination_warehouse?.name || '-'}</p>
              <p className="text-xs text-slate-500">{r.destination_location?.code || 'Saldo umum'}</p>
            </div>
          )
        }
      );
    } else {
      base.push({
        header: 'Warehouse', render: r => (
          <div className="text-sm">
            <p className="font-semibold text-slate-700">{r.warehouse?.name || 'Warehouse Utama'}</p>
            <p className="text-xs text-slate-500">{r.location?.code || 'Saldo umum'}</p>
          </div>
        )
      });
    }

    base.push(
      {
        header: 'Qty', render: r => (
          <span className="font-semibold text-slate-800">{r.quantity} {r.product?.unit || ''}</span>
        )
      },
      {
        header: 'Stok', render: r => (
          <div className="text-sm">
            <p className="text-slate-600">
              {r.stock_before} → <span className="font-semibold text-slate-800">{r.stock_after}</span>
            </p>
            <p className="text-xs text-slate-400">Total {r.product?.stock ?? 0}</p>
          </div>
        )
      },
      { header: 'Keterangan', render: r => <span className="text-sm text-slate-500">{r.notes || '-'}</span> }
    );

    return base;
  }, [isTransfer]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${config.color}`} />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{config.label}</h2>
            <p className="text-sm text-slate-500">Kelola mutasi stok, edit, dan hapus dengan pembalikan saldo otomatis.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAdd}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.button} text-white text-sm transition shadow-sm`}
          >
            <Plus className="w-4 h-4" />Tambah {config.label}
          </button>
          <button onClick={() => { setLoading(true); load(); }} className="p-2 border rounded-lg hover:bg-slate-50 transition" title="Muat ulang">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pencarian */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => { setLoading(true); setSearch(e.target.value); }}
          placeholder="Cari dokumen, part number, atau keterangan..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((c, i) => (
                    <th key={i} className="text-left p-4 font-semibold text-slate-600 whitespace-nowrap">{c.header}</th>
                  ))}
                  <th className="p-4 font-semibold text-slate-600 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map(row => (
                  <tr key={row.group_key} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    {columns.map((c, i) => (
                      <td key={i} className="p-4">{c.render(row)}</td>
                    ))}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-12 text-center text-slate-400">
                      Belum ada data {config.label.toLowerCase()}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* Modal Tambah / Edit */}
      {showModal && (
        <Modal
          title={editingKey ? `Edit ${config.label}` : `Tambah ${config.label}`}
          subtitle={editingKey ? 'Perubahan membatalkan mutasi lama lalu menerapkan data baru.' : 'Isi detail mutasi stok di bawah ini.'}
          icon={Icon}
          iconColor={config.color}
          onClose={closeModal}
        >
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass}>Part Number / Barcode <span className="text-red-500">*</span></label>
              <select required value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputClass}>
                <option value="">Pilih Part Number / Barcode</option>
                {products.map(p => {
                  const code = p.barcode || p.part_number || p.product_code;
                  return <option key={p.id} value={code}>{p.part_number || p.product_code} — {p.name} (stok {p.stock})</option>;
                })}
              </select>
              {selectedProduct && (
                <p className="text-xs text-slate-500">
                  Stok saat ini: <span className="font-semibold text-slate-700">{selectedProduct.stock}</span> {selectedProduct.unit || ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                <input required type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Nomor Dokumen</label>
                <input value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Contoh: PO-2026-001" className={inputClass} />
              </div>
            </div>

            {isTransfer ? (
              <div className="space-y-3">
                {warehouseFields('source_warehouse_id', 'source_location_id', 'Warehouse Sumber')}
                {warehouseFields('destination_warehouse_id', 'destination_location_id', 'Warehouse Tujuan')}
              </div>
            ) : (
              warehouseFields('warehouse_id', 'warehouse_location_id', 'Warehouse')
            )}

            <div className="space-y-1">
              <label className={labelClass}>Keterangan</label>
              <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan transaksi" className={inputClass} />
            </div>

            {formError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 border border-slate-300 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
                Batal
              </button>
              <button
                disabled={saving}
                className={`flex-1 ${config.button} text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : editingKey ? 'Simpan Perubahan' : `Tambah ${config.label}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}