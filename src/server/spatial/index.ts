/**
 * Spatial Server Module
 *
 * TypeScript backend for spatial world applications.
 * Replaces Python Flask backend with Node.js/Express.
 *
 * @example
 * ```typescript
 * import {
 *   createSpatialServer,
 *   createFileConfigStore,
 * } from 'npcts/server/spatial';
 *
 * // Quick start - creates and starts server automatically
 * createSpatialServer({ port: 3001 });
 *
 * // Or manual setup with Express
 * import express from 'express';
 * import { createSpatialRouter, createFileConfigStore } from 'npcts/server/spatial';
 *
 * const app = express();
 * const configStore = createFileConfigStore();
 *
 * app.use(express.json());
 * app.use(createSpatialRouter({
 *   configStore,
 *   imagesDir: configStore.getImagesPath(),
 * }, () => express.Router()));
 *
 * app.listen(3001);
 * ```
 */

// Config store
export {
  createFileConfigStore,
  createDefaultConfig,
  type ConfigStore,
  type FileConfigStoreOptions,
} from './configStore';

// Command executor
export {
  executeCommand,
  getRunningApps,
  killProcess,
  launchApplication,
  type ExecuteCommandOptions,
} from './commandExecutor';

// Image handler
export {
  createImageHandler,
  parseMultipartFormData,
  type ImageUploadResult,
  type ImageHandlerOptions,
} from './imageHandler';

// Express routes
export {
  createSpatialRouter,
  createSpatialServer,
  type SpatialRoutesOptions,
  type CreateSpatialServerOptions,
} from './routes';
