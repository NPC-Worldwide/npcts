export interface BrowserHistoryEntry {
  id: string;
  title?: string;
  url: string;
  visitedAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder?: string;
}

export interface BrowserClient {
  navigate(url: string): Promise<void>;
  back(): Promise<void>;
  forward(): Promise<void>;
  refresh(): Promise<void>;
  getSelectedText(): Promise<string | null>;
  listHistory(): Promise<BrowserHistoryEntry[]>;
  addHistory(entry: Omit<BrowserHistoryEntry, "id" | "visitedAt">): Promise<BrowserHistoryEntry>;
  clearHistory(): Promise<void>;
  listBookmarks(): Promise<Bookmark[]>;
  addBookmark(bookmark: Omit<Bookmark, "id">): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<void>;
}
