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
