import type { BrowserClient } from "../core/browser";
import type { ChatClient } from "../core/chat";
import type { FileSystemClient } from "../core/files";
import type { JobClient } from "../core/jobs";

export interface AppServices {
  chat: ChatClient;
  files: FileSystemClient;
  jobs?: JobClient;
  browser?: BrowserClient;
}

export interface AdapterFactory<T = unknown> {
  create(bridge: T): AppServices;
}
