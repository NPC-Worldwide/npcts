import React, { useMemo } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
    TimeSeriesScale
} from 'chart.js';
import { enUS } from 'date-fns/locale';
import {
    parse,
    parseISO,
    format,
    startOfSecond,
    startOfMinute,
    startOfHour,
    startOfDay,
    startOfWeek,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    addMilliseconds,
    addSeconds,
    addMinutes,
    addHours,
    addDays,
    addWeeks,
    addMonths,
    addQuarters,
    addYears,
    differenceInMilliseconds,
    differenceInSeconds,
    differenceInMinutes,
    differenceInHours,
    differenceInDays,
    differenceInWeeks,
    differenceInMonths,
    differenceInQuarters,
    differenceInYears
} from 'date-fns';
import { _adapters } from 'chart.js';

const FORMATS = {
    datetime: 'MMM d, yyyy, h:mm:ss a',
    millisecond: 'h:mm:ss.SSS a',
    second: 'h:mm:ss a',
    minute: 'h:mm a',
    hour: 'ha',
    day: 'MMM d',
    week: 'PP',
    month: 'MMM yyyy',
    quarter: "'Q'Q - yyyy",
    year: 'yyyy'
};

_adapters._date.override({
    formats: () => FORMATS,
    parse: (value: any, fmt?: string) => {
        if (value === null || value === undefined) return null;
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            if (fmt) {
                return parse(value, fmt, new Date(), { locale: enUS }).getTime();
            }
            return parseISO(value).getTime();
        }
        return null;
    },
    format: (time: number, fmt: string) => format(time, fmt, { locale: enUS }),
    add: (time: number, amount: number, unit: string) => {
        switch (unit) {
            case 'millisecond': return addMilliseconds(time, amount).getTime();
            case 'second': return addSeconds(time, amount).getTime();
            case 'minute': return addMinutes(time, amount).getTime();
            case 'hour': return addHours(time, amount).getTime();
            case 'day': return addDays(time, amount).getTime();
            case 'week': return addWeeks(time, amount).getTime();
            case 'month': return addMonths(time, amount).getTime();
            case 'quarter': return addQuarters(time, amount).getTime();
            case 'year': return addYears(time, amount).getTime();
            default: return time;
        }
    },
    diff: (max: number, min: number, unit: string) => {
        switch (unit) {
            case 'millisecond': return differenceInMilliseconds(max, min);
            case 'second': return differenceInSeconds(max, min);
            case 'minute': return differenceInMinutes(max, min);
            case 'hour': return differenceInHours(max, min);
            case 'day': return differenceInDays(max, min);
            case 'week': return differenceInWeeks(max, min);
            case 'month': return differenceInMonths(max, min);
            case 'quarter': return differenceInQuarters(max, min);
            case 'year': return differenceInYears(max, min);
            default: return 0;
        }
    },
    startOf: (time: number, unit: string) => {
        switch (unit) {
            case 'second': return startOfSecond(time).getTime();
            case 'minute': return startOfMinute(time).getTime();
            case 'hour': return startOfHour(time).getTime();
            case 'day': return startOfDay(time).getTime();
            case 'week': return startOfWeek(time).getTime();
            case 'month': return startOfMonth(time).getTime();
            case 'quarter': return startOfQuarter(time).getTime();
            case 'year': return startOfYear(time).getTime();
            default: return time;
        }
    },
    endOf: (time: number, unit: string) => {
        switch (unit) {
            case 'second': return startOfSecond(time).getTime();
            case 'minute': return startOfMinute(time).getTime();
            case 'hour': return startOfHour(time).getTime();
            case 'day': return startOfDay(time).getTime();
            case 'week': return startOfWeek(time).getTime();
            case 'month': return startOfMonth(time).getTime();
            case 'quarter': return startOfQuarter(time).getTime();
            case 'year': return startOfYear(time).getTime();
            default: return time;
        }
    }
});

// Register chart.js scales and components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
    TimeSeriesScale
);

export interface ChartDataset {
    label: string;
    data: number[];
    color?: string;
}

export interface ChartProps {
    type: 'line' | 'bar';
    labels: (string | Date)[];
    datasets: ChartDataset[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    fillArea?: boolean;
    timeUnit?: 'day' | 'week' | 'month' | 'year';
}

const defaultColors = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#facc15', // yellow
    '#ef4444', // red
    '#22c55e', // green
];

/**
 * Detects if labels appear to be date/time values
 */
const detectTimeSeries = (labels: (string | Date)[]): boolean => {
    if (labels.length === 0) return false;
    const first = labels[0];
    if (first instanceof Date) return !isNaN(first.getTime());
    if (typeof first === 'string') {
        // Check for date-like patterns
        return first.includes('-') || first.includes(':');
    }
    return false;
};

/**
 * Converts string labels to Date objects if they look like dates
 */
const normalizeLabels = (labels: (string | Date)[]): (string | Date)[] => {
    return labels.map(label => {
        if (label instanceof Date) return label;
        if (typeof label === 'string' && (label.includes('-') || label.includes(':'))) {
            const date = new Date(label);
            if (!isNaN(date.getTime())) return date;
        }
        return label;
    });
};

export const Chart: React.FC<ChartProps> = ({
    type,
    labels: rawLabels,
    datasets,
    height = 300,
    showLegend = true,
    showGrid = true,
    fillArea,
    timeUnit = 'day'
}) => {
    const labels = useMemo(() => normalizeLabels(rawLabels), [rawLabels]);
    const isTimeSeries = useMemo(() => detectTimeSeries(labels), [labels]);
    const shouldFill = fillArea ?? (type === 'line');

    const data = useMemo(() => ({
        labels,
        datasets: datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: type === 'bar'
                ? (ds.color || defaultColors[i % defaultColors.length])
                : `${ds.color || defaultColors[i % defaultColors.length]}33`,
            borderColor: ds.color || defaultColors[i % defaultColors.length],
            borderWidth: type === 'line' ? 2 : 1,
            fill: shouldFill,
            tension: 0.3,
        }))
    }), [labels, datasets, type, shouldFill]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: showLegend && datasets.length > 1,
                position: 'top' as const,
                labels: { color: '#9ca3af' }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false
            }
        },
        scales: {
            x: isTimeSeries ? {
                type: 'time' as const,
                time: {
                    unit: timeUnit,
                    tooltipFormat: 'MMM dd, yyyy'
                },
                ticks: { color: '#9ca3af' },
                grid: { display: showGrid, color: '#374151' }
            } : {
                type: 'category' as const,
                ticks: { color: '#9ca3af' },
                grid: { display: showGrid, color: '#374151' }
            },
            y: {
                ticks: { color: '#9ca3af' },
                grid: { display: showGrid, color: '#374151' }
            }
        }
    }), [showLegend, showGrid, isTimeSeries, timeUnit, datasets.length]);

    const Component = type === 'line' ? Line : Bar;
    return <div style={{ height }} className="w-full"><Component data={data} options={options} /></div>;
};

// ----- Query Chart: Takes SQL result data and chart config -----

export interface QueryChartConfig {
    x: string;
    y: string; // comma-separated for multi-series
    type?: 'line' | 'bar';
    groupBy?: string;
}

export interface QueryChartProps {
    data: Record<string, unknown>[];
    config: QueryChartConfig;
    height?: number;
    showLegend?: boolean;
}

/**
 * QueryChart - renders a chart from SQL query results
 * Automatically detects column names from AS aliases in config
 */
export const QueryChart: React.FC<QueryChartProps> = ({
    data,
    config,
    height = 300,
    showLegend = true
}) => {
    const { chartType, labels, datasets } = useMemo(() => {
        if (!data || data.length === 0 || !config) {
            return { chartType: 'bar' as const, labels: [], datasets: [] };
        }

        const dataKeys = Object.keys(data[0]);
        const chartType = config.type || 'bar';

        // Find x-axis key - check for AS alias first, then exact match
        const xAxisKey = dataKeys.find(key =>
            key.toLowerCase() === config.x.toLowerCase().split(' as ')[1]?.trim()
        ) || dataKeys.find(key =>
            key.toLowerCase() === config.x.toLowerCase()
        ) || dataKeys[0];

        // Parse y-axis expressions (comma-separated for multi-series)
        const yAxisExpressions = config.y
            ? config.y.split(',').map(s => s.trim())
            : [];

        // Build datasets
        const datasets = yAxisExpressions.map((yExpr, index) => {
            const yAxisKey = dataKeys.find(key =>
                key.toLowerCase() === yExpr.toLowerCase().split(' as ')[1]?.trim()
            ) || dataKeys.find(key =>
                key.toLowerCase() === yExpr.toLowerCase()
            );

            return {
                label: yAxisKey || yExpr,
                data: data.map(d => parseFloat(String(d[yAxisKey || ''])) || 0),
                color: defaultColors[index % defaultColors.length]
            };
        });

        // Build labels (x-axis values)
        const labels = data.map(d => {
            const xValue = d[xAxisKey];
            if (typeof xValue === 'string' && (xValue.includes('-') || xValue.includes(':'))) {
                return new Date(xValue);
            }
            return String(xValue);
        });

        return { chartType, labels, datasets };
    }, [data, config]);

    if (datasets.length === 0) {
        return <div className="theme-text-secondary text-sm">Not enough data or chart is misconfigured.</div>;
    }

    return (
        <Chart
            type={chartType}
            labels={labels}
            datasets={datasets}
            height={height}
            showLegend={showLegend}
        />
    );
};
