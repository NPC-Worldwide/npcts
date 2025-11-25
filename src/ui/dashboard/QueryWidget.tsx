import React, { useState, useEffect, useMemo } from 'react';
import { Loader } from 'lucide-react';
import type { DatabaseClient } from '../../core/database';
import { normalizeQueryResult } from '../../core/database';
import { Chart } from '../primitives/Chart';
import { DataTable } from '../primitives/DataTable';

export interface QueryWidgetConfig {
    id: string;
    title: string;
    type: 'stat' | 'stat_list' | 'table' | 'chart' | 'line_chart' | 'bar_chart';
    query: string;
    iconName?: string;
    iconColor?: string;
    span?: number;
    chartConfig?: {
        x: string;
        y: string;
        type?: 'line' | 'bar';
        groupBy?: string;
    };
    toggleOptions?: Array<{ label: string; modifier: string }>;
    dataKey?: string;
}

export interface QueryWidgetProps {
    config: QueryWidgetConfig;
    client: DatabaseClient;
    icon?: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent, widgetId: string) => void;
}

export const QueryWidget: React.FC<QueryWidgetProps> = ({
    config,
    client,
    icon,
    onContextMenu
}) => {
    const [data, setData] = useState<Record<string, unknown>[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeToggle, setActiveToggle] = useState(config.toggleOptions?.[0] || null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                let finalQuery = config.query;

                // Apply toggle modifier if present
                if (activeToggle?.modifier) {
                    const baseQuery = config.query.replace(/;$/, '');
                    // Simple approach: append WHERE clause or modify existing
                    if (baseQuery.toLowerCase().includes('where')) {
                        finalQuery = `${baseQuery} AND (${activeToggle.modifier.replace(/^\s*WHERE\s*/i, '')})`;
                    } else {
                        finalQuery = `${baseQuery} ${activeToggle.modifier}`;
                    }
                }

                const response = await client.executeSQL(finalQuery);
                if (response.error) throw new Error(response.error);
                setData(normalizeQueryResult(response));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Query failed');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [config.query, client, activeToggle]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader className="animate-spin text-blue-400" size={24} />
                </div>
            );
        }
        if (error) {
            return <div className="text-red-400 p-2 text-xs overflow-auto">{error}</div>;
        }
        if (!data || data.length === 0) {
            return <div className="theme-text-secondary text-sm">No data</div>;
        }

        switch (config.type) {
            case 'stat': {
                const value = config.dataKey
                    ? data[0]?.[config.dataKey]
                    : Object.values(data[0] || {})[0];
                return <p className="text-3xl font-bold theme-text-primary">{String(value ?? 'N/A')}</p>;
            }

            case 'stat_list': {
                const listData = config.dataKey ? (data as any)[config.dataKey] : data;
                if (!Array.isArray(listData)) {
                    return <div className="text-red-400 text-xs">Data is not an array</div>;
                }
                return (
                    <ul className="space-y-1 text-sm theme-text-secondary">
                        {listData.map((item, i) => {
                            const values = Object.values(item);
                            return (
                                <li key={i} className="flex justify-between">
                                    <span>{String(values[0])}</span>
                                    <span className="font-bold">{String(values[1] ?? '')}</span>
                                </li>
                            );
                        })}
                    </ul>
                );
            }

            case 'table': {
                const columns = Object.keys(data[0] || {}).map(key => ({
                    key,
                    header: key
                }));
                return <DataTable data={data} columns={columns} />;
            }

            case 'chart':
            case 'line_chart':
            case 'bar_chart': {
                if (!config.chartConfig) {
                    return <div className="theme-text-secondary text-sm">Chart not configured</div>;
                }

                const chartType = config.chartConfig.type || (config.type.includes('line') ? 'line' : 'bar');
                const dataKeys = Object.keys(data[0] || {});

                // Find x-axis key (handle "AS" aliases)
                const xKey = dataKeys.find(k =>
                    k.toLowerCase() === config.chartConfig!.x.toLowerCase().split(' as ').pop()?.trim()
                ) || dataKeys[0];

                // Parse y-axis expressions (comma separated)
                const yExpressions = config.chartConfig.y.split(',').map(s => s.trim());
                const datasets = yExpressions.map((yExpr, index) => {
                    const yKey = dataKeys.find(k =>
                        k.toLowerCase() === yExpr.toLowerCase().split(' as ').pop()?.trim()
                    );
                    const colors = ['rgba(139, 92, 246, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(250, 204, 21, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(34, 197, 94, 0.8)'];
                    return {
                        label: yKey || yExpr,
                        data: data.map(d => parseFloat(String(d[yKey || ''] ?? 0))),
                        color: colors[index % colors.length]
                    };
                });

                const labels = data.map(d => String(d[xKey] ?? ''));

                return (
                    <div className="h-full w-full">
                        <Chart
                            type={chartType as 'line' | 'bar'}
                            labels={labels}
                            datasets={datasets}
                            height={200}
                        />
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div
            className="theme-bg-tertiary p-4 rounded-lg flex flex-col h-full"
            style={{ gridColumn: `span ${config.span || 1}` }}
            onContextMenu={(e) => onContextMenu?.(e, config.id)}
        >
            <div className="flex justify-between items-start flex-shrink-0">
                <div className="flex items-center gap-3 mb-2 flex-1">
                    {icon && <span className={config.iconColor || 'text-gray-400'}>{icon}</span>}
                    <h4 className="font-semibold theme-text-secondary truncate">{config.title}</h4>
                </div>
                {config.toggleOptions && config.toggleOptions.length > 0 && (
                    <div className="flex items-center gap-1">
                        {config.toggleOptions.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => setActiveToggle(opt)}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    activeToggle?.label === opt.label
                                        ? 'theme-button-primary'
                                        : 'theme-button theme-hover'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 mt-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
};
