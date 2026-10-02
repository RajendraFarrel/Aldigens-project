import React, { useState, useEffect, useCallback } from 'react';
import {
  History, RefreshCw, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft,
  SlidersHorizontal, Filter as FilterIcon,
} from 'lucide-react';
import { getTransactions } from '../services/api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

/**
 * Warna & ikon per jenis mutasi.
 * MASUK  -> hijau   (barang bertambah)
 * KELUAR -> merah   (barang berkurang)
 * TRANSFER -> biru   (pindah lokasi, bukan keluar dari gudang)
 * ADJUSTMENT -> abu  (koreksi stok)
 */
const TYPE_CONFIG = {
  MASUK:      { badge: 'bg-emerald-100 text-emerald-700', icon: ArrowDownCircle,  text: 'text-emerald-600', button: 'bg-emerald-600 border-emerald-600' },
  KELUAR:     { badge: 'bg-rose-100 text-rose-700',       icon: ArrowUpCircle,    text: 'text-rose-600',    button: 'bg-rose-600 border-rose-600' },
  TRANSFER:   { badge: 'bg-blue-100 text-blue-700',         icon: ArrowRightLeft,   text: 'text-blue-600',    button: 'bg-blue-600 border-blue-600' },
  ADJUSTMENT: { badge: 'bg-slate-200 text-slate-700',       icon: SlidersHorizontal, text: 'text-slate-600',  button: 'bg-slate-700 border-slate-700' },
};

const DEFAULT_TYPE = { badge: 'bg-slate-100 text-slate-700', icon: SlidersHorizontal, text: 'text-slate-600', button: 'bg-slate-800 border-slate-800' };

const typeConfig = (type) => TYPE_CONFIG[type] ?? DEFAULT_TYPE;

/* Label jenis mutasi (TRANSFER arah Keluar / Masuk tetap satu kategori). */
const typeLabel = (t) => {
  if (t.transaction_type !== 'TRANSFER') return t.transaction_type;
  return t.transfer_direction === 'IN' ? 'TRANSFER (MASUK)' : t.transfer_direction === 'OUT' ? 'TRANSFER (KELUAR)' : 'TRANSFER';
};

const FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'MASUK', label: 'MASUK' },
  { value: 'KELUAR', label: 'KELUAR' },
  { value: 'TRANSFER', label: 'TRANSFER' },
];

export default function InventoryTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filterType, setFilterType]     = useState('');

  const pagination = usePagination(transactions, 10);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterType ? { type: filterType } : {};
      const res    = await getTransactions(params);
      setTransactions(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-xl shadow">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Riwayat Transaksi</h2>
            <p className="text-xs text-slate-500">Log masuk/keluar seluruh barang inventory</p>
          </div>
        </div>
        <button
          onClick={fetchTransactions}
          className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <FilterIcon className="h-4 w-4 text-slate-400" />
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value || 'all'}
              onClick={() => setFilterType(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer border ${
                filterType === value
                  ? `${typeConfig(value).button} text-white`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-2">{transactions.length} transaksi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Jenis</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok Sebelum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok Sesudah</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Warehouse / Lokasi</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Dokumen</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Tidak ada data transaksi.
                  </td>
                </tr>
              ) : pagination.paginatedItems.map((t) => {
                const cfg = typeConfig(t.transaction_type);
                const TypeIcon = cfg.icon;
                return (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(t.transaction_time)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeLabel(t)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.product?.name || '-'}</p>
                    <p className="text-xs text-slate-400 font-mono">{t.product?.product_code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.product?.part_number || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{t.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{t.stock_before}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${cfg.text}`}>
                      {t.stock_after}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.warehouse ? `${t.warehouse.code} / ${t.location?.code || 'Umum'}` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.reference_number || t.reference_type || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.user_name || '-'}</td>
                </tr>
                );
              })}
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
