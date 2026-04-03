import React from 'react';
import { ApplicationListPage } from './ApplicationListPage';
import { screen, waitFor } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { RadiusApi } from '../../api';
import { radiusApiRef } from '../../plugin';
import { ApplicationProperties, ResourceList } from '../../resources';

// Mock usePreviewMode so we can control preview state per test
jest.mock('../../preview/usePreviewMode', () => ({
  usePreviewMode: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { usePreviewMode } = require('../../preview/usePreviewMode');

describe('ApplicationListPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Rendering an empty table is fine for now, we have good unit tests for the
  // table logic elsewhere.
  it('should render table', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: false,
      status: null,
      loading: false,
    });

    const api: Pick<RadiusApi, 'listResources'> = {
      listResources: async <T = ApplicationProperties,>() =>
        Promise.resolve<ResourceList<T>>({
          value: [],
        }),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[radiusApiRef, api]]}>
        <ApplicationListPage />
      </TestApiProvider>,
    );
    expect(
      screen.getByText('Displaying deployed applications.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2); // Header + empty row
    const [header] = rows;

    // Verify correct headings (we had headings that will never be shown for an application)
    const expectedColumns = [
      'Name',
      'Resource Group',
      'Type',
      'Environment',
      'Status',
    ];
    const headings = header.querySelectorAll('th');
    expect(headings).toHaveLength(expectedColumns.length);
    headings.forEach((heading, index) => {
      expect(heading).toHaveTextContent(expectedColumns[index]);
    });
  });

  it('renders preview application list when isPreview is true', async () => {
    usePreviewMode.mockReturnValue({
      isPreview: true,
      status: { previewMode: true, applicationName: 'myapp', namespace: 'default', resourceCount: 2 },
      loading: false,
    });

    const previewAppData = {
      value: [
        {
          id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/applications/myapp',
          name: 'myapp',
          type: 'Applications.Core/applications',
          properties: { provisioningState: 'Preview', status: {} },
        },
      ],
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => previewAppData,
    });

    const api: Pick<RadiusApi, 'listResources'> = {
      listResources: jest.fn(),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [radiusApiRef, api],
          [fetchApiRef, { fetch: mockFetch }],
        ]}
      >
        <ApplicationListPage />
      </TestApiProvider>,
    );

    // Should fetch from preview applications endpoint
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/radius/preview/applications',
      );
    });

    // Should render the preview application name
    await waitFor(() => {
      expect(screen.getByText('myapp')).toBeInTheDocument();
    });

    // Should NOT use the live Radius API
    expect(api.listResources).not.toHaveBeenCalled();
  });
});
