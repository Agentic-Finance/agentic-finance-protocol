'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Build page numbers to show (max 5 visible)
  const pages: (number | string)[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
      <span className="text-[10px] text-slate-500 font-mono">
        {startItem}–{endItem} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {'<'}
        </button>
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={`dots-${i}`} className="px-1.5 text-[11px] text-slate-600">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-2.5 py-1.5 text-[11px] font-mono rounded-lg border transition-all ${
                p === currentPage
                  ? 'bg-white/10 border-white/20 text-white font-bold'
                  : 'border-white/5 text-slate-500 hover:text-white hover:border-white/15'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {'>'}
        </button>
      </div>
    </div>
  );
}

/** Helper hook for pagination */
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  // Reset to page 1 if items change and current page is out of bounds
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [items.length, totalPages, currentPage]);

  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems: items.length,
    itemsPerPage,
  };
}
