import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Camera, Type, Crop, Undo, Redo, Save, X,
    Brush, Eraser, ZoomIn, ZoomOut
} from 'lucide-react';

// Icons for tools (using inline SVG for cursor/select tool)
const CursorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    </svg>
);

const RectSelectIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
    </svg>
);

const LassoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c2.5 0 4.8-.9 6.6-2.4"/>
        <circle cx="18" cy="18" r="3"/>
    </svg>
);

// ----- Types -----

export type EditorTool = 'select' | 'rect-select' | 'lasso' | 'text' | 'brush' | 'eraser' | 'crop';

export interface ImageAdjustments {
    exposure: number;
    contrast: number;
    highlights: number;
    shadows: number;
    whites: number;
    blacks: number;
    saturation: number;
    warmth: number;
    tint: number;
    pop: number;
    vignette: number;
    blur: number;
}

export interface TextLayer {
    id: string;
    content: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily: string;
}

export interface Selection {
    type: 'rect' | 'lasso';
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    points?: Array<{ x: number; y: number }>;
}

export interface ImageEditorProps {
    imageSrc: string | null;
    onSave?: (data: { adjustments: ImageAdjustments; textLayers: TextLayer[] }) => void;
    onClose?: () => void;
    onGenerativeFill?: (selection: Selection, prompt: string) => Promise<void>;
    className?: string;
    showHeader?: boolean;
    title?: string;
}

// ----- Helper Components -----

interface SliderControlProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    onCommit?: () => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
    label, value, min, max, onChange, onCommit
}) => (
    <div className="flex items-center gap-2">
        <span className="text-xs w-20 flex-shrink-0">{label}</span>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseUp={onCommit}
            className="flex-1 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
        />
        <span className="text-xs w-8 text-right font-mono">{value}</span>
    </div>
);

// ----- Tool Button -----

interface ToolButtonProps {
    active: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, title, children }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
        title={title}
    >
        {children}
    </button>
);

// ----- Default Values -----

const defaultAdjustments: ImageAdjustments = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    saturation: 100,
    warmth: 0,
    tint: 0,
    pop: 0,
    vignette: 0,
    blur: 0
};

const generateId = () => `layer_${Math.random().toString(36).substring(2, 11)}`;

// ----- Main Component -----

export const ImageEditor: React.FC<ImageEditorProps> = ({
    imageSrc,
    onSave,
    onClose,
    onGenerativeFill,
    className = '',
    showHeader = true,
    title = 'Image Editor'
}) => {
    // Tool state
    const [activeTool, setActiveTool] = useState<EditorTool>('select');

    // Adjustments
    const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);

    // Text layers
    const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    // Selection
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isDrawingSelection, setIsDrawingSelection] = useState(false);
    const [selectionPoints, setSelectionPoints] = useState<Array<{ x: number; y: number }>>([]);

    // History
    const [history, setHistory] = useState<Array<{ adjustments: ImageAdjustments; textLayers: TextLayer[] }>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Generative fill prompt
    const [fillPrompt, setFillPrompt] = useState('');

    // Push to history
    const pushHistory = useCallback(() => {
        const newEntry = { adjustments: { ...adjustments }, textLayers: [...textLayers] };
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newEntry]);
        setHistoryIndex(prev => prev + 1);
    }, [adjustments, textLayers, historyIndex]);

    // Undo/Redo
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const undo = useCallback(() => {
        if (canUndo) {
            const prev = history[historyIndex - 1];
            setAdjustments(prev.adjustments);
            setTextLayers(prev.textLayers);
            setHistoryIndex(i => i - 1);
        }
    }, [canUndo, history, historyIndex]);

    const redo = useCallback(() => {
        if (canRedo) {
            const next = history[historyIndex + 1];
            setAdjustments(next.adjustments);
            setTextLayers(next.textLayers);
            setHistoryIndex(i => i + 1);
        }
    }, [canRedo, history, historyIndex]);

    // Handle adjustment change
    const handleAdjustmentChange = (key: keyof ImageAdjustments, value: number) => {
        setAdjustments(prev => ({ ...prev, [key]: value }));
    };

    // Calculate CSS filter from adjustments
    const calculateImageStyle = useCallback((): React.CSSProperties => {
        const {
            exposure, contrast, saturation, warmth, blur
        } = adjustments;

        const brightness = 1 + (exposure / 100);
        const contrastVal = 1 + (contrast / 100);
        const saturateVal = saturation / 100;
        const sepiaVal = warmth > 0 ? warmth / 200 : 0;
        const hueRotate = warmth < 0 ? warmth : 0;

        return {
            filter: `
                brightness(${brightness})
                contrast(${contrastVal})
                saturate(${saturateVal})
                sepia(${sepiaVal})
                hue-rotate(${hueRotate}deg)
                blur(${blur}px)
            `.trim(),
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain' as const
        };
    }, [adjustments]);

    // Mouse handlers for selection
    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'select' || activeTool === 'crop') return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (activeTool === 'text') {
            const newText: TextLayer = {
                id: generateId(),
                content: 'Text',
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                fontSize: 24,
                color: '#ffffff',
                fontFamily: 'Arial'
            };
            setTextLayers(prev => [...prev, newText]);
            setEditingTextId(newText.id);
            pushHistory();
            return;
        }

        if (activeTool === 'rect-select') {
            setIsDrawingSelection(true);
            setSelection({ type: 'rect', x1: x, y1: y, x2: x, y2: y });
        } else if (activeTool === 'lasso') {
            setIsDrawingSelection(true);
            setSelectionPoints([{ x, y }]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawingSelection) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (activeTool === 'rect-select' && selection?.type === 'rect') {
            setSelection(prev => prev ? { ...prev, x2: x, y2: y } : null);
        } else if (activeTool === 'lasso') {
            setSelectionPoints(prev => [...prev, { x, y }]);
        }
    };

    const handleMouseUp = () => {
        if (!isDrawingSelection) return;

        setIsDrawingSelection(false);

        if (activeTool === 'lasso' && selectionPoints.length > 2) {
            setSelection({ type: 'lasso', points: selectionPoints });
        }
    };

    // Handle save
    const handleSave = () => {
        onSave?.({ adjustments, textLayers });
    };

    // Reset adjustments
    const resetAdjustments = () => {
        setAdjustments(defaultAdjustments);
        pushHistory();
    };

    if (!imageSrc) {
        return (
            <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
                <div className="text-center text-gray-500">
                    <Camera size={48} className="mx-auto mb-4" />
                    <p>No image selected</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Camera size={18} /> {title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Undo"
                        >
                            <Undo size={18} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Redo"
                        >
                            <Redo size={18} />
                        </button>
                        {onSave && (
                            <button
                                onClick={handleSave}
                                className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                            >
                                <Save size={14} className="inline mr-1" /> Save
                            </button>
                        )}
                        {onClose && (
                            <button onClick={onClose} className="p-2 rounded hover:bg-gray-700">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Toolbar */}
                <div className="w-14 border-r border-gray-700 flex flex-col items-center py-2 gap-1 bg-gray-800">
                    <ToolButton
                        active={activeTool === 'select'}
                        onClick={() => setActiveTool('select')}
                        title="Select"
                    >
                        <CursorIcon />
                    </ToolButton>
                    <ToolButton
                        active={activeTool === 'rect-select'}
                        onClick={() => setActiveTool('rect-select')}
                        title="Rectangle Select"
                    >
                        <RectSelectIcon />
                    </ToolButton>
                    <ToolButton
                        active={activeTool === 'lasso'}
                        onClick={() => setActiveTool('lasso')}
                        title="Lasso Select"
                    >
                        <LassoIcon />
                    </ToolButton>
                    <ToolButton
                        active={activeTool === 'text'}
                        onClick={() => setActiveTool('text')}
                        title="Text Tool"
                    >
                        <Type size={20} />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-2" />

                    <ToolButton
                        active={activeTool === 'brush'}
                        onClick={() => setActiveTool('brush')}
                        title="Brush"
                    >
                        <Brush size={20} />
                    </ToolButton>
                    <ToolButton
                        active={activeTool === 'eraser'}
                        onClick={() => setActiveTool('eraser')}
                        title="Eraser"
                    >
                        <Eraser size={20} />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-2" />

                    <ToolButton
                        active={activeTool === 'crop'}
                        onClick={() => setActiveTool('crop')}
                        title="Crop"
                    >
                        <Crop size={20} />
                    </ToolButton>
                </div>

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-1 flex items-center justify-center p-4 overflow-hidden relative bg-gray-800/50"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{ cursor: activeTool === 'text' ? 'text' : activeTool === 'lasso' ? 'crosshair' : 'default' }}
                >
                    <div className="relative">
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            style={calculateImageStyle()}
                            alt="Editing"
                            draggable={false}
                        />

                        {/* Rectangle Selection Overlay */}
                        {selection?.type === 'rect' && (
                            <div
                                className="absolute border-2 border-dashed border-blue-400 pointer-events-none"
                                style={{
                                    left: `${Math.min(selection.x1 || 0, selection.x2 || 0)}%`,
                                    top: `${Math.min(selection.y1 || 0, selection.y2 || 0)}%`,
                                    width: `${Math.abs((selection.x2 || 0) - (selection.x1 || 0))}%`,
                                    height: `${Math.abs((selection.y2 || 0) - (selection.y1 || 0))}%`
                                }}
                            />
                        )}

                        {/* Lasso Selection Overlay */}
                        {selection?.type === 'lasso' && selection.points && (
                            <svg className="absolute inset-0 pointer-events-none w-full h-full">
                                <polygon
                                    points={selection.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                                    fill="rgba(59, 130, 246, 0.1)"
                                    stroke="rgb(59, 130, 246)"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                            </svg>
                        )}

                        {/* Text Layers */}
                        {textLayers.map(text => (
                            <div
                                key={text.id}
                                className="absolute cursor-move"
                                style={{
                                    left: text.x,
                                    top: text.y,
                                    fontSize: text.fontSize,
                                    color: text.color,
                                    fontFamily: text.fontFamily,
                                    zIndex: 10
                                }}
                                onDoubleClick={() => setEditingTextId(text.id)}
                            >
                                {editingTextId === text.id ? (
                                    <input
                                        type="text"
                                        value={text.content}
                                        onChange={(e) => setTextLayers(prev =>
                                            prev.map(t => t.id === text.id ? { ...t, content: e.target.value } : t)
                                        )}
                                        onBlur={() => setEditingTextId(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingTextId(null)}
                                        autoFocus
                                        className="bg-black/50 border border-blue-400 outline-none px-2"
                                        style={{
                                            fontSize: text.fontSize,
                                            color: text.color,
                                            fontFamily: text.fontFamily
                                        }}
                                    />
                                ) : (
                                    <span className="px-2 py-1 bg-black/30 rounded">{text.content}</span>
                                )}
                            </div>
                        ))}

                        {/* Vignette Effect */}
                        {adjustments.vignette > 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    boxShadow: `inset 0 0 ${adjustments.vignette * 2.5}px ${adjustments.vignette * 1.5}px rgba(0,0,0,0.9)`
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Adjustments Panel */}
                <div className="w-72 border-l border-gray-700 bg-gray-800 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-700">
                        <h4 className="font-semibold text-sm">Adjustments</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {/* Light */}
                        <details open>
                            <summary className="font-semibold text-sm cursor-pointer mb-2">Light</summary>
                            <div className="space-y-2">
                                <SliderControl label="Exposure" value={adjustments.exposure} min={-100} max={100} onChange={(v) => handleAdjustmentChange('exposure', v)} onCommit={pushHistory} />
                                <SliderControl label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => handleAdjustmentChange('contrast', v)} onCommit={pushHistory} />
                                <SliderControl label="Highlights" value={adjustments.highlights} min={-100} max={100} onChange={(v) => handleAdjustmentChange('highlights', v)} onCommit={pushHistory} />
                                <SliderControl label="Shadows" value={adjustments.shadows} min={-100} max={100} onChange={(v) => handleAdjustmentChange('shadows', v)} onCommit={pushHistory} />
                            </div>
                        </details>

                        {/* Color */}
                        <details open>
                            <summary className="font-semibold text-sm cursor-pointer mb-2">Color</summary>
                            <div className="space-y-2">
                                <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => handleAdjustmentChange('saturation', v)} onCommit={pushHistory} />
                                <SliderControl label="Warmth" value={adjustments.warmth} min={-100} max={100} onChange={(v) => handleAdjustmentChange('warmth', v)} onCommit={pushHistory} />
                                <SliderControl label="Tint" value={adjustments.tint} min={-100} max={100} onChange={(v) => handleAdjustmentChange('tint', v)} onCommit={pushHistory} />
                            </div>
                        </details>

                        {/* Effects */}
                        <details open>
                            <summary className="font-semibold text-sm cursor-pointer mb-2">Effects</summary>
                            <div className="space-y-2">
                                <SliderControl label="Vignette" value={adjustments.vignette} min={0} max={100} onChange={(v) => handleAdjustmentChange('vignette', v)} onCommit={pushHistory} />
                                <SliderControl label="Blur" value={adjustments.blur} min={0} max={20} onChange={(v) => handleAdjustmentChange('blur', v)} onCommit={pushHistory} />
                            </div>
                        </details>

                        {/* Selection Actions */}
                        {selection && onGenerativeFill && (
                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <h5 className="font-semibold text-sm">Selection</h5>
                                <input
                                    type="text"
                                    value={fillPrompt}
                                    onChange={(e) => setFillPrompt(e.target.value)}
                                    placeholder="Fill prompt..."
                                    className="w-full bg-gray-700 rounded px-2 py-1 text-sm"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onGenerativeFill(selection, fillPrompt)}
                                        className="flex-1 bg-blue-600 rounded py-1 text-sm hover:bg-blue-700"
                                    >
                                        Fill
                                    </button>
                                    <button
                                        onClick={() => setSelection(null)}
                                        className="flex-1 bg-gray-700 rounded py-1 text-sm hover:bg-gray-600"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Reset Button */}
                        <button
                            onClick={resetAdjustments}
                            className="w-full bg-gray-700 rounded py-2 text-sm hover:bg-gray-600"
                        >
                            Reset All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
