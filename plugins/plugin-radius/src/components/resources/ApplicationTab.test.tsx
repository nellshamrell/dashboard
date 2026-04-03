import React from 'react';
import { TestApiProvider } from '@backstage/test-utils';
import { render, screen, waitFor } from '@testing-library/react';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes';
import { ApplicationTab } from './ApplicationTab';

// Mock usePreviewMode so we can control isPreview state
jest.mock('../../preview/usePreviewMode', () => ({
  usePreviewMode: jest.fn(),
}));

// Mock AppGraph since it uses ReactFlow which doesn't render in jsdom
jest.mock('@radapp.io/rad-components', () => ({
  AppGraph: ({ graph }: { graph: { resources: unknown[] } }) => (
    <div data-testid="app-graph">
      {graph.resources.map((r: { name: string }) => (
        <span key={r.name} data-testid={`graph-node-${r.name}`}>
          {r.name}
        </span>
      ))}
    </div>
  ),
  parseResourceId: (id: string) => {
    const parts = id.split('/');
    return { name: parts[parts.length - 1] };
  },
}));

// Mock PreviewBanner to simplify assertions
jest.mock('../preview/PreviewBanner', () => ({
  PreviewBanner: ({ isPreview }: { isPreview: boolean }) =>
    isPreview ? <div data-testid="preview-banner">Preview Mode</div> : null,
}));

// Mock Backstage core-components to avoid CSS/theme dependency issues in jsdom
jest.mock('@backstage/core-components', () => ({
  InfoCard: ({ title, subheader, children }: { title: string; subheader?: string; children: React.ReactNode }) => (
    <div data-testid="info-card">
      <span data-testid="info-card-title">{title}</span>
      {subheader && <span data-testid="info-card-subheader">{subheader}</span>}
      {children}
    </div>
  ),
  Progress: () => <div data-testid="progress">Loading...</div>,
  ResponseErrorPanel: ({ error }: { error: Error }) => (
    <div role="alert">{error.message}</div>
  ),
}));

// Mock makeStyles to avoid MUI theme issues
jest.mock('@material-ui/core', () => ({
  makeStyles: () => () => ({ container: 'mock-container' }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { usePreviewMode } = require('../../preview/usePreviewMode');

const mockGraphData = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/containers/api',
      name: 'api',
      type: 'Applications.Core/containers',
      provider: 'radius',
      provisioningState: 'Preview',
      connections: [
        {
          id: '/planes/radius/local/resourceGroups/default/providers/Applications.Datastores/redisCaches/cache',
          name: 'cache',
          type: 'Applications.Datastores/redisCaches',
          provider: 'radius',
          direction: 'Outbound',
        },
      ],
    },
    {
      id: '/planes/radius/local/resourceGroups/default/providers/Applications.Datastores/redisCaches/cache',
      name: 'cache',
      type: 'Applications.Datastores/redisCaches',
      provider: 'radius',
      provisioningState: 'Preview',
      connections: [
        {
          id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/containers/api',
          name: 'api',
          type: 'Applications.Core/containers',
          provider: 'radius',
          direction: 'Inbound',
        },
      ],
    },
  ],
};

const APPLICATION_ID =
  '/planes/radius/local/resourceGroups/default/providers/Applications.Core/applications/myapp';

describe('ApplicationTab', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('fetches from preview API when isPreview is true', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: true,
      status: { previewMode: true },
      loading: false,
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGraphData,
    });

    const mockKubernetesApi = {
      getClusters: jest.fn(),
      proxy: jest.fn(),
    };

    render(
      <TestApiProvider
        apis={[
          [fetchApiRef, { fetch: mockFetch }],
          [kubernetesApiRef, mockKubernetesApi],
        ]}
      >
        <ApplicationTab application={APPLICATION_ID} />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-graph')).toBeInTheDocument();
    });

    // Verify it called the preview endpoint, not the Kubernetes proxy
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/radius/preview/graph/myapp',
      { method: 'POST' },
    );
    expect(mockKubernetesApi.proxy).not.toHaveBeenCalled();
  });

  it('passes preview resources to AppGraph component', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: true,
      status: { previewMode: true },
      loading: false,
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGraphData,
    });

    const mockKubernetesApi = {
      getClusters: jest.fn(),
      proxy: jest.fn(),
    };

    render(
      <TestApiProvider
        apis={[
          [fetchApiRef, { fetch: mockFetch }],
          [kubernetesApiRef, mockKubernetesApi],
        ]}
      >
        <ApplicationTab application={APPLICATION_ID} />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('graph-node-api')).toBeInTheDocument();
      expect(screen.getByTestId('graph-node-cache')).toBeInTheDocument();
    });
  });

  it('renders preview subheader when isPreview is true (FR-019)', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: true,
      status: { previewMode: true },
      loading: false,
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGraphData,
    });

    const mockKubernetesApi = {
      getClusters: jest.fn(),
      proxy: jest.fn(),
    };

    render(
      <TestApiProvider
        apis={[
          [fetchApiRef, { fetch: mockFetch }],
          [kubernetesApiRef, mockKubernetesApi],
        ]}
      >
        <ApplicationTab application={APPLICATION_ID} />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Preview — deploy with Radius to see live resources.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('falls back to live Kubernetes proxy when isPreview is false', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: false,
      status: { previewMode: false },
      loading: false,
    });

    const mockFetch = jest.fn();

    const mockKubernetesApi = {
      getClusters: jest.fn().mockResolvedValue([{ name: 'test-cluster' }]),
      proxy: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGraphData,
        text: async () => '',
      }),
    };

    render(
      <TestApiProvider
        apis={[
          [fetchApiRef, { fetch: mockFetch }],
          [kubernetesApiRef, mockKubernetesApi],
        ]}
      >
        <ApplicationTab application={APPLICATION_ID} />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-graph')).toBeInTheDocument();
    });

    // Should use Kubernetes proxy, not the preview endpoint
    expect(mockKubernetesApi.proxy).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/radius/preview/graph/'),
      expect.anything(),
    );
  });
});
