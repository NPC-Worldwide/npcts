import React, { useState, useCallback, useRef } from 'react';
import type { WritingChapter, MangaPage, MangaPanel, MangaLayoutType, MangaReference } from './types';
import { MANGA_LAYOUTS } from './types';

export interface MangaEditorProps {
    chapter: WritingChapter;
    onUpdateChapter: (id: string, updates: Partial<WritingChapter>) => void;
    /** Called when user wants to AI-generate a panel image. Return the image URL/data-url, or null. */
    onGeneratePanel?: (panelId: string, prompt: string, referenceImageUrls: string[]) => Promise<string | null>;
    /** Called when user wants to draw/paint on a panel (opens external drawing tool) */
    onDrawPanel?: (panelId: string, existingImageUrl?: string) => void;
    /** External references. If not provided, manages references locally via base64. */
    references?: MangaReference[];
    onUploadReference?: (files: File[]) => void;
    onRemoveReference?: (refId: string) => void;
}

let _idCounter = Date.now();
const genId = () => `mg_${++_idCounter}`;

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const LAYOUT_GRID: Record<MangaLayoutType, React.CSSProperties> = {
    full: { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' },
    'split-horizontal': { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' },
    'split-vertical': { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr' },
    quad: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
    'three-top': { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
    'three-bottom': { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
};

const getPanelGridStyle = (layout: MangaLayoutType, position: number): React.CSSProperties => {
    if (layout === 'three-top' && position === 3) return { gridColumn: '1 / span 3', gridRow: '2' };
    if (layout === 'three-bottom' && position === 0) return { gridColumn: '1 / span 3', gridRow: '1' };
    return {};
};

// ─── Layout Selector ───
const LayoutSelector: React.FC<{ onApply: (layout: MangaLayoutType) => void }> = ({ onApply }) => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#d1d5db' }}>Select Panel Layout</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '24rem', margin: '0 auto' }}>
            {(Object.entries(MANGA_LAYOUTS) as [MangaLayoutType, { name: string; panelCount: number }][]).map(([key, info]) => (
                <button
                    key={key}
                    onClick={() => onApply(key)}
                    style={{
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#d1d5db',
                    }}
                >
                    <div style={{
                        display: 'grid',
                        ...LAYOUT_GRID[key],
                        gap: '2px',
                        height: '60px',
                        marginBottom: '0.5rem',
                    }}>
                        {Array.from({ length: info.panelCount }).map((_, i) => (
                            <div key={i} style={{
                                background: 'rgba(99,102,241,0.3)',
                                borderRadius: '2px',
                                ...getPanelGridStyle(key, i),
                            }} />
                        ))}
                    </div>
                    <div style={{ fontSize: '0.65rem' }}>{info.name}</div>
                </button>
            ))}
        </div>
    </div>
);

// ─── Panel Cell ───
const PanelCell: React.FC<{
    panel: MangaPanel;
    layout: MangaLayoutType;
    onUpdateDescription: (desc: string) => void;
    onGenerate?: () => void;
    onDraw?: () => void;
    onUpload: () => void;
}> = ({ panel, layout, onUpdateDescription, onGenerate, onDraw, onUpload }) => {
    const [editing, setEditing] = useState(false);
    const [hovering, setHovering] = useState(false);

    return (
        <div
            style={{
                ...getPanelGridStyle(layout, panel.position),
                background: panel.imageUrl ? 'transparent' : 'rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                border: editing ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {panel.imageUrl ? (
                <>
                    <img src={panel.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {hovering && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            flexWrap: 'wrap', padding: '0.5rem',
                        }}>
                            {onGenerate && (
                                <button onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                                    style={overlayBtnStyle('#4f46e5')}>
                                    Regenerate
                                </button>
                            )}
                            {onDraw && (
                                <button onClick={(e) => { e.stopPropagation(); onDraw(); }}
                                    style={overlayBtnStyle('#059669')}>
                                    Edit
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onUpload(); }}
                                style={overlayBtnStyle('rgba(255,255,255,0.15)')}>
                                Replace
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '0.75rem', width: '100%' }}>
                    {editing ? (
                        <div onClick={e => e.stopPropagation()}>
                            <textarea
                                value={panel.description}
                                onChange={e => onUpdateDescription(e.target.value)}
                                placeholder="Panel description / dialogue..."
                                rows={2}
                                autoFocus
                                onBlur={() => setEditing(false)}
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                                    padding: '0.25rem 0.5rem', fontSize: '0.65rem', color: '#d1d5db',
                                    resize: 'none', outline: 'none', marginBottom: '0.5rem',
                                }}
                            />
                        </div>
                    ) : (
                        <div onClick={() => setEditing(true)} style={{ marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '1.5rem', opacity: 0.3, lineHeight: 1 }}>&#x1F5BC;</div>
                            <div style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {panel.description || 'Click to add description'}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {onGenerate && (
                            <button onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                                style={actionBtnStyle('#4f46e5', '#fff')}>
                                Generate
                            </button>
                        )}
                        {onDraw && (
                            <button onClick={(e) => { e.stopPropagation(); onDraw(); }}
                                style={actionBtnStyle('#059669', '#fff')}>
                                Draw
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onUpload(); }}
                            style={actionBtnStyle('rgba(255,255,255,0.1)', '#d1d5db')}>
                            Upload
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const overlayBtnStyle = (bg: string): React.CSSProperties => ({
    padding: '0.4rem 0.75rem', background: bg, border: 'none',
    borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.65rem',
});

const actionBtnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '0.3rem 0.6rem', background: bg, border: 'none',
    borderRadius: '5px', color, cursor: 'pointer', fontSize: '0.6rem',
});

// ─── Generate Modal ───
const GenerateModal: React.FC<{
    panel: MangaPanel;
    references: MangaReference[];
    onGenerate: (prompt: string, refUrls: string[]) => Promise<void>;
    onClose: () => void;
}> = ({ panel, references, onGenerate, onClose }) => {
    const [prompt, setPrompt] = useState(panel.prompt || panel.description || '');
    const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        setError('');
        try {
            const refUrls = references
                .filter(r => selectedRefs.includes(r.id))
                .map(r => r.imageUrl);
            await onGenerate(prompt, refUrls);
        } catch {
            setError('Generation failed. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }} onClick={generating ? undefined : onClose}>
            <div style={{
                background: '#1e1e2e', borderRadius: '12px', padding: '1.5rem',
                width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.1)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Generate Panel Image</h3>
                    <button onClick={onClose} disabled={generating}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}>
                        x
                    </button>
                </div>

                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>Image Prompt</label>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe what you want in this panel..."
                    disabled={generating}
                    rows={4}
                    style={{
                        width: '100%', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                        padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#e2e8f0',
                        resize: 'vertical', outline: 'none', marginBottom: '0.75rem',
                        boxSizing: 'border-box',
                    }}
                />

                {references.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                            Character References (click to include)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {references.map(ref => (
                                <div
                                    key={ref.id}
                                    onClick={() => !generating && setSelectedRefs(prev =>
                                        prev.includes(ref.id) ? prev.filter(id => id !== ref.id) : [...prev, ref.id]
                                    )}
                                    style={{
                                        width: '64px', cursor: generating ? 'default' : 'pointer',
                                        border: `2px solid ${selectedRefs.includes(ref.id) ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '8px', overflow: 'hidden',
                                        opacity: generating ? 0.5 : 1,
                                        transition: 'border-color 0.15s',
                                    }}
                                >
                                    <img src={ref.imageUrl} alt={ref.name}
                                        style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block' }} />
                                    <div style={{
                                        fontSize: '0.55rem', textAlign: 'center', padding: '2px',
                                        color: '#9ca3af', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                    }}>
                                        {ref.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</p>}

                {generating && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                        Generating your panel... This may take a moment.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={generating}
                        style={{
                            padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: 'none',
                            borderRadius: '8px', color: '#d1d5db', cursor: 'pointer', fontSize: '0.8rem',
                        }}>
                        Cancel
                    </button>
                    <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
                        style={{
                            padding: '0.5rem 1rem', background: '#4f46e5', border: 'none',
                            borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                            opacity: (!prompt.trim() || generating) ? 0.5 : 1,
                        }}>
                        {generating ? 'Generating...' : 'Generate Image'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Reader Modal ───
const ReaderModal: React.FC<{
    pages: MangaPage[];
    chapterTitle: string;
    onClose: () => void;
}> = ({ pages, chapterTitle, onClose }) => {
    const [pageIndex, setPageIndex] = useState(0);
    const pagesWithContent = pages.filter(p => p.layout && p.panels.some(pn => pn.imageUrl));

    if (pagesWithContent.length === 0) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }} onClick={onClose}>
                <div style={{
                    background: '#1e1e2e', borderRadius: '12px', padding: '2rem', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x1F4D6;</div>
                    <p style={{ color: '#9ca3af', margin: 0 }}>No pages with images yet.</p>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>Generate or draw panel images first.</p>
                    <button onClick={onClose} style={{
                        marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#4f46e5',
                        border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer',
                    }}>Close</button>
                </div>
            </div>
        );
    }

    const page = pagesWithContent[pageIndex];

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', color: '#d1d5db' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{chapterTitle}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Page {pageIndex + 1} of {pagesWithContent.length}
                </span>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#9ca3af',
                    cursor: 'pointer', fontSize: '1.2rem', marginLeft: '1rem',
                }}>x</button>
            </div>

            <div style={{
                display: 'grid',
                ...LAYOUT_GRID[page.layout!],
                gap: '2px',
                width: '100%', maxWidth: '600px',
                maxHeight: '70vh',
                aspectRatio: '3/4',
                background: '#000',
                borderRadius: '4px',
                overflow: 'hidden',
            }}>
                {page.panels.sort((a, b) => a.position - b.position).map(panel => (
                    <div key={panel.id} style={{
                        ...getPanelGridStyle(page.layout!, panel.position),
                        overflow: 'hidden',
                    }}>
                        {panel.imageUrl ? (
                            <img src={panel.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ color: '#4b5563', fontSize: '0.7rem' }}>{panel.description || 'Empty'}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button onClick={() => setPageIndex(i => Math.max(0, i - 1))} disabled={pageIndex === 0}
                    style={{
                        padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: 'none',
                        borderRadius: '8px', color: '#d1d5db', cursor: 'pointer',
                        opacity: pageIndex === 0 ? 0.3 : 1,
                    }}>
                    Prev
                </button>
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{pageIndex + 1} / {pagesWithContent.length}</span>
                <button onClick={() => setPageIndex(i => Math.min(pagesWithContent.length - 1, i + 1))}
                    disabled={pageIndex >= pagesWithContent.length - 1}
                    style={{
                        padding: '0.5rem 1rem', background: '#4f46e5', border: 'none',
                        borderRadius: '8px', color: '#fff', cursor: 'pointer',
                        opacity: pageIndex >= pagesWithContent.length - 1 ? 0.3 : 1,
                    }}>
                    Next
                </button>
            </div>
        </div>
    );
};

// ─── Reference Panel ───
const ReferencePanel: React.FC<{
    references: MangaReference[];
    onUpload: (files: File[]) => void;
    onRemove: (id: string) => void;
}> = ({ references, onUpload, onRemove }) => {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem' }}>
            <div style={{
                fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: '0.5rem',
            }}>
                Character References
            </div>

            <div
                onDrop={e => {
                    e.preventDefault();
                    setDragging(false);
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (files.length) onUpload(files);
                }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: `1px dashed ${dragging ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '6px', padding: '0.5rem', textAlign: 'center',
                    cursor: 'pointer', marginBottom: '0.5rem',
                    background: dragging ? 'rgba(99,102,241,0.1)' : 'transparent',
                    transition: 'all 0.15s',
                }}
            >
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                    Drop images or click to upload
                </div>
                <input ref={inputRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }}
                    onChange={e => {
                        if (e.target.files?.length) {
                            onUpload(Array.from(e.target.files));
                            e.target.value = '';
                        }
                    }}
                />
            </div>

            {references.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {references.map(ref => (
                        <div key={ref.id} style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden' }}>
                            <img src={ref.imageUrl} alt={ref.name}
                                style={{ width: '100%', height: '45px', objectFit: 'cover', display: 'block' }} />
                            <button onClick={(e) => { e.stopPropagation(); onRemove(ref.id); }}
                                style={{
                                    position: 'absolute', top: '1px', right: '1px',
                                    background: 'rgba(239,68,68,0.8)', border: 'none',
                                    color: '#fff', width: '14px', height: '14px', borderRadius: '50%',
                                    fontSize: '0.5rem', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                                    padding: 0,
                                }}>x</button>
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'rgba(0,0,0,0.7)', padding: '1px 3px',
                                fontSize: '0.5rem', color: '#d1d5db', whiteSpace: 'nowrap',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{ref.name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main MangaEditor ───
export const MangaEditor: React.FC<MangaEditorProps> = ({
    chapter, onUpdateChapter,
    onGeneratePanel, onDrawPanel,
    references: externalRefs, onUploadReference, onRemoveReference,
}) => {
    const pages = chapter.pages || [];
    const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id || null);
    const [selectingLayout, setSelectingLayout] = useState<string | null>(null);
    const [generatePanel, setGeneratePanel] = useState<MangaPanel | null>(null);
    const [showReader, setShowReader] = useState(false);
    const [localRefs, setLocalRefs] = useState<MangaReference[]>([]);

    const refs = externalRefs || localRefs;
    const activePage = pages.find(p => p.id === activePageId) || null;

    const savePages = useCallback((updated: MangaPage[]) => {
        onUpdateChapter(chapter.id, { pages: updated });
    }, [chapter.id, onUpdateChapter]);

    // Local reference management (base64 fallback when no external callbacks)
    const handleUploadRefs = useCallback(async (files: File[]) => {
        if (onUploadReference) {
            onUploadReference(files);
            return;
        }
        const newRefs: MangaReference[] = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            const dataUrl = await fileToBase64(file);
            newRefs.push({ id: genId(), name: file.name.replace(/\.[^.]+$/, ''), imageUrl: dataUrl });
        }
        setLocalRefs(prev => [...prev, ...newRefs]);
    }, [onUploadReference]);

    const handleRemoveRef = useCallback((id: string) => {
        if (onRemoveReference) { onRemoveReference(id); return; }
        setLocalRefs(prev => prev.filter(r => r.id !== id));
    }, [onRemoveReference]);

    // Page operations
    const addPage = useCallback(() => {
        const newPage: MangaPage = { id: genId(), number: pages.length + 1, layout: null, panels: [] };
        savePages([...pages, newPage]);
        setActivePageId(newPage.id);
        setSelectingLayout(newPage.id);
    }, [pages, savePages]);

    const deletePage = useCallback((pageId: string) => {
        const updated = pages.filter(p => p.id !== pageId).map((p, i) => ({ ...p, number: i + 1 }));
        savePages(updated);
        if (activePageId === pageId) setActivePageId(updated[0]?.id || null);
    }, [pages, activePageId, savePages]);

    const applyLayout = useCallback((pageId: string, layout: MangaLayoutType) => {
        const info = MANGA_LAYOUTS[layout];
        const panels: MangaPanel[] = Array.from({ length: info.panelCount }, (_, i) => ({
            id: genId(), position: i, description: '',
        }));
        savePages(pages.map(p => p.id === pageId ? { ...p, layout, panels } : p));
        setSelectingLayout(null);
    }, [pages, savePages]);

    const updatePanel = useCallback((pageId: string, panelId: string, updates: Partial<MangaPanel>) => {
        savePages(pages.map(p =>
            p.id === pageId
                ? { ...p, panels: p.panels.map(pn => pn.id === panelId ? { ...pn, ...updates } : pn) }
                : p
        ));
    }, [pages, savePages]);

    // Upload image to panel (base64)
    const handleUploadPanelImage = useCallback(async (pageId: string, panelId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const dataUrl = await fileToBase64(file);
            updatePanel(pageId, panelId, { imageUrl: dataUrl });
        };
        input.click();
    }, [updatePanel]);

    // Generate handler
    const handleGenerate = useCallback(async (prompt: string, refUrls: string[]) => {
        if (!generatePanel || !onGeneratePanel || !activePage) return;
        const imageUrl = await onGeneratePanel(generatePanel.id, prompt, refUrls);
        if (imageUrl) {
            updatePanel(activePage.id, generatePanel.id, { imageUrl, prompt });
        }
        setGeneratePanel(null);
    }, [generatePanel, onGeneratePanel, activePage, updatePanel]);

    const hasAnyContent = pages.some(p => p.panels.some(pn => pn.imageUrl));

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
            {/* Left sidebar */}
            <div style={{
                width: '160px', borderRight: '1px solid rgba(255,255,255,0.1)',
                overflow: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column',
            }}>
                {/* Pages section */}
                <div style={{ padding: '0.5rem', flex: 1, overflow: 'auto' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: '0.5rem', padding: '0 0.25rem',
                    }}>
                        <span style={{ fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pages
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {hasAnyContent && (
                                <button onClick={() => setShowReader(true)}
                                    style={{
                                        fontSize: '0.65rem', color: '#10b981', background: 'none',
                                        border: 'none', cursor: 'pointer',
                                    }}
                                    title="Preview / Read">
                                    Preview
                                </button>
                            )}
                            <button onClick={addPage}
                                style={{ fontSize: '0.7rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
                                + Add
                            </button>
                        </div>
                    </div>
                    {pages.map(page => (
                        <div
                            key={page.id}
                            onClick={() => { setActivePageId(page.id); setSelectingLayout(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.375rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '0.75rem', marginBottom: '0.125rem',
                                background: activePageId === page.id ? 'rgba(79,70,229,0.15)' : 'transparent',
                                color: activePageId === page.id ? '#a5b4fc' : '#d1d5db',
                            }}
                        >
                            <span>Page {page.number}</span>
                            <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>
                                {page.layout ? MANGA_LAYOUTS[page.layout].panelCount + 'p' : '--'}
                            </span>
                        </div>
                    ))}
                    {pages.length === 0 && (
                        <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.7rem' }}>
                            No pages yet
                        </div>
                    )}
                </div>

                {/* References section */}
                <ReferencePanel
                    references={refs}
                    onUpload={handleUploadRefs}
                    onRemove={handleRemoveRef}
                />
            </div>

            {/* Main editor area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                {selectingLayout ? (
                    <LayoutSelector onApply={layout => applyLayout(selectingLayout, layout)} />
                ) : activePage ? (
                    activePage.layout ? (
                        <div>
                            {/* Page header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Page {activePage.number}</span>
                                <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                                    ({MANGA_LAYOUTS[activePage.layout].name})
                                </span>
                                <button onClick={() => setSelectingLayout(activePage.id)}
                                    style={{
                                        fontSize: '0.65rem', color: '#6366f1', background: 'none',
                                        border: 'none', cursor: 'pointer', marginLeft: 'auto',
                                    }}>
                                    Change Layout
                                </button>
                            </div>

                            {/* Panel grid */}
                            <div style={{
                                display: 'grid',
                                ...LAYOUT_GRID[activePage.layout],
                                gap: '4px',
                                aspectRatio: '3/4',
                                maxHeight: '65vh',
                                border: '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#000',
                            }}>
                                {activePage.panels.sort((a, b) => a.position - b.position).map(panel => (
                                    <PanelCell
                                        key={panel.id}
                                        panel={panel}
                                        layout={activePage.layout!}
                                        onUpdateDescription={desc => updatePanel(activePage.id, panel.id, { description: desc })}
                                        onGenerate={onGeneratePanel ? () => setGeneratePanel(panel) : undefined}
                                        onDraw={onDrawPanel ? () => onDrawPanel(panel.id, panel.imageUrl) : undefined}
                                        onUpload={() => handleUploadPanelImage(activePage.id, panel.id)}
                                    />
                                ))}
                            </div>

                            {/* Page actions */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                                <button onClick={() => deletePage(activePage.id)}
                                    style={{ fontSize: '0.7rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Delete Page
                                </button>
                            </div>
                        </div>
                    ) : (
                        <LayoutSelector onApply={layout => applyLayout(activePage.id, layout)} />
                    )
                ) : (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', height: '100%', color: '#6b7280',
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}>&#x1F4DA;</div>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>Manga / Graphic Novel Editor</p>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Add a page to start creating panels</p>
                        <button onClick={addPage}
                            style={{
                                marginTop: '1rem', padding: '0.5rem 1.5rem',
                                background: '#4f46e5', color: '#fff', border: 'none',
                                borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
                            }}>
                            + Add First Page
                        </button>
                    </div>
                )}
            </div>

            {/* Generate Modal */}
            {generatePanel && (
                <GenerateModal
                    panel={generatePanel}
                    references={refs}
                    onGenerate={handleGenerate}
                    onClose={() => setGeneratePanel(null)}
                />
            )}

            {/* Reader Modal */}
            {showReader && (
                <ReaderModal
                    pages={pages}
                    chapterTitle={chapter.title}
                    onClose={() => setShowReader(false)}
                />
            )}
        </div>
    );
};
