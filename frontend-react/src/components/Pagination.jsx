import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Komponen Pagination terstandarisasi untuk semua tabel di sistem.
 * Memungkinkan pengguna mengatur jumlah baris yang tampil (5, 10, 25, 50, 100, Semua)
 * dan menavigasi halaman dengan mudah.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  pageSizeOptions = [5, 10, 25, 50, 100],
  showPageSize = true,
  className = '',
}) {
  const isAll = pageSize <= 0;
  const effectivePageSize = isAll ? Math.max(totalItems, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endItem = isAll ? totalItems : Math.min(safeCurrentPage * effectivePageSize, totalItems);

  // Generate page numbers to show with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const pages = isAll ? [1] : getPageNumbers();

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-200 text-xs sm:text-sm text-slate-600 rounded-b-2xl select-none ${className}`}>
      {/* Kiri: Selector Baris per Halaman & Info */}
      <div className="flex flex-wrap items-center gap-3">
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                onPageSizeChange(val);
                onPageChange(1);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold cursor-pointer shadow-sm transition"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} baris
                </option>
              ))}
              <option value={-1}>Semua</option>
            </select>
          </div>
        )}

        <div className="text-slate-500">
          Menampilkan{' '}
          <span className="font-semibold text-slate-800">
            {totalItems === 0 ? 0 : `${startItem}-${endItem}`}
          </span>{' '}
          dari <span className="font-semibold text-slate-800">{totalItems}</span> data
        </div>
      </div>

      {/* Kanan: Tombol Navigasi Halaman */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-slate-400 font-medium">
                    ...
                  </span>
                );
              }
              const isActive = p === safeCurrentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
