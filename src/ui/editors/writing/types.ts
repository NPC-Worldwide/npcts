// Shared writing editor types

export interface MangaPanel {
    id: string;
    position: number;
    imageUrl?: string;
    description: string;
    prompt?: string;
}

export interface MangaReference {
    id: string;
    name: string;
    imageUrl: string;
}

export interface MangaPage {
    id: string;
    number: number;
    layout: MangaLayoutType | null;
    panels: MangaPanel[];
}

export type MangaLayoutType = 'full' | 'split-horizontal' | 'split-vertical' | 'quad' | 'three-top' | 'three-bottom';

export const MANGA_LAYOUTS: Record<MangaLayoutType, { name: string; panelCount: number }> = {
    full: { name: 'Full Page', panelCount: 1 },
    'split-horizontal': { name: 'Horizontal Split', panelCount: 2 },
    'split-vertical': { name: 'Vertical Split', panelCount: 2 },
    quad: { name: 'Quad', panelCount: 4 },
    'three-top': { name: 'Three Top', panelCount: 3 },
    'three-bottom': { name: 'Three Bottom', panelCount: 3 },
};

export interface WritingChapter {
    id: string;
    title: string;
    content: string;
    number: number;
    wordCount: number;
    status: 'draft' | 'revision' | 'final';
    notes: string;
    createdAt: string;
    updatedAt: string;
    pages?: MangaPage[];
}

export interface WritingCharacter {
    id: string;
    name: string;
    description: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    notes: string;
}

export type WritingProjectType = 'novel' | 'story' | 'manga' | 'screenplay' | 'poetry' | 'journal';

export interface WritingProject {
    id: string;
    title: string;
    author: string;
    synopsis: string;
    genre: string;
    type: WritingProjectType;
    chapters: WritingChapter[];
    characters: WritingCharacter[];
    notes: string;
    wordGoal: number;
    createdAt: string;
    updatedAt: string;
    coverColor: string;
}

export interface ScreenplayElement {
    id: string;
    type: 'scene' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';
    text: string;
}

export interface JournalEntry {
    id: string;
    date: string;
    mood?: string;
    content: string;
    tags: string[];
}

export interface ChapterEditorProps {
    chapter: WritingChapter;
    projectType: WritingProjectType;
    onContentChange: (content: string) => void;
    onUpdateChapter: (id: string, updates: Partial<WritingChapter>) => void;
    onAddPage?: (chapterId: string) => void;
    onUpdatePage?: (chapterId: string, pageId: string, updates: Partial<MangaPage>) => void;
    onDeletePage?: (chapterId: string, pageId: string) => void;
    onGeneratePanel?: (panel: MangaPanel) => void;
}
