import React, { useState, useCallback, useEffect } from 'react';
import type { WritingChapter } from './types';

export interface JournalEditorProps {
    chapter: WritingChapter;
    onContentChange: (content: string) => void;
    onUpdateChapter: (id: string, updates: Partial<WritingChapter>) => void;
}

interface JournalEntry {
    id: string;
    date: string;
    mood: string;
    content: string;
    tags: string[];
}

const MOODS = [
    { emoji: '\u{1F60A}', label: 'Happy' },
    { emoji: '\u{1F614}', label: 'Pensive' },
    { emoji: '\u{1F4AA}', label: 'Motivated' },
    { emoji: '\u{1F62A}', label: 'Tired' },
    { emoji: '\u{1F60C}', label: 'Calm' },
    { emoji: '\u{1F914}', label: 'Thoughtful' },
    { emoji: '\u{1F622}', label: 'Sad' },
    { emoji: '\u{1F621}', label: 'Frustrated' },
    { emoji: '\u{2728}', label: 'Inspired' },
    { emoji: '\u{1F970}', label: 'Grateful' },
];

let _idCounter = Date.now();
const genId = () => `je_${++_idCounter}`;

function parseJournal(content: string): JournalEntry[] {
    if (!content) return [];
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Treat as single entry
    return [{ id: genId(), date: new Date().toISOString().split('T')[0], mood: '', content, tags: [] }];
}

function serializeJournal(entries: JournalEntry[]): string {
    return JSON.stringify(entries);
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ chapter, onContentChange, onUpdateChapter }) => {
    const [entries, setEntries] = useState<JournalEntry[]>(() => parseJournal(chapter.content));
    const [activeEntryId, setActiveEntryId] = useState<string | null>(entries[0]?.id || null);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        const parsed = parseJournal(chapter.content);
        setEntries(parsed);
        setActiveEntryId(parsed[0]?.id || null);
    }, [chapter.id]);

    const activeEntry = entries.find(e => e.id === activeEntryId) || null;

    const save = useCallback((updated: JournalEntry[]) => {
        setEntries(updated);
        onContentChange(serializeJournal(updated));
    }, [onContentChange]);

    const addEntry = useCallback(() => {
        const entry: JournalEntry = {
            id: genId(),
            date: new Date().toISOString().split('T')[0],
            mood: '',
            content: '',
            tags: [],
        };
        const updated = [entry, ...entries];
        save(updated);
        setActiveEntryId(entry.id);
    }, [entries, save]);

    const updateEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
        save(entries.map(e => e.id === id ? { ...e, ...updates } : e));
    }, [entries, save]);

    const deleteEntry = useCallback((id: string) => {
        const updated = entries.filter(e => e.id !== id);
        save(updated);
        if (activeEntryId === id) setActiveEntryId(updated[0]?.id || null);
    }, [entries, activeEntryId, save]);

    const addTag = useCallback(() => {
        if (!newTag.trim() || !activeEntry) return;
        const tag = newTag.trim();
        if (!activeEntry.tags.includes(tag)) {
            updateEntry(activeEntry.id, { tags: [...activeEntry.tags, tag] });
        }
        setNewTag('');
    }, [newTag, activeEntry, updateEntry]);

    // Group entries by month
    const grouped = entries.reduce((acc, entry) => {
        const month = entry.date.slice(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = [];
        acc[month].push(entry);
        return acc;
    }, {} as Record<string, JournalEntry[]>);

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
            {/* Entry list */}
            <div style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)', overflow: 'auto', flexShrink: 0 }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={addEntry}
                        style={{
                            width: '100%', padding: '0.5rem', fontSize: '0.75rem',
                            background: '#4f46e5', color: '#fff', border: 'none',
                            borderRadius: '6px', cursor: 'pointer',
                        }}
                    >
                        + New Entry
                    </button>
                </div>
                <div style={{ padding: '0.25rem' }}>
                    {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthEntries]) => (
                        <div key={month}>
                            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {new Date(month + '-01').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                            </div>
                            {monthEntries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                                <div
                                    key={entry.id}
                                    onClick={() => setActiveEntryId(entry.id)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        background: activeEntryId === entry.id ? 'rgba(79,70,229,0.15)' : 'transparent',
                                        color: activeEntryId === entry.id ? '#a5b4fc' : '#d1d5db',
                                        marginBottom: '0.125rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {entry.mood && <span>{entry.mood}</span>}
                                        <span>{new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    {entry.content && (
                                        <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.content.slice(0, 50)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.75rem' }}>
                            No entries yet
                        </div>
                    )}
                </div>
            </div>

            {/* Active entry editor */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                {activeEntry ? (
                    <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="date"
                                value={activeEntry.date}
                                onChange={(e) => updateEntry(activeEntry.id, { date: e.target.value })}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px', padding: '0.375rem 0.75rem', fontSize: '0.875rem',
                                    color: 'inherit',
                                }}
                            />
                            <button
                                onClick={() => deleteEntry(activeEntry.id)}
                                style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Delete
                            </button>
                        </div>

                        {/* Mood selector */}
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {MOODS.map(m => (
                                <button
                                    key={m.emoji}
                                    onClick={() => updateEntry(activeEntry.id, { mood: activeEntry.mood === m.emoji ? '' : m.emoji })}
                                    title={m.label}
                                    style={{
                                        padding: '0.25rem 0.5rem', fontSize: '1.1rem',
                                        borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: activeEntry.mood === m.emoji ? 'rgba(79,70,229,0.2)' : 'transparent',
                                        filter: activeEntry.mood === m.emoji ? 'none' : 'grayscale(0.5)',
                                        opacity: activeEntry.mood === m.emoji ? 1 : 0.6,
                                    }}
                                >
                                    {m.emoji}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={activeEntry.content}
                            onChange={(e) => updateEntry(activeEntry.id, { content: e.target.value })}
                            placeholder="What's on your mind today..."
                            spellCheck
                            style={{
                                width: '100%',
                                minHeight: '50vh',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontSize: '0.95rem',
                                lineHeight: '1.75',
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                color: 'inherit',
                            }}
                        />

                        {/* Tags */}
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {activeEntry.tags.map(tag => (
                                    <span key={tag} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.125rem 0.5rem', fontSize: '0.7rem', borderRadius: '99px',
                                        background: 'rgba(79,70,229,0.15)', color: '#a5b4fc',
                                    }}>
                                        #{tag}
                                        <button
                                            onClick={() => updateEntry(activeEntry.id, { tags: activeEntry.tags.filter(t => t !== tag) })}
                                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                        >x</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    placeholder="+ tag"
                                    style={{
                                        background: 'transparent', border: 'none', outline: 'none',
                                        fontSize: '0.7rem', color: '#9ca3af', width: '60px',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}>&#x1F4D3;</div>
                        <p>Create a new journal entry to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};
