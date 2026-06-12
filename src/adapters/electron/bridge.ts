import type { AdapterFactory, AppServices } from "../base";
import type { BrowserClient } from "../../core/browser";
import type { ChatClient } from "../../core/chat";
import type { FileSystemClient } from "../../core/files";
import type { JobClient } from "../../core/jobs";
import { resolveModelProvider, type NPC, type Team } from "../../core/npc";

type ElectronApi = Record<string, any> | undefined;

const ensureApi = (api: ElectronApi): Record<string, any> => {
  if (!api) throw new Error("Electron preload api is not available on window.api");
  return api;
};

const createChatClient = (rawApi: ElectronApi): ChatClient => {
  const api = ensureApi(rawApi);
  return {
    listConversations: (workspacePath?: string) => {
      if (api.getConversationsInDirectory && workspacePath) {
        return api.getConversationsInDirectory(workspacePath);
      }
      return api.getConversations?.(workspacePath ?? "") ?? Promise.resolve([]);
    },
    createConversation: (workspacePath?: string) =>
      api.createConversation?.({ directory_path: workspacePath }) ??
      Promise.reject(new Error("createConversation not implemented")),
    deleteConversation: (conversationId: string) =>
      api.deleteConversation?.(conversationId) ?? Promise.resolve(),
    listMessages: (conversationId: string) =>
      api.getConversationMessages?.(conversationId) ?? Promise.resolve([]),
    sendMessage: async (request) => {
      // Resolve model/provider from NPC/team if present
      const resolved = resolveModelProvider(
        (request.context?.npc as NPC) || undefined,
        (request.context?.team as Team) || undefined,
        typeof request.model === "string" ? request.model : request.model.id,
        (request.context?.provider as string) || undefined
      );
      const modelId = resolved.model || "";
      const provider = resolved.provider || "";

      if (request.stream && api.onStreamData) {
        const generator = api.executeCommandStream?.({
          commandstr: request.prompt,
          conversationId: request.conversationId,
          model: modelId,
          provider,
          npc: (request.context?.npc as NPC)?.name,
        });
        if (generator) return generator;
      }
      const msg = await api.sendMessage?.({
        conversationId: request.conversationId,
        message: request.prompt,
        model: modelId,
        provider,
        attachments: request.attachments,
      });
      return msg;
    },
    deleteMessage: (conversationId: string, messageId: string) =>
      api.deleteMessage?.({ conversationId, messageId }) ?? Promise.resolve(),
  };
};

const createFileSystemClient = (rawApi: ElectronApi): FileSystemClient => {
  const api = ensureApi(rawApi);
  return {
    readDirectoryStructure: (dirPath) => api.readDirectoryStructure(dirPath),
    readFileContent: (path) => api.readFileContent(path),
    writeFileContent: (path, content) => api.writeFileContent(path, content),
    createDirectory: (path) => api.createDirectory(path),
    deleteFile: (path) => api.deleteFile(path),
    deleteDirectory: (path) => api.deleteDirectory(path),
    rename: (oldPath, newPath) => api.renameFile(oldPath, newPath),
  };
};

const createJobClient = (rawApi: ElectronApi): JobClient => {
  const api = ensureApi(rawApi);
  return {
    listCronJobs: () => api.getCronDaemons(),
    addCronJob: (job) => api.addCronJob(job),
    removeCronJob: (id) => api.removeCronJob(id),
    listDaemons: () => api.getCronDaemons(),
    addDaemon: (daemon) => api.addDaemon(daemon),
    removeDaemon: (id) => api.removeDaemon(id),
  };
};

const createBrowserClient = (rawApi: ElectronApi): BrowserClient => {
  const api = ensureApi(rawApi);
  return {
    navigate: (url) => api.browserNavigate({ url }),
    back: () => api.browserBack({}),
    forward: () => api.browserForward({}),
    refresh: () => api.browserRefresh({}),
    getSelectedText: () => api.browserGetSelectedText({}),
    listHistory: () => api.browserGetHistory({}),
    addHistory: (entry) => api.browserAddToHistory(entry),
    clearHistory: () => api.browserClearHistory({}),
    listBookmarks: () => api.browserGetBookmarks({}),
    addBookmark: (bookmark) => api.browserAddBookmark(bookmark),
    deleteBookmark: (id) => api.browserDeleteBookmark({ id }),
  };
};

export const createElectronAdapter: AdapterFactory<ElectronApi> = (bridge: ElectronApi): AppServices => {
  return {
    chat: createChatClient(bridge),
    files: createFileSystemClient(bridge),
    jobs: createJobClient(bridge),
    browser: createBrowserClient(bridge),
  };
};
