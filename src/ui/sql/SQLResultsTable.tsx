import React from 'react';

interface SQLResultsTableProps {
  results: Record<string, any>[];
}

export const SQLResultsTable: React.FC<SQLResultsTableProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No results to display
      </div>
    );
  }

  const columns = Object.keys(results[0]);

  return (
    <div className="overflow-x-auto border border-gray-700 rounded">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-800 sticky top-0">
          <tr>
            {columns.map(col => (
              <th key={col} className="p-2 font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {results.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-800">
              {columns.map(col => (
                <td key={col} className="p-2 font-mono truncate max-w-xs">
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
