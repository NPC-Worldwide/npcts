import React from 'react';

interface DataTableProps<T = any> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    render?: (value: any, row: T, index: number) => React.ReactNode;
  }>;
  className?: string;
  maxHeight?: string;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  className = '',
  maxHeight = '400px'
}: DataTableProps<T>) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center theme-text-muted text-sm p-4">
        No data available
      </div>
    );
  }

  return (
    <div
      className={`overflow-auto theme-border border rounded-lg ${className}`}
      style={{ maxHeight }}
    >
      <table className="w-full text-sm text-left">
        <thead className="theme-bg-tertiary sticky top-0">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="p-2 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="theme-bg-primary divide-y theme-divide">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => (
                <td key={col.key} className="p-2 font-mono truncate max-w-xs">
                  {col.render
                    ? col.render(row[col.key], row, rowIndex)
                    : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};