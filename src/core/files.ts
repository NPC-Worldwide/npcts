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
