import type { AdapterFactory, AppServices } from "../base";
import type { BrowserClient } from "../../core/browser";
import type { ChatClient } from "../../core/chat";
import type { FileSystemClient } from "../../core/files";
import type { JobClient } from "../../core/jobs";

type ElectronApi = typeof window extends { api?: unknown }
  ? (typeof window)["api"]
  : unknown;

const assertApi = (api: ElectronApi): asserts api is Record<string, any> => {
  if (!api) throw new Error("Electron preload api is not available on window.api");
};

const createChatClient = (api: ElectronApi): ChatClient => {
  assertApi(api);
  return {
    listConversations: (workspacePath?: string) =>
      api.getConversations?.(workspacePath ?? "") ?? Promise.resolve([]),
    createConversation: (workspacePath?: string) =>
      api.createConversation?.({ directory_path: workspacePath }) ??
      Promise.reject(new Error("createConversation not implemented")),
    deleteConversation: (conversationId: string) =>
      api.deleteConversation?.(conversationId) ?? Promise.resolve(),
    listMessages: (conversationId: string) =>
      api.getConversationMessages?.(conversationId) ?? Promise.resolve([]),
    sendMessage: async (request) => {
      if (request.stream) {
        const result = await api.executeCommandStream?.({
          commandstr: request.prompt,
          conversationId: request.conversationId,
          model: typeof request.model === "string" ? request.model : request.model.id,
        });
        return result;
      }
      const msg = await api.sendMessage?.({
        conversationId: request.conversationId,
        message: request.prompt,
        model: request.model,
        attachments: request.attachments,
      });
      return msg;
    },
    deleteMessage: (conversationId: string, messageId: string) =>
      api.deleteMessage?.({ conversationId, messageId }) ?? Promise.resolve(),
  };
};

const createFileSystemClient = (api: ElectronApi): FileSystemClient => {
  assertApi(api);
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

const createJobClient = (api: ElectronApi): JobClient => {
  assertApi(api);
  return {
    listCronJobs: () => api.getCronDaemons(),
    addCronJob: (job) => api.addCronJob(job),
    removeCronJob: (id) => api.removeCronJob(id),
    listDaemons: () => api.getCronDaemons(),
    addDaemon: (daemon) => api.addDaemon(daemon),
    removeDaemon: (id) => api.removeDaemon(id),
  };
};

const createBrowserClient = (api: ElectronApi): BrowserClient => {
  assertApi(api);
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
