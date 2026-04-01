import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { WritingChapter } from './types';

export interface PoetryEditorProps {
    chapter: WritingChapter;
    onContentChange: (content: string) => void;
}

interface Stanza {
    id: string;
    lines: string[];
}

let _idCounter = Date.now();
const genId = () => `st_${++_idCounter}`;

function parsePoetry(content: string): Stanza[] {
    if (!content) return [{ id: genId(), lines: [''] }];
    // Split by double newlines into stanzas
    const stanzas = content.split(/\n\n+/).filter(s => s.trim());
    if (stanzas.length === 0) return [{ id: genId(), lines: [''] }];
    return stanzas.map(s => ({ id: genId(), lines: s.split('\n') }));
}

function serializePoetry(stanzas: Stanza[]): string {
    return stanzas.map(s => s.lines.join('\n')).join('\n\n');
}

export const PoetryEditor: React.FC<PoetryEditorProps> = ({ chapter, onContentChange }) => {
    const [stanzas, setStanzas] = useState<Stanza[]>(() => parsePoetry(chapter.content));
    const [activeStanza, setActiveStanza] = useState<string | null>(null);
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    useEffect(() => {
        setStanzas(parsePoetry(chapter.content));
    }, [chapter.id]);

    const save = useCallback((updated: Stanza[]) => {
        setStanzas(updated);
        onContentChange(serializePoetry(updated));
    }, [onContentChange]);

    const updateStanza = useCallback((id: string, text: string) => {
        save(stanzas.map(s => s.id === id ? { ...s, lines: text.split('\n') } : s));
    }, [stanzas, save]);

    const addStanzaAfter = useCallback((afterId: string) => {
        const idx = stanzas.findIndex(s => s.id === afterId);
        const newStanza: Stanza = { id: genId(), lines: [''] };
        const updated = [...stanzas];
        updated.splice(idx + 1, 0, newStanza);
        save(updated);
        setActiveStanza(newStanza.id);
        setTimeout(() => textareaRefs.current[newStanza.id]?.focus(), 50);
    }, [stanzas, save]);

    const deleteStanza = useCallback((id: string) => {
        if (stanzas.length <= 1) return;
        const idx = stanzas.findIndex(s => s.id === id);
        const updated = stanzas.filter(s => s.id !== id);
        save(updated);
        const focusIdx = Math.max(0, idx - 1);
        setActiveStanza(updated[focusIdx]?.id || null);
    }, [stanzas, save]);

    const totalLines = stanzas.reduce((sum, s) => sum + s.lines.length, 0);
    const totalWords = stanzas.reduce((sum, s) => sum + s.lines.join(' ').split(/\s+/).filter(Boolean).length, 0);

    return (
        <div style={{ maxWidth: '36rem', margin: '0 auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                <span>{stanzas.length} stanza{stanzas.length !== 1 ? 's' : ''}</span>
                <span>{totalLines} line{totalLines !== 1 ? 's' : ''}</span>
                <span>{totalWords} word{totalWords !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {stanzas.map((stanza, sIdx) => (
                    <div
                        key={stanza.id}
                        style={{
                            position: 'relative',
                            borderLeft: activeStanza === stanza.id ? '2px solid #a78bfa' : '2px solid transparent',
                            paddingLeft: '1rem',
                            transition: 'border-color 0.15s',
                        }}
                    >
                        <span style={{
                            position: 'absolute', left: '-2rem', top: '0.25rem',
                            fontSize: '0.6rem', color: '#6b7280', fontStyle: 'italic',
                        }}>
                            {sIdx + 1}
                        </span>
                        <textarea
                            ref={r => { textareaRefs.current[stanza.id] = r; }}
                            value={stanza.lines.join('\n')}
                            onChange={(e) => updateStanza(stanza.id, e.target.value)}
                            onFocus={() => setActiveStanza(stanza.id)}
                            placeholder="Write your verse..."
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                fontSize: '1rem',
                                lineHeight: '1.8',
                                fontStyle: 'italic',
                                color: 'inherit',
                                overflow: 'hidden',
                                minHeight: '2rem',
                            }}
                            onInput={(e) => {
                                const ta = e.currentTarget;
                                ta.style.height = 'auto';
                                ta.style.height = ta.scrollHeight + 'px';
                            }}
                        />
                        {activeStanza === stanza.id && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button
                                    onClick={() => addStanzaAfter(stanza.id)}
                                    style={{ fontSize: '0.65rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    + stanza below
                                </button>
                                {stanzas.length > 1 && (
                                    <button
                                        onClick={() => deleteStanza(stanza.id)}
                                        style={{ fontSize: '0.65rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        delete
                                    </button>
                                )}
                                <span style={{ fontSize: '0.6rem', color: '#6b7280', marginLeft: 'auto' }}>
                                    {stanza.lines.length} line{stanza.lines.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={() => addStanzaAfter(stanzas[stanzas.length - 1]?.id)}
                style={{
                    display: 'block', margin: '1.5rem auto 0', padding: '0.5rem 1rem',
                    fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)',
                    border: '1px dashed rgba(167,139,250,0.3)', borderRadius: '6px', cursor: 'pointer',
                }}
            >
                + Add Stanza
            </button>
        </div>
    );
};
