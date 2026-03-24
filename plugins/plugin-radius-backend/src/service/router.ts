import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import * as express from 'express';
import * as fs from 'fs/promises';

const PREVIEW_DATA_PATH = '/app/preview';

async function readPreviewFile(filename: string): Promise<unknown | null> {
  try {
    const content = await fs.readFile(
      `${PREVIEW_DATA_PATH}/${filename}`,
      'utf-8',
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function createRouter(): Promise<express.Router> {
  const router = express.Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/preview/status', async (_, response) => {
    const data = await readPreviewFile('status.json');
    if (data) {
      response.json(data);
    } else {
      response.json({ previewMode: false });
    }
  });

  router.get('/preview/applications', async (_, response) => {
    const data = await readPreviewFile('applications.json');
    if (data) {
      response.json(data);
    } else {
      response.status(404).json({ error: 'Preview data not available' });
    }
  });

  router.post('/preview/graph/:applicationId', async (_, response) => {
    const data = await readPreviewFile('graph.json');
    if (data) {
      response.json(data);
    } else {
      response.status(404).json({ error: 'Preview data not available' });
    }
  });

  return router;
}

export const radiusPlugin = createBackendPlugin({
  pluginId: 'radius',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ httpRouter, logger }) {
        logger.info('Initializing Radius backend plugin');
        const router = await createRouter();
        // @ts-expect-error - Express 5 Router types are not fully compatible with Backstage's Handler type. See: https://github.com/express-promise-router/express-promise-router/issues/119
        httpRouter.use(router);
      },
    });
  },
});

export default radiusPlugin;
