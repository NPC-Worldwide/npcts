/**
 * Spatial API Routes
 *
 * Express router for spatial world backend API.
 */

import type { Router, Request, Response, NextFunction } from 'express';
import type { ConfigStore } from './configStore';
import { executeCommand, getRunningApps, killProcess } from './commandExecutor';
import { createImageHandler } from './imageHandler';

// =============================================================================
// Types
// =============================================================================

export interface SpatialRoutesOptions {
  configStore: ConfigStore;
  imagesDir: string;
}

// =============================================================================
// Route Factory
// =============================================================================

/**
 * Creates Express router with spatial API endpoints
 *
 * @example
 * ```typescript
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
 * }));
 *
 * app.listen(3001);
 * ```
 */
export function createSpatialRouter(
  options: SpatialRoutesOptions,
  routerFactory: () => Router
): Router {
  const { configStore, imagesDir } = options;
  const router = routerFactory();
  const imageHandler = createImageHandler({ imagesDir });

  // =============================================================================
  // Config Endpoints
  // =============================================================================

  /**
   * GET /api/spatial/config
   * Load the spatial world configuration
   */
  router.get('/api/spatial/config', async (req: Request, res: Response) => {
    try {
      const config = await configStore.load();

      if (!config) {
        res.json({ message: 'No configuration found' });
        return;
      }

      res.json(config);
    } catch (error) {
      console.error('Error loading config:', error);
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });

  /**
   * POST /api/spatial/config
   * Save the spatial world configuration
   */
  router.post('/api/spatial/config', async (req: Request, res: Response) => {
    try {
      const config = req.body;

      if (!config || !config.rooms || !config.userCharacter) {
        res.status(400).json({ error: 'Invalid configuration format' });
        return;
      }

      await configStore.save(config);
      res.json({ message: 'Configuration saved successfully' });
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  // Legacy endpoints (for backwards compatibility with Flask backend)
  router.get('/load-config', async (req: Request, res: Response) => {
    try {
      const config = await configStore.load();
      if (!config) {
        res.json({ message: 'No configuration found' });
        return;
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });

  router.post('/save-config', async (req: Request, res: Response) => {
    try {
      await configStore.save(req.body);
      res.json({ message: 'Configuration saved' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  // =============================================================================
  // Command Execution Endpoints
  // =============================================================================

  /**
   * POST /api/execute
   * Execute a shell command
   */
  router.post('/api/execute', async (req: Request, res: Response) => {
    try {
      const { command, cwd, background } = req.body;

      if (!command || typeof command !== 'string') {
        res.status(400).json({ error: 'Command is required' });
        return;
      }

      const result = await executeCommand(command, { cwd, background });
      res.json(result);
    } catch (error) {
      console.error('Error executing command:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Command execution failed',
      });
    }
  });

  // Legacy endpoint
  router.post('/execute-command', async (req: Request, res: Response) => {
    try {
      const { command } = req.body;
      if (!command) {
        res.status(400).json({ error: 'Command is required' });
        return;
      }
      const result = await executeCommand(command, { background: true });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Command execution failed' });
    }
  });

  /**
   * GET /api/running-apps
   * Get list of running applications
   */
  router.get('/api/running-apps', async (req: Request, res: Response) => {
    try {
      const apps = await getRunningApps();
      res.json(apps);
    } catch (error) {
      console.error('Error getting running apps:', error);
      res.status(500).json({ error: 'Failed to get running apps' });
    }
  });

  /**
   * POST /api/kill
   * Kill a process by PID
   */
  router.post('/api/kill', async (req: Request, res: Response) => {
    try {
      const { pid } = req.body;

      if (typeof pid !== 'number') {
        res.status(400).json({ error: 'PID is required' });
        return;
      }

      await killProcess(pid);
      res.json({ message: `Process ${pid} killed` });
    } catch (error) {
      console.error('Error killing process:', error);
      res.status(500).json({ error: 'Failed to kill process' });
    }
  });

  // =============================================================================
  // Image Upload Endpoints
  // =============================================================================

  /**
   * POST /api/upload-image
   * Upload an image file
   */
  router.post('/api/upload-image', async (req: Request, res: Response) => {
    try {
      // Handle different content types
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        // File upload via form data
        // Note: This requires multer or similar middleware in real usage
        // For now, we'll handle base64 encoded uploads

        // Check if there's a file in the request (if using express-fileupload or multer)
        const reqWithFile = req as Request & {
          files?: { image?: { data: Buffer; name: string } };
          file?: { buffer: Buffer; originalname: string };
        };

        if (reqWithFile.files?.image) {
          const file = reqWithFile.files.image;
          const result = await imageHandler.saveBuffer(file.data, file.name);
          res.json(result);
          return;
        }

        if (reqWithFile.file) {
          const result = await imageHandler.saveBuffer(
            reqWithFile.file.buffer,
            reqWithFile.file.originalname
          );
          res.json(result);
          return;
        }

        res.status(400).json({ error: 'No image file found in request' });
        return;
      }

      if (contentType.includes('application/json')) {
        // Base64 encoded image
        const { image, filename } = req.body;

        if (!image) {
          res.status(400).json({ error: 'Image data is required' });
          return;
        }

        const result = await imageHandler.saveBase64(image, filename);
        res.json(result);
        return;
      }

      res.status(400).json({ error: 'Unsupported content type' });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  });

  // Legacy endpoint
  router.post('/upload-image', async (req: Request, res: Response) => {
    try {
      const reqWithFile = req as Request & {
        files?: { image?: { data: Buffer; name: string } };
        file?: { buffer: Buffer; originalname: string };
      };

      if (reqWithFile.files?.image) {
        const file = reqWithFile.files.image;
        const result = await imageHandler.saveBuffer(file.data, file.name);
        res.json(result);
        return;
      }

      if (reqWithFile.file) {
        const result = await imageHandler.saveBuffer(
          reqWithFile.file.buffer,
          reqWithFile.file.originalname
        );
        res.json(result);
        return;
      }

      res.status(400).json({ error: 'No image file found' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  /**
   * GET /api/images
   * List all uploaded images
   */
  router.get('/api/images', async (req: Request, res: Response) => {
    try {
      const images = await imageHandler.listImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list images' });
    }
  });

  /**
   * DELETE /api/images/:filename
   * Delete an image
   */
  router.delete('/api/images/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      await imageHandler.deleteImage(filename);
      res.json({ message: 'Image deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  return router;
}

// =============================================================================
// Standalone Server Factory
// =============================================================================

export interface CreateSpatialServerOptions {
  port?: number;
  configStore?: ConfigStore;
  imagesDir?: string;
  cors?: boolean;
}

/**
 * Creates a standalone Express server with spatial API
 * Note: This function requires Express to be installed
 */
export async function createSpatialServer(options: CreateSpatialServerOptions = {}) {
  // Dynamic import to avoid requiring express as a dependency
  const express = await import('express');
  const cors = options.cors ? await import('cors') : null;

  const app = express.default();
  const { createFileConfigStore } = await import('./configStore');

  const configStore = options.configStore || createFileConfigStore();
  const imagesDir = options.imagesDir || configStore.getImagesPath();
  const port = options.port || 3001;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  if (cors) {
    app.use(cors.default());
  }

  // Static files for images
  app.use('/images', express.static(imagesDir));

  // API routes
  app.use(
    createSpatialRouter(
      { configStore, imagesDir },
      () => express.Router()
    )
  );

  // Start server
  const server = app.listen(port, () => {
    console.log(`Spatial API server running on http://localhost:${port}`);
  });

  return { app, server, configStore, imagesDir };
}
