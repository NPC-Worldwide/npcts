import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { WritingChapter, ScreenplayElement } from './types';

export interface ScreenplayEditorProps {
    chapter: WritingChapter;
    onContentChange: (content: string) => void;
}

const ELEMENT_TYPES = [
    { type: 'scene', label: 'Scene Heading', shortcut: 'S', placeholder: 'INT. LOCATION - TIME' },
    { type: 'action', label: 'Action', shortcut: 'A', placeholder: 'Describe the action...' },
    { type: 'character', label: 'Character', shortcut: 'C', placeholder: 'CHARACTER NAME' },
    { type: 'dialogue', label: 'Dialogue', shortcut: 'D', placeholder: 'Character speaks...' },
    { type: 'parenthetical', label: 'Parenthetical', shortcut: 'P', placeholder: '(beat)' },
    { type: 'transition', label: 'Transition', shortcut: 'T', placeholder: 'CUT TO:' },
] as const;

type ElementType = typeof ELEMENT_TYPES[number]['type'];

const ELEMENT_STYLES: Record<ElementType, React.CSSProperties> = {
    scene: { fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '1.5rem' },
    action: { marginTop: '0.75rem' },
    character: { textAlign: 'center' as const, textTransform: 'uppercase' as const, marginTop: '1rem', fontWeight: 600 },
    dialogue: { textAlign: 'center' as const, maxWidth: '60%', margin: '0 auto', paddingLeft: '15%' },
    parenthetical: { textAlign: 'center' as const, fontStyle: 'italic', maxWidth: '40%', margin: '0 auto', paddingLeft: '20%' },
    transition: { textAlign: 'right' as const, textTransform: 'uppercase' as const, marginTop: '1rem' },
};

// Parse content into screenplay elements from a simple markup format
function parseScreenplay(content: string): ScreenplayElement[] {
    if (!content) return [{ id: '1', type: 'action', text: '' }];
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Fallback: treat as plain text action
    return [{ id: '1', type: 'action', text: content }];
}

function serializeScreenplay(elements: ScreenplayElement[]): string {
    return JSON.stringify(elements);
}

// Also export a plain-text renderer for export
export function screenplayToPlainText(elements: ScreenplayElement[]): string {
    return elements.map(el => {
        switch (el.type) {
            case 'scene': return `\n${el.text.toUpperCase()}\n`;
            case 'action': return `\n${el.text}\n`;
            case 'character': return `\n${''.padStart(20)}${el.text.toUpperCase()}`;
            case 'dialogue': return `${''.padStart(10)}${el.text}`;
            case 'parenthetical': return `${''.padStart(15)}(${el.text.replace(/^\(|\)$/g, '')})`;
            case 'transition': return `\n${''.padStart(50)}${el.text.toUpperCase()}\n`;
            default: return el.text;
        }
    }).join('\n');
}

let _idCounter = Date.now();
const genId = () => `sp_${++_idCounter}`;

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({ chapter, onContentChange }) => {
    const [elements, setElements] = useState<ScreenplayElement[]>(() => parseScreenplay(chapter.content));
    const [activeElement, setActiveElement] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<ElementType>('action');
    const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    // Re-parse when chapter changes
    useEffect(() => {
        setElements(parseScreenplay(chapter.content));
    }, [chapter.id]);

    const save = useCallback((updated: ScreenplayElement[]) => {
        setElements(updated);
        onContentChange(serializeScreenplay(updated));
    }, [onContentChange]);

    const updateElement = useCallback((id: string, text: string) => {
        save(elements.map(el => el.id === id ? { ...el, text } : el));
    }, [elements, save]);

    const addElementAfter = useCallback((afterId: string, type: ElementType = activeType) => {
        const idx = elements.findIndex(el => el.id === afterId);
        const newEl: ScreenplayElement = { id: genId(), type, text: '' };
        const updated = [...elements];
        updated.splice(idx + 1, 0, newEl);
        save(updated);
        setActiveElement(newEl.id);
        setTimeout(() => inputRefs.current[newEl.id]?.focus(), 50);
    }, [elements, activeType, save]);

    const deleteElement = useCallback((id: string) => {
        if (elements.length <= 1) return;
        const idx = elements.findIndex(el => el.id === id);
        const updated = elements.filter(el => el.id !== id);
        save(updated);
        const focusIdx = Math.max(0, idx - 1);
        setActiveElement(updated[focusIdx]?.id || null);
        setTimeout(() => inputRefs.current[updated[focusIdx]?.id]?.focus(), 50);
    }, [elements, save]);

    const changeElementType = useCallback((id: string, type: ElementType) => {
        save(elements.map(el => el.id === id ? { ...el, type } : el));
    }, [elements, save]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, el: ScreenplayElement) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Auto-advance type: scene->action, character->dialogue, dialogue->action
            let nextType: ElementType = activeType;
            if (el.type === 'scene') nextType = 'action';
            else if (el.type === 'character') nextType = 'dialogue';
            else if (el.type === 'parenthetical') nextType = 'dialogue';
            else if (el.type === 'dialogue') nextType = 'action';
            addElementAfter(el.id, nextType);
        } else if (e.key === 'Backspace' && el.text === '' && elements.length > 1) {
            e.preventDefault();
            deleteElement(el.id);
        }
    }, [activeType, addElementAfter, deleteElement, elements.length]);

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
            {/* Type selector toolbar */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10, padding: '0.5rem 0', background: 'inherit' }}>
                {ELEMENT_TYPES.map(et => (
                    <button
                        key={et.type}
                        onClick={() => {
                            setActiveType(et.type);
                            if (activeElement) changeElementType(activeElement, et.type);
                        }}
                        style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            background: activeType === et.type ? '#4f46e5' : '#374151',
                            color: activeType === et.type ? '#fff' : '#d1d5db',
                            fontFamily: 'Courier New, monospace',
                        }}
                    >
                        {et.label}
                    </button>
                ))}
            </div>

            {/* Screenplay elements */}
            <div style={{ fontFamily: "'Courier New', 'Courier', monospace", fontSize: '0.875rem', lineHeight: '1.5' }}>
                {elements.map(el => {
                    const typeInfo = ELEMENT_TYPES.find(t => t.type === el.type)!;
                    const style = ELEMENT_STYLES[el.type];
                    return (
                        <div
                            key={el.id}
                            onClick={() => { setActiveElement(el.id); setActiveType(el.type); }}
                            style={{
                                ...style,
                                position: 'relative',
                                borderLeft: activeElement === el.id ? '2px solid #6366f1' : '2px solid transparent',
                                paddingLeft: '0.75rem',
                                transition: 'border-color 0.15s',
                            }}
                        >
                            {activeElement === el.id && (
                                <span style={{ position: 'absolute', left: '-3rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#6b7280', width: '2.5rem', textAlign: 'right' }}>
                                    {typeInfo.label.slice(0, 5)}
                                </span>
                            )}
                            <textarea
                                ref={r => { inputRefs.current[el.id] = r; }}
                                value={el.text}
                                onChange={(e) => updateElement(el.id, e.target.value)}
                                onFocus={() => { setActiveElement(el.id); setActiveType(el.type); }}
                                onKeyDown={(e) => handleKeyDown(e, el)}
                                placeholder={typeInfo.placeholder}
                                rows={1}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit',
                                    color: 'inherit',
                                    overflow: 'hidden',
                                    ...style,
                                    marginTop: 0,
                                }}
                                onInput={(e) => {
                                    const ta = e.currentTarget;
                                    ta.style.height = 'auto';
                                    ta.style.height = ta.scrollHeight + 'px';
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#6b7280', display: 'flex', gap: '1rem' }}>
                <span>{elements.length} elements</span>
                <span>{elements.filter(e => e.type === 'scene').length} scenes</span>
                <span>Enter = new element, Backspace on empty = delete</span>
            </div>
        </div>
    );
};
