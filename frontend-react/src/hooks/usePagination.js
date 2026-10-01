import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook untuk pagination data di frontend.
 * @param {Array} items - Array data yang akan dipaginasi
 * @param {number} initialPageSize - Default limit baris per halaman (default: 10)
 */
export function usePagination(items = [], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Jika item berubah (misal karena pencarian / filter / refresh), periksa batas page
  const totalItems = items ? items.length : 0;
  const isAll = pageSize <= 0;
  const effectivePageSize = isAll ? Math.max(totalItems, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    if (!items || !items.length) return [];
    if (isAll) return items;
    const startIndex = (currentPage - 1) * effectivePageSize;
    return items.slice(startIndex, startIndex + effectivePageSize);
  }, [items, currentPage, effectivePageSize, isAll]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalItems,
    totalPages,
  };
}

export default usePagination;
