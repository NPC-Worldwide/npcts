import React from 'react';

export interface WidgetGridProps {
    children: React.ReactNode;
    columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
    gap?: number;
    className?: string;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
    children,
    columns = { sm: 1, md: 2, lg: 3, xl: 4 },
    gap = 16,
    className = ''
}) => {
    const gridClass = typeof columns === 'number'
        ? ''
        : `grid-cols-${columns.sm || 1} md:grid-cols-${columns.md || 2} lg:grid-cols-${columns.lg || 3} xl:grid-cols-${columns.xl || 4}`;

    const gridStyle = typeof columns === 'number'
        ? { gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }
        : { gap };

    return (
        <div
            className={`grid ${gridClass} ${className}`}
            style={gridStyle}
        >
            {children}
        </div>
    );
};

// Wrapper for widgets that need to span multiple columns
export interface WidgetSpanProps {
    span?: number;
    children: React.ReactNode;
    className?: string;
}

export const WidgetSpan: React.FC<WidgetSpanProps> = ({
    span = 1,
    children,
    className = ''
}) => (
    <div
        className={className}
        style={{ gridColumn: `span ${span}` }}
    >
        {children}
    </div>
);
