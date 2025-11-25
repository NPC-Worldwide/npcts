import React from 'react';
import { Check } from 'lucide-react';

export interface ImageGridProps {
    images: string[];
    selected?: Set<string>;
    onSelect?: (path: string, e: React.MouseEvent) => void;
    onDoubleClick?: (path: string) => void;
    onContextMenu?: (path: string, e: React.MouseEvent) => void;
    columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
    gap?: number;
    showFilename?: boolean;
    className?: string;
    renderItem?: (src: string, isSelected: boolean) => React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
    images,
    selected = new Set(),
    onSelect,
    onDoubleClick,
    onContextMenu,
    columns = 4,
    gap = 16,
    showFilename = true,
    className = '',
    renderItem,
    loading = false,
    emptyMessage = 'No images found.'
}) => {
    const gridCols = typeof columns === 'number'
        ? `repeat(${columns}, 1fr)`
        : undefined;

    const responsiveClass = typeof columns === 'object'
        ? `grid-cols-${columns.sm || 2} md:grid-cols-${columns.md || 4} lg:grid-cols-${columns.lg || 6} xl:grid-cols-${columns.xl || 8}`
        : '';

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (images.length === 0) {
        return <div className="text-center p-8 text-gray-500">{emptyMessage}</div>;
    }

    return (
        <div
            className={`grid ${responsiveClass} ${className}`}
            style={gridCols ? { gridTemplateColumns: gridCols, gap } : { gap }}
        >
        {images.map((src) => {
            const isSelected = selected.has(src);

            if (renderItem) {
                return <React.Fragment key={src}>{renderItem(src, isSelected)}</React.Fragment>;
            }

            return (
                <div
                    key={src}
                    className={`relative aspect-square rounded overflow-hidden cursor-pointer group
                        ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : 'hover:bg-black/40'}`}
                    onClick={(e) => onSelect?.(src, e)}
                    onDoubleClick={() => onDoubleClick?.(src)}
                    onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(src, e); }}
                >
                    <img src={src} alt="" className="w-full h-full object-cover bg-gray-800" loading="lazy" />
                    {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                    {showFilename && (
                        <div className="absolute bottom-0 inset-x-0 p-1 bg-black/60 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {src.split('/').pop()}
                        </div>
                    )}
                </div>
            );
        })}
        </div>
    );
};
