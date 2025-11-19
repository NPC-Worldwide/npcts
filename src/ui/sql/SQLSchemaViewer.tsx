import React from 'react';
import { Table } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface SQLSchemaViewerProps {
  tables: string[];
  selectedTable: string | null;
  schema: Column[];
  onTableSelect: (table: string) => void;
  loading?: boolean;
}

export const SQLSchemaViewer: React.FC<SQLSchemaViewerProps> = ({
  tables,
  selectedTable,
  schema,
  onTableSelect,
  loading = false
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
        <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm">
          <Table size={16} />
          Tables
        </h5>
        {tables.length > 0 ? (
          tables.map(name => (
            <button
              key={name}
              onClick={() => onTableSelect(name)}
              className={`w-full text-left px-2 py-1 rounded text-sm ${
                selectedTable === name
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              {name}
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500">No tables found</p>
        )}
      </div>
      
      <div className="max-h-48 overflow-y-auto">
        <h5 className="font-semibold mb-2 text-sm">Schema</h5>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : schema.length > 0 ? (
          <ul className="text-sm font-mono space-y-1">
            {schema.map(col => (
              <li key={col.name}>
                {col.name}: <span className="text-yellow-400">{col.type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Select a table</p>
        )}
      </div>
    </div>
  );
};
