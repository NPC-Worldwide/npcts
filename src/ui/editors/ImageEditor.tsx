import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Camera, Type, Crop, Undo, Redo, Save, X, Download,
    Brush, Eraser, ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical,
    Square, Circle, Minus, ArrowRight, Pipette, PaintBucket,
    Palette, Sparkles, RefreshCw, Move
} from 'lucide-react';

// Icons for tools
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

export type EditorTool = 'select' | 'move' | 'rect-select' | 'lasso' | 'text' | 'brush' | 'eraser' | 'crop' |
    'rectangle' | 'circle' | 'line' | 'arrow' | 'fill' | 'eyedropper';

export interface ImageAdjustments {
    exposure: number;
    contrast: number;
    highlights: number;
    shadows: number;
    whites: number;
    blacks: number;
    saturation: number;
    vibrance: number;
    warmth: number;
    tint: number;
    hue: number;
    sharpness: number;
    clarity: number;
    vignette: number;
    blur: number;
    grain: number;
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

export interface DrawingStroke {
    id: string;
    tool: 'brush' | 'eraser';
    points: Array<{ x: number; y: number }>;
    color: string;
    size: number;
}

export interface ShapeLayer {
    id: string;
    type: 'rectangle' | 'circle' | 'line' | 'arrow';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    filled: boolean;
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
    onSave?: (data: { adjustments: ImageAdjustments; textLayers: TextLayer[]; dataUrl: string }) => void;
    onClose?: () => void;
    onGenerativeFill?: (selection: Selection, prompt: string) => Promise<void>;
    className?: string;
    showHeader?: boolean;
    title?: string;
}

// ----- Presets -----
const FILTER_PRESETS = [
    { name: 'Original', adjustments: {} },
    { name: 'Vivid', adjustments: { saturation: 130, contrast: 10, vibrance: 20 } },
    { name: 'Warm', adjustments: { warmth: 30, saturation: 110 } },
    { name: 'Cool', adjustments: { warmth: -30, tint: 10 } },
    { name: 'B&W', adjustments: { saturation: 0 } },
    { name: 'Vintage', adjustments: { warmth: 20, contrast: -10, saturation: 80, vignette: 30 } },
    { name: 'Fade', adjustments: { contrast: -20, saturation: 80, blacks: 20 } },
    { name: 'Drama', adjustments: { contrast: 30, clarity: 40, highlights: -20, shadows: 20 } },
    { name: 'Soft', adjustments: { contrast: -15, highlights: 20, clarity: -20 } },
    { name: 'Punch', adjustments: { contrast: 20, saturation: 120, vibrance: 30 } },
];

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
            className="flex-1 h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-blue-500"
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
    vibrance: 0,
    warmth: 0,
    tint: 0,
    hue: 0,
    sharpness: 0,
    clarity: 0,
    vignette: 0,
    blur: 0,
    grain: 0
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

    // Layers
    const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [shapes, setShapes] = useState<ShapeLayer[]>([]);
    const [drawingShape, setDrawingShape] = useState<ShapeLayer | null>(null);

    // Drawing
    const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
    const [brushSize, setBrushSize] = useState(8);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [strokeColor, setStrokeColor] = useState('#ffffff');
    const [fillColor, setFillColor] = useState('#3b82f6');
    const [fillShapes, setFillShapes] = useState(false);

    // Selection
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isDrawingSelection, setIsDrawingSelection] = useState(false);
    const [selectionPoints, setSelectionPoints] = useState<Array<{ x: number; y: number }>>([]);

    // Transform
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [zoom, setZoom] = useState(1);

    // History
    const [history, setHistory] = useState<Array<{
        adjustments: ImageAdjustments;
        textLayers: TextLayer[];
        strokes: DrawingStroke[];
        shapes: ShapeLayer[];
    }>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const exportCanvasRef = useRef<HTMLCanvasElement>(null);

    // Generative fill prompt
    const [fillPrompt, setFillPrompt] = useState('');

    // Active panel
    const [activePanel, setActivePanel] = useState<'adjustments' | 'filters' | 'hsl'>('adjustments');

    // Redraw canvas when strokes change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all completed strokes
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,0)' : stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });

        // Draw current stroke
        if (currentStroke && currentStroke.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = currentStroke.tool === 'eraser' ? 'rgba(0,0,0,0)' : currentStroke.color;
            ctx.lineWidth = currentStroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = currentStroke.tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
            currentStroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }, [strokes, currentStroke]);

    // Push to history
    const pushHistory = useCallback(() => {
        const newEntry = {
            adjustments: { ...adjustments },
            textLayers: [...textLayers],
            strokes: [...strokes],
            shapes: [...shapes]
        };
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newEntry]);
        setHistoryIndex(prev => prev + 1);
    }, [adjustments, textLayers, strokes, shapes, historyIndex]);

    // Undo/Redo
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const undo = useCallback(() => {
        if (canUndo) {
            const prev = history[historyIndex - 1];
            setAdjustments(prev.adjustments);
            setTextLayers(prev.textLayers);
            setStrokes(prev.strokes);
            setShapes(prev.shapes);
            setHistoryIndex(i => i - 1);
        }
    }, [canUndo, history, historyIndex]);

    const redo = useCallback(() => {
        if (canRedo) {
            const next = history[historyIndex + 1];
            setAdjustments(next.adjustments);
            setTextLayers(next.textLayers);
            setStrokes(next.strokes);
            setShapes(next.shapes);
            setHistoryIndex(i => i + 1);
        }
    }, [canRedo, history, historyIndex]);

    // Handle adjustment change
    const handleAdjustmentChange = (key: keyof ImageAdjustments, value: number) => {
        setAdjustments(prev => ({ ...prev, [key]: value }));
    };

    // Apply preset
    const applyPreset = (preset: typeof FILTER_PRESETS[0]) => {
        setAdjustments({ ...defaultAdjustments, ...preset.adjustments });
        pushHistory();
    };

    // Calculate CSS filter from adjustments
    const calculateImageStyle = useCallback((): React.CSSProperties => {
        const {
            exposure, contrast, saturation, vibrance, warmth, blur, hue, sharpness
        } = adjustments;

        const brightness = 1 + (exposure / 100);
        const contrastVal = 1 + (contrast / 100);
        const saturateVal = (saturation + vibrance) / 100;
        const sepiaVal = warmth > 0 ? warmth / 200 : 0;
        const hueRotate = hue + (warmth < 0 ? warmth : 0);

        return {
            filter: `
                brightness(${brightness})
                contrast(${contrastVal})
                saturate(${saturateVal})
                sepia(${sepiaVal})
                hue-rotate(${hueRotate}deg)
                blur(${blur}px)
            `.trim(),
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${zoom})`,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain' as const
        };
    }, [adjustments, rotation, flipH, flipV, zoom]);

    // Get coordinates relative to image
    const getImageCoords = (e: React.MouseEvent) => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image) return null;

        const containerRect = container.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();

        const x = e.clientX - imageRect.left;
        const y = e.clientY - imageRect.top;

        return { x, y, imageWidth: imageRect.width, imageHeight: imageRect.height };
    };

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = getImageCoords(e);
        if (!coords) return;

        const { x, y, imageWidth, imageHeight } = coords;
        const xPercent = (x / imageWidth) * 100;
        const yPercent = (y / imageHeight) * 100;

        // Text tool
        if (activeTool === 'text') {
            const newText: TextLayer = {
                id: generateId(),
                content: 'Text',
                x,
                y,
                fontSize: 24,
                color: brushColor,
                fontFamily: 'Arial'
            };
            setTextLayers(prev => [...prev, newText]);
            setEditingTextId(newText.id);
            pushHistory();
            return;
        }

        // Brush/Eraser
        if (activeTool === 'brush' || activeTool === 'eraser') {
            setCurrentStroke({
                id: generateId(),
                tool: activeTool,
                points: [{ x, y }],
                color: brushColor,
                size: brushSize
            });
            return;
        }

        // Shape tools
        if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
            setDrawingShape({
                id: generateId(),
                type: activeTool as ShapeLayer['type'],
                x1: x,
                y1: y,
                x2: x,
                y2: y,
                strokeColor,
                fillColor,
                strokeWidth: brushSize,
                filled: fillShapes
            });
            return;
        }

        // Eyedropper
        if (activeTool === 'eyedropper') {
            const canvas = document.createElement('canvas');
            const img = imageRef.current;
            if (img) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const scaleX = img.naturalWidth / img.width;
                    const scaleY = img.naturalHeight / img.height;
                    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
                    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
                    setBrushColor(hex);
                    setStrokeColor(hex);
                }
            }
            return;
        }

        // Selection tools
        if (activeTool === 'rect-select') {
            setIsDrawingSelection(true);
            setSelection({ type: 'rect', x1: xPercent, y1: yPercent, x2: xPercent, y2: yPercent });
        } else if (activeTool === 'lasso') {
            setIsDrawingSelection(true);
            setSelectionPoints([{ x: xPercent, y: yPercent }]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const coords = getImageCoords(e);
        if (!coords) return;

        const { x, y, imageWidth, imageHeight } = coords;
        const xPercent = (x / imageWidth) * 100;
        const yPercent = (y / imageHeight) * 100;

        // Drawing
        if (currentStroke) {
            setCurrentStroke(prev => prev ? {
                ...prev,
                points: [...prev.points, { x, y }]
            } : null);
            return;
        }

        // Shape drawing
        if (drawingShape) {
            setDrawingShape(prev => prev ? { ...prev, x2: x, y2: y } : null);
            return;
        }

        // Selection
        if (isDrawingSelection) {
            if (activeTool === 'rect-select' && selection?.type === 'rect') {
                setSelection(prev => prev ? { ...prev, x2: xPercent, y2: yPercent } : null);
            } else if (activeTool === 'lasso') {
                setSelectionPoints(prev => [...prev, { x: xPercent, y: yPercent }]);
            }
        }
    };

    const handleMouseUp = () => {
        // Finish stroke
        if (currentStroke && currentStroke.points.length > 1) {
            setStrokes(prev => [...prev, currentStroke]);
            pushHistory();
        }
        setCurrentStroke(null);

        // Finish shape
        if (drawingShape) {
            setShapes(prev => [...prev, drawingShape]);
            pushHistory();
        }
        setDrawingShape(null);

        // Finish selection
        if (isDrawingSelection) {
            setIsDrawingSelection(false);
            if (activeTool === 'lasso' && selectionPoints.length > 2) {
                setSelection({ type: 'lasso', points: selectionPoints });
            }
        }
    };

    // Export image
    const exportImage = useCallback(() => {
        const img = imageRef.current;
        const drawCanvas = canvasRef.current;
        if (!img) return null;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = img.naturalWidth;
        exportCanvas.height = img.naturalHeight;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return null;

        // Apply adjustments via filter
        const style = calculateImageStyle();
        ctx.filter = style.filter || 'none';

        // Draw base image
        ctx.save();
        ctx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();

        ctx.filter = 'none';

        // Draw shapes
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        shapes.forEach(shape => {
            ctx.strokeStyle = shape.strokeColor;
            ctx.fillStyle = shape.fillColor;
            ctx.lineWidth = shape.strokeWidth * scaleX;

            const x1 = shape.x1 * scaleX;
            const y1 = shape.y1 * scaleY;
            const x2 = shape.x2 * scaleX;
            const y2 = shape.y2 * scaleY;

            ctx.beginPath();
            if (shape.type === 'rectangle') {
                if (shape.filled) ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            } else if (shape.type === 'circle') {
                const rx = Math.abs(x2 - x1) / 2;
                const ry = Math.abs(y2 - y1) / 2;
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                if (shape.filled) ctx.fill();
                ctx.stroke();
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                if (shape.type === 'arrow') {
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const headLen = 20 * scaleX;
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                }
            }
        });

        // Draw strokes
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size * scaleX;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
            stroke.points.slice(1).forEach(p => ctx.lineTo(p.x * scaleX, p.y * scaleY));
            ctx.stroke();
        });

        ctx.globalCompositeOperation = 'source-over';

        // Draw text
        textLayers.forEach(text => {
            ctx.font = `${text.fontSize * scaleX}px ${text.fontFamily}`;
            ctx.fillStyle = text.color;
            ctx.fillText(text.content, text.x * scaleX, text.y * scaleY);
        });

        // Add vignette
        if (adjustments.vignette > 0) {
            const gradient = ctx.createRadialGradient(
                exportCanvas.width / 2, exportCanvas.height / 2, 0,
                exportCanvas.width / 2, exportCanvas.height / 2, Math.max(exportCanvas.width, exportCanvas.height) / 2
            );
            gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }

        return exportCanvas.toDataURL('image/png');
    }, [adjustments, rotation, flipH, flipV, shapes, strokes, textLayers, calculateImageStyle]);

    // Handle save
    const handleSave = () => {
        const dataUrl = exportImage();
        if (dataUrl) {
            onSave?.({ adjustments, textLayers, dataUrl });
        }
    };

    // Download image
    const downloadImage = () => {
        const dataUrl = exportImage();
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = 'edited-image.png';
            link.href = dataUrl;
            link.click();
        }
    };

    // Reset adjustments
    const resetAdjustments = () => {
        setAdjustments(defaultAdjustments);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setZoom(1);
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
        <div className={`flex flex-col h-full bg-gray-900 text-white ${className}`}>
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Camera size={18} /> {title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={undo} disabled={!canUndo} className="p-2 rounded hover:bg-gray-700 disabled:opacity-50" title="Undo">
                            <Undo size={18} />
                        </button>
                        <button onClick={redo} disabled={!canRedo} className="p-2 rounded hover:bg-gray-700 disabled:opacity-50" title="Redo">
                            <Redo size={18} />
                        </button>
                        <div className="border-l border-gray-600 h-6 mx-2" />
                        <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 rounded hover:bg-gray-700" title="Rotate 90°">
                            <RotateCw size={18} />
                        </button>
                        <button onClick={() => setFlipH(f => !f)} className={`p-2 rounded hover:bg-gray-700 ${flipH ? 'bg-blue-600' : ''}`} title="Flip Horizontal">
                            <FlipHorizontal size={18} />
                        </button>
                        <button onClick={() => setFlipV(f => !f)} className={`p-2 rounded hover:bg-gray-700 ${flipV ? 'bg-blue-600' : ''}`} title="Flip Vertical">
                            <FlipVertical size={18} />
                        </button>
                        <div className="border-l border-gray-600 h-6 mx-2" />
                        <button onClick={downloadImage} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600 flex items-center gap-1">
                            <Download size={14} /> Export
                        </button>
                        {onSave && (
                            <button onClick={handleSave} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700 flex items-center gap-1">
                                <Save size={14} /> Save
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
                <div className="w-14 border-r border-gray-700 flex flex-col items-center py-2 gap-1 bg-gray-800 overflow-y-auto">
                    <ToolButton active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select">
                        <CursorIcon />
                    </ToolButton>
                    <ToolButton active={activeTool === 'move'} onClick={() => setActiveTool('move')} title="Move">
                        <Move size={20} />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-1" />

                    <ToolButton active={activeTool === 'rect-select'} onClick={() => setActiveTool('rect-select')} title="Rectangle Select">
                        <RectSelectIcon />
                    </ToolButton>
                    <ToolButton active={activeTool === 'lasso'} onClick={() => setActiveTool('lasso')} title="Lasso Select">
                        <LassoIcon />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-1" />

                    <ToolButton active={activeTool === 'brush'} onClick={() => setActiveTool('brush')} title="Brush">
                        <Brush size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} title="Eraser">
                        <Eraser size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'eyedropper'} onClick={() => setActiveTool('eyedropper')} title="Eyedropper">
                        <Pipette size={20} />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-1" />

                    <ToolButton active={activeTool === 'rectangle'} onClick={() => setActiveTool('rectangle')} title="Rectangle">
                        <Square size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} title="Circle">
                        <Circle size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'line'} onClick={() => setActiveTool('line')} title="Line">
                        <Minus size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'arrow'} onClick={() => setActiveTool('arrow')} title="Arrow">
                        <ArrowRight size={20} />
                    </ToolButton>

                    <div className="border-t border-gray-600 w-full my-1" />

                    <ToolButton active={activeTool === 'text'} onClick={() => setActiveTool('text')} title="Text Tool">
                        <Type size={20} />
                    </ToolButton>
                    <ToolButton active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} title="Crop">
                        <Crop size={20} />
                    </ToolButton>
                </div>

                {/* Tool Options Bar */}
                {(activeTool === 'brush' || activeTool === 'eraser' || ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) && (
                    <div className="absolute top-[52px] left-14 right-72 h-10 bg-gray-800 border-b border-gray-700 flex items-center gap-4 px-4 z-10">
                        <div className="flex items-center gap-2">
                            <span className="text-xs">Size:</span>
                            <input
                                type="range"
                                min={1}
                                max={50}
                                value={brushSize}
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-24"
                            />
                            <span className="text-xs w-6">{brushSize}</span>
                        </div>
                        {activeTool !== 'eraser' && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs">Color:</span>
                                <input
                                    type="color"
                                    value={activeTool === 'brush' ? brushColor : strokeColor}
                                    onChange={(e) => activeTool === 'brush' ? setBrushColor(e.target.value) : setStrokeColor(e.target.value)}
                                    className="w-8 h-6 rounded cursor-pointer"
                                />
                            </div>
                        )}
                        {['rectangle', 'circle'].includes(activeTool) && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">Fill:</span>
                                    <input type="checkbox" checked={fillShapes} onChange={(e) => setFillShapes(e.target.checked)} />
                                    {fillShapes && (
                                        <input
                                            type="color"
                                            value={fillColor}
                                            onChange={(e) => setFillColor(e.target.value)}
                                            className="w-8 h-6 rounded cursor-pointer"
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-1 flex items-center justify-center p-4 overflow-hidden relative bg-gray-800/50"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        cursor: activeTool === 'text' ? 'text' :
                            activeTool === 'lasso' ? 'crosshair' :
                            activeTool === 'brush' || activeTool === 'eraser' ? 'crosshair' :
                            activeTool === 'eyedropper' ? 'crosshair' :
                            ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool) ? 'crosshair' :
                            'default'
                    }}
                >
                    <div className="relative inline-block">
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            style={calculateImageStyle()}
                            alt="Editing"
                            draggable={false}
                            onLoad={() => {
                                const img = imageRef.current;
                                const canvas = canvasRef.current;
                                if (img && canvas) {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                }
                            }}
                        />

                        {/* Drawing Canvas */}
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{ width: '100%', height: '100%' }}
                        />

                        {/* Shapes */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            {[...shapes, drawingShape].filter(Boolean).map(shape => {
                                if (!shape) return null;
                                const img = imageRef.current;
                                if (!img) return null;
                                const { x1, y1, x2, y2 } = shape;

                                if (shape.type === 'rectangle') {
                                    return (
                                        <rect
                                            key={shape.id}
                                            x={Math.min(x1, x2)}
                                            y={Math.min(y1, y2)}
                                            width={Math.abs(x2 - x1)}
                                            height={Math.abs(y2 - y1)}
                                            stroke={shape.strokeColor}
                                            strokeWidth={shape.strokeWidth}
                                            fill={shape.filled ? shape.fillColor : 'none'}
                                        />
                                    );
                                }
                                if (shape.type === 'circle') {
                                    return (
                                        <ellipse
                                            key={shape.id}
                                            cx={(x1 + x2) / 2}
                                            cy={(y1 + y2) / 2}
                                            rx={Math.abs(x2 - x1) / 2}
                                            ry={Math.abs(y2 - y1) / 2}
                                            stroke={shape.strokeColor}
                                            strokeWidth={shape.strokeWidth}
                                            fill={shape.filled ? shape.fillColor : 'none'}
                                        />
                                    );
                                }
                                if (shape.type === 'line') {
                                    return (
                                        <line
                                            key={shape.id}
                                            x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={shape.strokeColor}
                                            strokeWidth={shape.strokeWidth}
                                        />
                                    );
                                }
                                if (shape.type === 'arrow') {
                                    const angle = Math.atan2(y2 - y1, x2 - x1);
                                    const headLen = 15;
                                    return (
                                        <g key={shape.id}>
                                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={shape.strokeColor} strokeWidth={shape.strokeWidth} />
                                            <line
                                                x1={x2} y1={y2}
                                                x2={x2 - headLen * Math.cos(angle - Math.PI / 6)}
                                                y2={y2 - headLen * Math.sin(angle - Math.PI / 6)}
                                                stroke={shape.strokeColor} strokeWidth={shape.strokeWidth}
                                            />
                                            <line
                                                x1={x2} y1={y2}
                                                x2={x2 - headLen * Math.cos(angle + Math.PI / 6)}
                                                y2={y2 - headLen * Math.sin(angle + Math.PI / 6)}
                                                stroke={shape.strokeColor} strokeWidth={shape.strokeWidth}
                                            />
                                        </g>
                                    );
                                }
                                return null;
                            })}
                        </svg>

                        {/* Selection Overlays */}
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
                                className="absolute cursor-move select-none"
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
                                        onBlur={() => { setEditingTextId(null); pushHistory(); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { setEditingTextId(null); pushHistory(); } }}
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

                {/* Right Panel */}
                <div className="w-72 border-l border-gray-700 bg-gray-800 flex flex-col overflow-hidden">
                    {/* Panel Tabs */}
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActivePanel('adjustments')}
                            className={`flex-1 px-3 py-2 text-sm ${activePanel === 'adjustments' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            Adjust
                        </button>
                        <button
                            onClick={() => setActivePanel('filters')}
                            className={`flex-1 px-3 py-2 text-sm ${activePanel === 'filters' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            Filters
                        </button>
                        <button
                            onClick={() => setActivePanel('hsl')}
                            className={`flex-1 px-3 py-2 text-sm ${activePanel === 'hsl' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            HSL
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {activePanel === 'adjustments' && (
                            <>
                                <details open>
                                    <summary className="font-semibold text-sm cursor-pointer mb-2">Light</summary>
                                    <div className="space-y-2">
                                        <SliderControl label="Exposure" value={adjustments.exposure} min={-100} max={100} onChange={(v) => handleAdjustmentChange('exposure', v)} onCommit={pushHistory} />
                                        <SliderControl label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => handleAdjustmentChange('contrast', v)} onCommit={pushHistory} />
                                        <SliderControl label="Highlights" value={adjustments.highlights} min={-100} max={100} onChange={(v) => handleAdjustmentChange('highlights', v)} onCommit={pushHistory} />
                                        <SliderControl label="Shadows" value={adjustments.shadows} min={-100} max={100} onChange={(v) => handleAdjustmentChange('shadows', v)} onCommit={pushHistory} />
                                        <SliderControl label="Whites" value={adjustments.whites} min={-100} max={100} onChange={(v) => handleAdjustmentChange('whites', v)} onCommit={pushHistory} />
                                        <SliderControl label="Blacks" value={adjustments.blacks} min={-100} max={100} onChange={(v) => handleAdjustmentChange('blacks', v)} onCommit={pushHistory} />
                                    </div>
                                </details>

                                <details open>
                                    <summary className="font-semibold text-sm cursor-pointer mb-2">Color</summary>
                                    <div className="space-y-2">
                                        <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => handleAdjustmentChange('saturation', v)} onCommit={pushHistory} />
                                        <SliderControl label="Vibrance" value={adjustments.vibrance} min={-100} max={100} onChange={(v) => handleAdjustmentChange('vibrance', v)} onCommit={pushHistory} />
                                        <SliderControl label="Warmth" value={adjustments.warmth} min={-100} max={100} onChange={(v) => handleAdjustmentChange('warmth', v)} onCommit={pushHistory} />
                                        <SliderControl label="Tint" value={adjustments.tint} min={-100} max={100} onChange={(v) => handleAdjustmentChange('tint', v)} onCommit={pushHistory} />
                                    </div>
                                </details>

                                <details open>
                                    <summary className="font-semibold text-sm cursor-pointer mb-2">Effects</summary>
                                    <div className="space-y-2">
                                        <SliderControl label="Clarity" value={adjustments.clarity} min={-100} max={100} onChange={(v) => handleAdjustmentChange('clarity', v)} onCommit={pushHistory} />
                                        <SliderControl label="Sharpness" value={adjustments.sharpness} min={0} max={100} onChange={(v) => handleAdjustmentChange('sharpness', v)} onCommit={pushHistory} />
                                        <SliderControl label="Vignette" value={adjustments.vignette} min={0} max={100} onChange={(v) => handleAdjustmentChange('vignette', v)} onCommit={pushHistory} />
                                        <SliderControl label="Grain" value={adjustments.grain} min={0} max={100} onChange={(v) => handleAdjustmentChange('grain', v)} onCommit={pushHistory} />
                                        <SliderControl label="Blur" value={adjustments.blur} min={0} max={20} onChange={(v) => handleAdjustmentChange('blur', v)} onCommit={pushHistory} />
                                    </div>
                                </details>
                            </>
                        )}

                        {activePanel === 'filters' && (
                            <div className="grid grid-cols-2 gap-2">
                                {FILTER_PRESETS.map(preset => (
                                    <button
                                        key={preset.name}
                                        onClick={() => applyPreset(preset)}
                                        className="p-2 bg-gray-700 rounded text-xs hover:bg-gray-600 transition-colors"
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activePanel === 'hsl' && (
                            <div className="space-y-2">
                                <SliderControl label="Hue" value={adjustments.hue} min={-180} max={180} onChange={(v) => handleAdjustmentChange('hue', v)} onCommit={pushHistory} />
                                <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => handleAdjustmentChange('saturation', v)} onCommit={pushHistory} />
                                <SliderControl label="Lightness" value={adjustments.exposure} min={-100} max={100} onChange={(v) => handleAdjustmentChange('exposure', v)} onCommit={pushHistory} />
                            </div>
                        )}

                        {/* Selection Actions */}
                        {selection && onGenerativeFill && (
                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <h5 className="font-semibold text-sm flex items-center gap-2">
                                    <Sparkles size={14} /> Generative Fill
                                </h5>
                                <input
                                    type="text"
                                    value={fillPrompt}
                                    onChange={(e) => setFillPrompt(e.target.value)}
                                    placeholder="Describe what to generate..."
                                    className="w-full bg-gray-700 rounded px-2 py-1 text-sm"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onGenerativeFill(selection, fillPrompt)}
                                        className="flex-1 bg-blue-600 rounded py-1 text-sm hover:bg-blue-700"
                                    >
                                        Generate
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
                            className="w-full bg-gray-700 rounded py-2 text-sm hover:bg-gray-600 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} /> Reset All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
