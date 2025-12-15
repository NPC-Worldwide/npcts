import type { BrowserClient } from "../core/browser";
import type { ChatClient } from "../core/chat";
import type { FileSystemClient } from "../core/files";
import type { JobClient } from "../core/jobs";
import type { DatabaseClient } from "../core/database";
import type {
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
} from "../core/spatial";

export interface AppServices {
  chat: ChatClient;
  files: FileSystemClient;
  jobs?: JobClient;
  browser?: BrowserClient;
  database?: DatabaseClient;
  // Spatial UI services
  spatialConfig?: SpatialConfigClient;
  commandExecution?: CommandExecutionClient;
  imageUpload?: ImageUploadClient;
}

export type AdapterFactory<T = unknown> = (bridge: T) => AppServices;
