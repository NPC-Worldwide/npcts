import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxProps {
    images: string[];
    index: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
    onContextMenu?: (src: string, e: React.MouseEvent) => void;
    className?: string;
    showCounter?: boolean;
    renderFooter?: (currentImage: string, index: number) => React.ReactNode;
}

export const Lightbox: React.FC<LightboxProps> = ({
    images,
    index,
    onClose,
    onNavigate,
    onContextMenu,
    className = '',
    showCounter = true,
    renderFooter
}) => {
    const hasPrev = index > 0;
    const hasNext = index < images.length - 1;
    const currentImage = images[index];

    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
        if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
    }, [onClose, onNavigate, index, hasPrev, hasNext]);

    useEffect(() => {
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/95 flex items-center justify-center ${className}`}
            onClick={handleBackdropClick}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded text-white z-10"
                title="Close (Esc)"
            >
                <X size={24} />
            </button>
            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/30 hover:bg-black/60 rounded-full text-white z-10"
                    title="Previous (←)"
                >
                    <ChevronLeft size={32} />
                </button>
            )}
            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/30 hover:bg-black/60 rounded-full text-white z-10"
                    title="Next (→)"
                >
                    <ChevronRight size={32} />
                </button>
            )}
            <img
                src={currentImage}
                alt=""
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(currentImage, e); }}
            />
            {showCounter && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                    {index + 1} / {images.length}
                </div>
            )}
            {renderFooter && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                    {renderFooter(currentImage, index)}
                </div>
            )}
        </div>
    );
};
