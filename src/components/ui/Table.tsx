import React from 'react';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  className?: string;
}

export function Table<T>({ columns, data, keyExtractor, emptyState, onRowClick, loading, className = '' }: TableProps<T>) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;
  }

  if (data.length === 0 && emptyState) {
    return <div className="bg-white rounded-xl border border-gray-200">{emptyState}</div>;
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase" style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-gray-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-sm text-gray-900 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}>
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;