'use client';

import React, { useState, useMemo, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════
   DataTable — Generic sortable & paginated table
   Usage: <DataTable columns={cols} data={rows} pageSize={10} />
   ═══════════════════════════════════════════════════ */

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  keyExtractor?: (row: T) => string;
}

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

function DataTableInner<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  emptyState,
  onRowClick,
  className = '',
  keyExtractor,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  /* ── Sort ── */
  const sorted = useMemo(() => {
    if (!sort) return data;
    const { key, dir } = sort;
    return [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return dir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [data, sort]);

  /* ── Pagination ── */
  const paginated = useMemo(() => {
    if (pageSize <= 0) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;

  // Reset page when data changes
  useMemo(() => {
    if (page >= totalPages) setPage(0);
  }, [totalPages, page]);

  /* ── Handlers ── */
  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
      }
      return { key, dir: 'asc' };
    });
    setPage(0);
  }

  function getPageNumbers(): number[] {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    let start = Math.max(0, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons);
    if (end - start < maxButtons) start = Math.max(0, end - maxButtons);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  /* ── Empty ── */
  if (data.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-[10px] uppercase tracking-wider font-bold py-2.5 px-3 ${ALIGN_CLASS[col.align ?? 'left']} ${col.sortable ? 'cursor-pointer select-none transition-colors' : ''}`}
                  style={{ color: 'var(--pp-text-muted)', borderBottom: '1px solid var(--pp-border)' }}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sort?.key === col.key && (
                      <span className="text-[9px]">{sort.dir === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, rowIdx) => {
              const key = keyExtractor ? keyExtractor(row) : String(rowIdx);
              const globalIdx = pageSize > 0 ? page * pageSize + rowIdx : rowIdx;
              return (
                <tr
                  key={key}
                  className={`pp-row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={rowIdx % 2 === 1 ? { background: 'var(--pp-bg-elevated)', opacity: 0.5 } : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-3 text-sm ${ALIGN_CLASS[col.align ?? 'left']}`}
                      style={{ color: 'var(--pp-text-secondary)', borderBottom: '1px solid var(--pp-border)' }}
                    >
                      {col.render ? col.render(row, globalIdx) : (row[col.key] ?? '\u2014')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Bar ── */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--pp-border)' }}>
          <span className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>
            {page * pageSize + 1}\u2013{Math.min((page + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer hover:bg-black/[0.04]"
              style={{ color: 'var(--pp-text-secondary)' }}
            >
              Prev
            </button>
            {getPageNumbers().map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded transition-colors cursor-pointer ${p === page ? 'font-bold' : ''}`}
                style={p === page
                  ? { background: 'rgba(27, 191, 236, 0.15)', color: 'var(--agt-blue)' }
                  : { color: 'var(--pp-text-muted)' }
                }
              >
                {p + 1}
              </button>
            ))}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer hover:bg-black/[0.04]"
              style={{ color: 'var(--pp-text-secondary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DataTable = React.memo(DataTableInner) as typeof DataTableInner;
export default DataTable;
export { DataTable };
