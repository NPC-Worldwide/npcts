import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback,
  useEffect,
} from "react";
import type { FileSystemClient, FileNode } from "../../../core/files";

interface FileSystemState {
  currentPath: string;
  setCurrentPath: (path: string) => void;
  directoryStructure: FileNode | null;
  loadDirectory: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  loading: boolean;
  error?: string;
}

const FileSystemContext = createContext<FileSystemState | undefined>(
  undefined
);

interface FileSystemProviderProps {
  client: FileSystemClient;
  initialPath?: string;
  children: React.ReactNode;
}

export const FileSystemProvider: React.FC<FileSystemProviderProps> = ({
  client,
  initialPath = "/",
  children,
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [directoryStructure, setDirectoryStructure] = 
    useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const structure = await client.readDirectoryStructure(path);
      setDirectoryStructure(structure);
      setCurrentPath(path);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load directory"
      );
    } finally {
      setLoading(false);
    }
  }, [client]);

  const readFile = useCallback(async (path: string) => {
    return await client.readFileContent(path);
  }, [client]);

  const writeFile = useCallback(async (path: string, content: string) => {
    await client.writeFileContent(path, content);
  }, [client]);

  const createDirectory = useCallback(async (path: string) => {
    await client.createDirectory(path);
    await loadDirectory(currentPath);
  }, [client, currentPath, loadDirectory]);

  const deleteFile = useCallback(async (path: string) => {
    await client.deleteFile(path);
    await loadDirectory(currentPath);
  }, [client, currentPath, loadDirectory]);

  const renameFile = useCallback(async (
    oldPath: string, 
    newPath: string
  ) => {
    await client.rename(oldPath, newPath);
    await loadDirectory(currentPath);
  }, [client, currentPath, loadDirectory]);

  useEffect(() => {
    loadDirectory(initialPath);
  }, [initialPath, loadDirectory]);

  const value: FileSystemState = {
    currentPath,
    setCurrentPath,
    directoryStructure,
    loadDirectory,
    readFile,
    writeFile,
    createDirectory,
    deleteFile,
    renameFile,
    loading,
    error,
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const ctx = useContext(FileSystemContext);
  if (!ctx) {
    throw new Error("useFileSystem must be used within FileSystemProvider");
  }
  return ctx;
};
