import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface SpreadsheetGridProps {
    headers: string[];
    data: any[][];
    selectedCell: { row: number; col: number } | null;
    onCellClick: (row: number, col: number) => void;
    onCellChange: (row: number, col: number, value: any) => void;
    onHeaderChange: (col: number, value: string) => void;
    onAddRow: () => void;
    onDeleteRow: (index: number) => void;
    onAddColumn: () => void;
    onDeleteColumn: (index: number) => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
    headers,
    data,
    selectedCell,
    onCellClick,
    onCellChange,
    onHeaderChange,
    onAddRow,
    onDeleteRow,
    onAddColumn,
    onDeleteColumn
}) => {
    return (
        <div className="overflow-auto">
            <table className="border-collapse text-sm">
                <thead className="sticky top-0 theme-bg-tertiary">
                    <tr>
                        <th className="border theme-border p-1 w-12">#</th>
                        {headers.map((header, i) => (
                            <th key={i} className="border theme-border 
                                p-1 min-w-[100px] group relative">
                                <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => 
                                        onHeaderChange(i, e.target.value)
                                    }
                                    className="w-full bg-transparent 
                                        text-center font-semibold 
                                        outline-none"
                                />
                                <button
                                    onClick={() => onDeleteColumn(i)}
                                    className="absolute right-1 top-1 
                                        opacity-0 group-hover:opacity-100 
                                        p-0.5 bg-red-500 rounded"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </th>
                        ))}
                        <th className="border theme-border p-1 w-12">
                            <button
                                onClick={onAddColumn}
                                className="w-full h-full flex 
                                    items-center justify-center 
                                    theme-hover"
                            >
                                <Plus size={14} />
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, ri) => (
                        <tr key={ri} className="group">
                            <td className="border theme-border p-1">
                                <div className="flex items-center 
                                    justify-between gap-1">
                                    <span className="text-xs 
                                        text-gray-400">
                                        {ri + 1}
                                    </span>
                                    <button
                                        onClick={() => onDeleteRow(ri)}
                                        className="p-0.5 bg-red-500 
                                            rounded opacity-0 
                                            group-hover:opacity-100"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            </td>
                            {headers.map((_, ci) => (
                                <td
                                    key={ci}
                                    className={`border theme-border p-2 
                                        cursor-cell ${
                                        selectedCell?.row === ri && 
                                        selectedCell?.col === ci
                                            ? 'ring-2 ring-blue-500'
                                            : ''
                                    }`}
                                    onClick={() => onCellClick(ri, ci)}
                                >
                                    <input
                                        type="text"
                                        value={row[ci] ?? ''}
                                        onChange={(e) => 
                                            onCellChange(
                                                ri, 
                                                ci, 
                                                e.target.value
                                            )
                                        }
                                        className="w-full bg-transparent 
                                            outline-none"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
