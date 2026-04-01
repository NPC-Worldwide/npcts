import React, { useRef, useEffect, useCallback } from 'react';
import type { WritingChapter } from './types';

export interface NovelEditorProps {
    chapter: WritingChapter;
    onContentChange: (content: string) => void;
    wordGoal?: number;
}

export const NovelEditor: React.FC<NovelEditorProps> = ({ chapter, onContentChange, wordGoal = 0 }) => {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const wordCount = chapter.wordCount || 0;
    const progress = wordGoal > 0 ? Math.min(100, Math.round((wordCount / wordGoal) * 100)) : 0;

    return (
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                <span>{wordCount} words</span>
                <span>{chapter.content?.length || 0} chars</span>
                <span>~{Math.ceil(wordCount / 250)} min read</span>
                {wordGoal > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                        <div style={{ width: '100px', height: '4px', background: '#374151', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#22c55e' : '#6366f1', borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                        <span>{progress}% of {wordGoal.toLocaleString()}</span>
                    </div>
                )}
            </div>
            <textarea
                key={chapter.id}
                ref={editorRef}
                defaultValue={chapter.content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Begin writing..."
                spellCheck
                style={{
                    width: '100%',
                    minHeight: '70vh',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontSize: '1rem',
                    lineHeight: '1.75',
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    color: 'inherit',
                }}
            />
        </div>
    );
};
