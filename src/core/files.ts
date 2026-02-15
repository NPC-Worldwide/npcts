export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

export interface FileSystemClient {
  readDirectoryStructure(path: string): Promise<FileNode>;
  readFileContent(path: string): Promise<string>;
  writeFileContent(path: string, content: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

/**
 * File I/O adapter for document viewers (CsvViewer, DocxViewer, PptxViewer).
 * Abstracts over Electron IPC (window.api) and HTTP fetch so the same
 * viewer components work in both incognide and web apps.
 */
export interface DocumentFileApi {
  /** Read a file as binary (XLSX, DOCX, PPTX are all ZIP-based) */
  readFileBuffer(path: string): Promise<ArrayBuffer>;
  /** Read a file as text (CSV, HTML, plain text) */
  readFileContent(path: string): Promise<string>;
  /** Write text content to a file */
  writeFileContent(path: string, content: string): Promise<void>;
  /** Write binary content to a file */
  writeFileBuffer(path: string, buffer: ArrayBuffer | Uint8Array): Promise<void>;
  /** Convert a DOCX file to HTML via mammoth (optional, DocxViewer only) */
  convertDocxToHtml?(path: string): Promise<{ html: string; fonts?: string[]; error?: string }>;
  /** Read CSV content as text with error handling (optional, CsvViewer only) */
  readCsvContent?(path: string): Promise<{ content: string; error?: string }>;
}

/** Extract filename from a file path */
export const getFileName = (filePath: string | null | undefined): string => {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/').split('/').pop() || '';
};

/**
 * Normalize a file path by converting backslashes to forward slashes
 * and removing trailing slashes
 * @param path - The path to normalize (can be null/undefined)
 * @returns Normalized path string, or empty string if input is null/undefined
 */
export const normalizePath = (path: string | null | undefined): string => {
    if (!path) return '';
    let normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
};
