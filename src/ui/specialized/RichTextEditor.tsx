import React, { useRef, useState, useEffect } from 'react';
import { 
    Bold, Italic, AlignLeft, AlignCenter, 
    AlignRight, List, ListOrdered, Undo, Redo 
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    onSave?: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
    value, 
    onChange,
    onSave 
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [history, setHistory] = useState<string[]>([value]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        
        setTimeout(() => {
            if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
            }
        }, 0);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                onChange(history[newIndex]);
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
                onChange(history[newIndex]);
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-2 border-b theme-border flex 
                items-center gap-1 flex-wrap">
                <button 
                    onClick={undo} 
                    disabled={historyIndex <= 0}
                    className="p-2 theme-hover rounded 
                        disabled:opacity-50"
                >
                    <Undo size={16} />
                </button>
                <button 
                    onClick={redo} 
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 theme-hover rounded 
                        disabled:opacity-50"
                >
                    <Redo size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1" />
                
                <button 
                    onClick={() => execCommand('bold')} 
                    className="p-2 theme-hover rounded font-bold"
                >
                    <Bold size={16} />
                </button>
                <button 
                    onClick={() => execCommand('italic')} 
                    className="p-2 theme-hover rounded italic"
                >
                    <Italic size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1" />
                
                <button 
                    onClick={() => execCommand('justifyLeft')} 
                    className="p-2 theme-hover rounded"
                >
                    <AlignLeft size={16} />
                </button>
                <button 
                    onClick={() => execCommand('justifyCenter')} 
                    className="p-2 theme-hover rounded"
                >
                    <AlignCenter size={16} />
                </button>
                <button 
                    onClick={() => execCommand('justifyRight')} 
                    className="p-2 theme-hover rounded"
                >
                    <AlignRight size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1" />
                
                <button 
                    onClick={() => execCommand('insertUnorderedList')} 
                    className="p-2 theme-hover rounded"
                >
                    <List size={16} />
                </button>
                <button 
                    onClick={() => execCommand('insertOrderedList')} 
                    className="p-2 theme-hover rounded"
                >
                    <ListOrdered size={16} />
                </button>
            </div>

            {/* Editor */}
            <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: value }}
                className="flex-1 p-8 outline-none overflow-auto"
                style={{
                    lineHeight: '1.6',
                    fontSize: '14px',
                    minHeight: '400px'
                }}
            />
        </div>
    );
};
