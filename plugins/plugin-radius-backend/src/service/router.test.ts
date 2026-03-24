import express from 'express';
import request from 'supertest';
import * as fs from 'fs/promises';

import { createRouter } from './router';

jest.mock('fs/promises');

const mockFs = jest.mocked(fs);

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter();
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /preview/status', () => {
    it('returns previewMode true when status.json exists', async () => {
      const statusData = {
        previewMode: true,
        applicationName: 'myapp',
        namespace: 'default',
        resourceCount: 3,
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(statusData));

      const response = await request(app).get('/preview/status');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(statusData);
    });

    it('returns previewMode false when file is missing', async () => {
      mockFs.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const response = await request(app).get('/preview/status');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ previewMode: false });
    });

    it('returns previewMode false when file is malformed JSON', async () => {
      mockFs.readFile.mockResolvedValue('not valid json {{{');

      const response = await request(app).get('/preview/status');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ previewMode: false });
    });
  });

  describe('GET /preview/applications', () => {
    it('returns 200 with data when file exists', async () => {
      const appData = {
        value: [
          {
            id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/applications/myapp',
            name: 'myapp',
            type: 'Applications.Core/applications',
            properties: { provisioningState: 'Preview', status: {} },
          },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(appData));

      const response = await request(app).get('/preview/applications');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(appData);
    });

    it('returns 404 when file is missing', async () => {
      mockFs.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const response = await request(app).get('/preview/applications');

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ error: 'Preview data not available' });
    });
  });

  describe('POST /preview/graph/:applicationId', () => {
    it('returns 200 with graph data when file exists', async () => {
      const graphData = {
        resources: [
          {
            id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/containers/api',
            name: 'api',
            type: 'Applications.Core/containers',
            provider: 'radius',
            provisioningState: 'Preview',
            connections: [],
          },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(graphData));

      const response = await request(app).post('/preview/graph/myapp');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(graphData);
    });

    it('returns 404 when file is missing', async () => {
      mockFs.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const response = await request(app).post('/preview/graph/myapp');

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ error: 'Preview data not available' });
    });

    it('returns 404 when file is malformed JSON', async () => {
      mockFs.readFile.mockResolvedValue('{{bad json');

      const response = await request(app).post('/preview/graph/myapp');

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ error: 'Preview data not available' });
    });
  });
});
