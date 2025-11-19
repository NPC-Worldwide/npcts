import React, { useState, useEffect } from "react";

interface CsvViewerProps {
  filePath: string;
  data?: string[][];
}

export const CsvViewer: React.FC<CsvViewerProps> = ({ 
  filePath, 
  data 
}) => {
  const [rows, setRows] = useState<string[][]>(data || []);
  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {
      setHeaders(data[0]);
      setRows(data.slice(1));
    }
  }, [data]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 overflow-auto">
      <div className="p-2 border-b border-gray-700 text-sm text-gray-400">
        {filePath}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-2 text-left border-r border-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-800 hover:bg-gray-800"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-2 border-r border-gray-800"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
