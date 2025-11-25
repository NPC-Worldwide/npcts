import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface SortableListProps<T> {
    items: T[];
    keyExtractor: (item: T) => string;
    renderItem: (item: T, index: number) => React.ReactNode;
    onReorder?: (items: T[]) => void;
    className?: string;
}

export function SortableList<T>({
    items,
    keyExtractor,
    renderItem,
    onReorder,
    className = ''
}: SortableListProps<T>) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => () => setDragIndex(index);
    const handleDragEnd = () => setDragIndex(null);

    const handleDrop = (targetIndex: number) => () => {
        if (dragIndex === null || dragIndex === targetIndex || !onReorder) return;
        const newItems = [...items];
        const [removed] = newItems.splice(dragIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        onReorder(newItems);
        setDragIndex(null);
    };

    return (
        <div className={`space-y-1 ${className}`}>
            {items.map((item, index) => (
                <div
                    key={keyExtractor(item)}
                    className={`flex items-center gap-2 ${dragIndex === index ? 'opacity-50' : ''}`}
                    draggable={!!onReorder}
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop(index)}
                >
                    {onReorder && <GripVertical size={14} className="text-gray-500 cursor-grab flex-shrink-0" />}
                    <div className="flex-1">{renderItem(item, index)}</div>
                </div>
            ))}
        </div>
    );
}
