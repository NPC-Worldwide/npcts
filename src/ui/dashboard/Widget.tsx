import React from 'react';
import { Loader } from 'lucide-react';

export interface WidgetProps {
    title: string;
    icon?: React.ReactNode;
    iconColor?: string;
    loading?: boolean;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
    headerActions?: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export const Widget: React.FC<WidgetProps> = ({
    title,
    icon,
    iconColor = 'text-gray-400',
    loading = false,
    error = null,
    children,
    className = '',
    headerActions,
    onContextMenu
}) => {
    return (
        <div
            className={`theme-bg-tertiary p-4 rounded-lg flex flex-col h-full ${className}`}
            onContextMenu={onContextMenu}
        >
            <div className="flex justify-between items-start flex-shrink-0 mb-2">
                <div className="flex items-center gap-3 flex-1">
                    {icon && <span className={iconColor}>{icon}</span>}
                    <h4 className="font-semibold theme-text-secondary truncate">{title}</h4>
                </div>
                {headerActions}
            </div>
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="animate-spin text-blue-400" size={24} />
                    </div>
                ) : error ? (
                    <div className="text-red-400 p-2 text-xs overflow-auto">{error}</div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

// Stat widget for displaying a single large value
export interface StatWidgetProps {
    value: string | number;
    label?: string;
    trend?: { value: number; direction: 'up' | 'down' };
    className?: string;
}

export const StatValue: React.FC<StatWidgetProps> = ({
    value,
    label,
    trend,
    className = ''
}) => (
    <div className={`flex flex-col ${className}`}>
        <p className="text-3xl font-bold theme-text-primary">{value}</p>
        {label && <p className="text-sm theme-text-secondary mt-1">{label}</p>}
        {trend && (
            <p className={`text-sm mt-1 ${trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
        )}
    </div>
);

// Stat list for multiple key-value pairs
export interface StatListProps {
    items: Array<{ label: string; value: string | number }>;
    className?: string;
}

export const StatList: React.FC<StatListProps> = ({ items, className = '' }) => (
    <ul className={`space-y-1 text-sm theme-text-secondary ${className}`}>
        {items.map((item, i) => (
            <li key={i} className="flex justify-between">
                <span>{item.label}</span>
                <span className="font-bold">{item.value}</span>
            </li>
        ))}
    </ul>
);

// Toggle buttons for widget filters
export interface WidgetToggleProps {
    options: Array<{ label: string; value: string }>;
    activeValue: string;
    onChange: (value: string) => void;
}

export const WidgetToggle: React.FC<WidgetToggleProps> = ({
    options,
    activeValue,
    onChange
}) => (
    <div className="flex items-center gap-1">
        {options.map(opt => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-2 py-0.5 text-xs rounded ${
                    activeValue === opt.value
                        ? 'theme-button-primary'
                        : 'theme-button theme-hover'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);
