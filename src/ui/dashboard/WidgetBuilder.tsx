import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Loader } from 'lucide-react';

export interface WidgetConfig {
    id?: string;
    title: string;
    type: 'table' | 'chart' | 'stat' | 'stat_list' | 'line_chart' | 'bar_chart';
    query: string;
    iconName?: string;
    iconColor?: string;
    span?: number;
    chartConfig?: {
        x: string;
        y: string;
        type: 'line' | 'bar';
        groupBy?: string;
    };
    toggleOptions?: Array<{ label: string; modifier: string }>;
    builder?: {
        table: string;
        selectedColumns: string[];
        selectExpressions?: string[];
    };
}

export interface SchemaColumn {
    name: string;
    type: string;
}

export interface WidgetBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (widget: WidgetConfig) => void;
    widget?: Partial<WidgetConfig>;
    tables: string[];
    fetchSchema: (tableName: string) => Promise<SchemaColumn[]>;
    executeQuery?: (query: string) => Promise<{ result?: unknown[]; error?: string }>;
    context?: {
        query?: string;
        result?: Record<string, unknown>[];
    };
    generateId?: () => string;
}

const defaultGenerateId = () => `widget_${Math.random().toString(36).substring(2, 11)}`;

const WIDGET_TYPES = [
    { value: 'table', label: 'Table' },
    { value: 'chart', label: 'Chart' },
    { value: 'stat', label: 'Single Stat' },
    { value: 'stat_list', label: 'Stat List' },
];

const CHART_TYPES = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
];

/**
 * Parses a SQL query to extract builder configuration
 */
const parseQueryForBuilder = (query: string): { isComplex: boolean; builderConfig: Partial<WidgetConfig['builder']> } => {
    if (!query) {
        return { isComplex: false, builderConfig: {} };
    }

    // Check for complex query patterns
    const complexityPattern = /\bJOIN\b|\bUNION\b|\bWITH\b/i;
    const isComplex = complexityPattern.test(query);

    if (isComplex) {
        return { isComplex: true, builderConfig: {} };
    }

    // Extract table name
    const fromMatch = query.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) {
        return { isComplex: true, builderConfig: {} };
    }
    const table = fromMatch[1];

    // Extract SELECT expressions
    const selectMatch = query.match(/\bSELECT\s+(.*?)(?=\bFROM)/is);
    const selectExpressions = selectMatch
        ? selectMatch[1].split(',').map(s => s.trim())
        : ['*'];

    // Extract columns from expressions
    const extractedBaseColumns = new Set<string>();
    const keywordBlacklist = new Set([
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'FROM', 'WHERE',
        'GROUP', 'ORDER', 'BY', 'LIMIT', 'CASE', 'WHEN', 'THEN', 'ELSE',
        'END', 'AS', 'IN', 'LIKE', 'IS', 'BETWEEN', 'AND', 'OR', 'NOT',
        'NULL', 'STRFTIME', 'LENGTH'
    ]);

    selectExpressions.forEach(expr => {
        const columnCandidates = expr.matchAll(/\b([a-zA-Z0-9_]+)\b/g);
        for (const match of columnCandidates) {
            if (match[1] && !keywordBlacklist.has(match[1].toUpperCase())) {
                extractedBaseColumns.add(match[1]);
            }
        }
    });

    return {
        isComplex: false,
        builderConfig: {
            table,
            selectedColumns: Array.from(extractedBaseColumns),
            selectExpressions
        }
    };
};

export const WidgetBuilder: React.FC<WidgetBuilderProps> = ({
    isOpen,
    onClose,
    onSave,
    widget,
    tables,
    fetchSchema,
    executeQuery,
    context,
    generateId = defaultGenerateId
}) => {
    const isEditMode = Boolean(widget?.id);
    const parsedData = widget?.query ? parseQueryForBuilder(widget.query) : { isComplex: false, builderConfig: {} };

    // Mode state
    const [mode, setMode] = useState<'builder' | 'advanced'>(parsedData.isComplex ? 'advanced' : 'builder');
    const isComplexQuery = parsedData.isComplex;

    // Form state
    const [title, setTitle] = useState(widget?.title || '');
    const [type, setType] = useState<WidgetConfig['type']>(widget?.type || 'table');
    const [query, setQuery] = useState(widget?.query || '');
    const [selectedTable, setSelectedTable] = useState(parsedData.builderConfig.table || '');
    const [selectedColumns, setSelectedColumns] = useState<string[]>(parsedData.builderConfig.selectedColumns || []);

    // Chart config
    const [xCol, setXCol] = useState(widget?.chartConfig?.x || '');
    const [yCol, setYCol] = useState(widget?.chartConfig?.y || '');
    const [chartType, setChartType] = useState<'line' | 'bar'>(widget?.chartConfig?.type || 'bar');
    const [groupBy, setGroupBy] = useState(widget?.chartConfig?.groupBy || '');

    // Toggle options for filtering
    const [toggleOptions, setToggleOptions] = useState<Array<{ label: string; modifier: string }>>(
        widget?.toggleOptions || []
    );

    // Schema/columns state
    const [availableColumns, setAvailableColumns] = useState<SchemaColumn[]>([]);
    const [outputColumns, setOutputColumns] = useState<SchemaColumn[]>([]);

    // Testing state
    const [testStatus, setTestStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

    // Initialize from context if provided
    useEffect(() => {
        if (context?.result?.[0] && !isEditMode) {
            const columns = Object.keys(context.result[0]);
            setOutputColumns(columns.map(name => ({ name, type: 'RESULT_COL' })));
            setXCol(columns[0] || '');
            setYCol(columns.length > 1 ? columns[1] : '');
            setQuery(context.query || '');
            setType('chart');
            setMode('advanced');
        }
    }, [context, isEditMode]);

    // Load schema when table changes
    useEffect(() => {
        if (selectedTable && mode === 'builder') {
            fetchSchema(selectedTable).then(schema => {
                setAvailableColumns(schema || []);
                if (!type.includes('chart')) {
                    setOutputColumns(schema || []);
                }
            });
        }
    }, [selectedTable, fetchSchema, mode, type]);

    // Auto-generate query in builder mode
    useEffect(() => {
        if (mode === 'builder' && selectedTable && !type.includes('chart')) {
            const cols = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';
            setQuery(`SELECT ${cols} FROM ${selectedTable}`);
        }
    }, [mode, selectedTable, selectedColumns, type]);

    // Test query and get output columns
    const testQuery = useCallback(async () => {
        if (!executeQuery || !query) return;

        setTestStatus({ loading: true, error: null });
        try {
            const testQ = `${query.replace(/;$/, '')} LIMIT 1`;
            const result = await executeQuery(testQ);

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.result && Array.isArray(result.result) && result.result.length > 0) {
                const cols = Object.keys(result.result[0] as object);
                setOutputColumns(cols.map(name => ({ name, type: 'RESULT_COL' })));
            }
            setTestStatus({ loading: false, error: null });
        } catch (err) {
            setTestStatus({ loading: false, error: (err as Error).message });
        }
    }, [executeQuery, query]);

    const handleSave = () => {
        let finalQuery = query;

        // Build query in builder mode for charts
        if (mode === 'builder' && type.includes('chart') && selectedTable) {
            const selectParts: string[] = [];
            if (xCol) selectParts.push(xCol);
            if (yCol) {
                yCol.split(',').forEach(expr => {
                    const trimmed = expr.trim();
                    if (trimmed && !selectParts.includes(trimmed)) {
                        selectParts.push(trimmed);
                    }
                });
            }

            if (selectParts.length > 0) {
                finalQuery = `SELECT ${selectParts.join(', ')} FROM ${selectedTable}`;
                if (groupBy) {
                    finalQuery += ` GROUP BY ${groupBy}`;
                } else if (xCol && selectParts.length > 1) {
                    const xBase = xCol.split(/\s+AS\s+/i)[0].trim();
                    finalQuery += ` GROUP BY ${xBase}`;
                }
                if (xCol) {
                    const xBase = xCol.split(/\s+AS\s+/i)[0].trim();
                    finalQuery += ` ORDER BY ${xBase}`;
                }
            }
        }

        const widgetConfig: WidgetConfig = {
            id: widget?.id || generateId(),
            title: title || 'Custom Widget',
            type,
            query: finalQuery,
            iconName: widget?.iconName || 'Settings2',
            iconColor: widget?.iconColor || 'text-blue-400',
            span: type.includes('chart') ? 2 : 1,
            chartConfig: type.includes('chart') ? {
                x: xCol,
                y: yCol,
                type: chartType,
                groupBy: groupBy || undefined
            } : undefined,
            toggleOptions: toggleOptions.length > 0 ? toggleOptions : undefined,
            builder: mode === 'builder' ? {
                table: selectedTable,
                selectedColumns
            } : undefined
        };

        onSave(widgetConfig);
        onClose();
    };

    const handleToggleChange = (index: number, field: 'label' | 'modifier', value: string) => {
        const newToggles = [...toggleOptions];
        newToggles[index][field] = value;
        setToggleOptions(newToggles);
    };

    const addToggle = () => {
        setToggleOptions([...toggleOptions, { label: 'New', modifier: '' }]);
    };

    const removeToggle = (index: number) => {
        setToggleOptions(toggleOptions.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold">
                        {isEditMode ? 'Edit Widget' : 'Create Widget'}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full theme-hover">
                        <X size={20} />
                    </button>
                </div>

                {/* Mode tabs */}
                <div className="flex border-b theme-border mb-4 flex-shrink-0">
                    <button
                        onClick={() => !isComplexQuery && setMode('builder')}
                        className={`px-4 py-2 text-sm ${mode === 'builder' ? 'border-b-2 border-blue-500' : 'theme-text-secondary'} ${isComplexQuery ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isComplexQuery ? "Cannot use builder for complex queries" : ""}
                    >
                        Builder
                    </button>
                    <button
                        onClick={() => setMode('advanced')}
                        className={`px-4 py-2 text-sm ${mode === 'advanced' ? 'border-b-2 border-blue-500' : 'theme-text-secondary'}`}
                    >
                        Advanced SQL
                    </button>
                </div>

                {/* Form content */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {/* Title */}
                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary">
                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full theme-input mt-1"
                            placeholder="e.g., Daily Active Users"
                        />
                    </div>

                    {/* Data Source */}
                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">Data Source</h4>

                        {mode === 'builder' ? (
                            <>
                                <div>
                                    <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Table</label>
                                    <select
                                        value={selectedTable}
                                        onChange={e => {
                                            setSelectedTable(e.target.value);
                                            setSelectedColumns([]);
                                        }}
                                        className="w-full theme-input mt-1"
                                    >
                                        <option value="">Select a table...</option>
                                        {tables.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedTable && !type.includes('chart') && (
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Columns</label>
                                        <div className="max-h-32 overflow-y-auto theme-bg-primary p-2 rounded mt-1">
                                            {availableColumns.map(col => (
                                                <div key={col.name} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`col-${col.name}`}
                                                        checked={selectedColumns.includes(col.name)}
                                                        onChange={e => {
                                                            setSelectedColumns(prev =>
                                                                e.target.checked
                                                                    ? [...prev, col.name]
                                                                    : prev.filter(c => c !== col.name)
                                                            );
                                                        }}
                                                        className="w-4 h-4 theme-checkbox"
                                                    />
                                                    <label htmlFor={`col-${col.name}`} className="ml-2 text-sm">
                                                        {col.name} <span className="text-yellow-400">({col.type})</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">SQL Query</label>
                                <textarea
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    rows={6}
                                    className="w-full theme-input mt-1 font-mono text-sm"
                                    placeholder="SELECT * FROM table_name LIMIT 100"
                                />
                                {executeQuery && (
                                    <button
                                        onClick={testQuery}
                                        className="text-xs theme-button-subtle mt-2 flex items-center gap-1"
                                        disabled={testStatus.loading}
                                    >
                                        {testStatus.loading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                                        {testStatus.loading ? 'Testing...' : 'Test Query & Get Columns'}
                                    </button>
                                )}
                                {testStatus.error && (
                                    <p className="text-red-400 text-xs mt-1">{testStatus.error}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Visualization */}
                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">Visualization</h4>

                        <div>
                            <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Display As</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as WidgetConfig['type'])}
                                className="w-full theme-input mt-1"
                            >
                                {WIDGET_TYPES.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {type.includes('chart') && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">X-Axis</label>
                                        <textarea
                                            value={xCol}
                                            onChange={e => setXCol(e.target.value)}
                                            className="w-full theme-input mt-1 font-mono text-sm"
                                            rows={2}
                                            placeholder="e.g., strftime('%Y-%m-%d', timestamp) as date"
                                        />
                                        {outputColumns.length > 0 && (
                                            <div className="text-xs theme-text-secondary mt-1">
                                                Available: {outputColumns.map(c => c.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Y-Axis (comma separated for multi-series)</label>
                                        <textarea
                                            value={yCol}
                                            onChange={e => setYCol(e.target.value)}
                                            className="w-full theme-input mt-1 font-mono text-sm"
                                            rows={2}
                                            placeholder="e.g., COUNT(*) as count"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Chart Type</label>
                                        <select
                                            value={chartType}
                                            onChange={e => setChartType(e.target.value as 'line' | 'bar')}
                                            className="w-full theme-input mt-1"
                                        >
                                            {CHART_TYPES.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">GROUP BY (optional)</label>
                                        <input
                                            type="text"
                                            value={groupBy}
                                            onChange={e => setGroupBy(e.target.value)}
                                            className="w-full theme-input mt-1 font-mono text-sm"
                                            placeholder="e.g., strftime('%Y-%m-%d', timestamp)"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Toggle Filters */}
                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold theme-text-primary">Filter Toggles (optional)</h4>
                            <button onClick={addToggle} className="text-xs theme-button-subtle">
                                + Add Toggle
                            </button>
                        </div>

                        {toggleOptions.map((toggle, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={toggle.label}
                                        onChange={e => handleToggleChange(index, 'label', e.target.value)}
                                        className="w-full theme-input text-sm"
                                        placeholder="Label (e.g., 7d)"
                                    />
                                </div>
                                <div className="flex-[2]">
                                    <input
                                        type="text"
                                        value={toggle.modifier}
                                        onChange={e => handleToggleChange(index, 'modifier', e.target.value)}
                                        className="w-full theme-input text-sm font-mono"
                                        placeholder="WHERE timestamp >= date('now', '-7 days')"
                                    />
                                </div>
                                <button
                                    onClick={() => removeToggle(index)}
                                    className="p-1 text-red-400 hover:text-red-300"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t theme-border flex-shrink-0">
                    <button onClick={onClose} className="theme-button px-4 py-2 text-sm rounded">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="theme-button-primary px-4 py-2 text-sm rounded">
                        {isEditMode ? 'Save Changes' : 'Create Widget'}
                    </button>
                </div>
            </div>
        </div>
    );
};
