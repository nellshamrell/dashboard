import React from 'react';
import '@testing-library/jest-dom';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { PreviewPage } from './PreviewPage';

// Mock AppGraph since it requires ReactFlow + canvas
// Note: jest.mock factory is hoisted before imports, so JSX is not available.
// We use React.createElement for the mock component.
jest.mock('@radapp.io/rad-components', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const actual = jest.requireActual('@radapp.io/rad-components');
  return {
    ...actual,
    AppGraph: function MockAppGraph(props) {
      const graph = props.graph;
      return React.createElement(
        'div',
        { 'data-testid': 'app-graph' },
        React.createElement(
          'span',
          { 'data-testid': 'graph-name' },
          graph.name,
        ),
        React.createElement(
          'span',
          { 'data-testid': 'graph-resource-count' },
          String(graph.resources.length),
        ),
        props.isPreview
          ? React.createElement(
              'span',
              { 'data-testid': 'graph-is-preview' },
              'true',
            )
          : null,
      );
    },
  };
});

const validResponse = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/webapp',
      type: 'Applications.Core/containers',
      name: 'webapp',
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: [],
    },
  ],
};

const emptyResponse = {
  resources: [],
};

function makeLargeResponse(resourceCount: number, connectionsPerResource = 0) {
  return {
    resources: Array.from({ length: resourceCount }, (_, i) => ({
      id: `/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/resource-${i}`,
      type: 'Applications.Core/containers',
      name: `resource-${i}`,
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: Array.from({ length: connectionsPerResource }, (__, j) => ({
        id: `/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/resource-${(i + j + 1) % resourceCount}`,
        direction: 'Outbound' as const,
      })),
    })),
  };
}

describe('PreviewPage', () => {
  it('renders the import panel', async () => {
    await renderInTestApp(<PreviewPage />);

    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(
      screen.getByText('Import and visualize application graphs from JSON.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('JSON input')).toBeInTheDocument();
  });

  it('shows the graph after valid JSON import', async () => {
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(validResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('app-graph')).toBeInTheDocument();
      expect(screen.getByTestId('graph-name')).toHaveTextContent('Preview');
      expect(screen.getByTestId('graph-resource-count')).toHaveTextContent('1');
    });
  });

  it('shows validation errors for invalid JSON', async () => {
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: '{bad json' },
    });
    fireEvent.click(screen.getByText('Import'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    expect(screen.queryByTestId('app-graph')).not.toBeInTheDocument();
  });

  it('shows empty graph message for zero-resource graph', async () => {
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(emptyResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(
        screen.getByText('No resources found in the imported graph.'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId('app-graph')).not.toBeInTheDocument();
  });

  it('shows large graph warning when resources exceed threshold', async () => {
    const largeResponse = makeLargeResponse(51);
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(largeResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('large-graph-warning')).toBeInTheDocument();
      expect(screen.getByTestId('app-graph')).toBeInTheDocument();
    });
  });

  it('shows large graph warning when connections exceed threshold', async () => {
    // 10 resources with 11 connections each = 110 total connections
    const largeResponse = makeLargeResponse(10, 11);
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(largeResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('large-graph-warning')).toBeInTheDocument();
      expect(screen.getByTestId('app-graph')).toBeInTheDocument();
    });
  });

  it('replaces graph on re-import', async () => {
    await renderInTestApp(<PreviewPage />);

    // First import
    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(validResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('graph-resource-count')).toHaveTextContent('1');
    });

    // Second import with different data
    const twoResourceResponse = {
      resources: [
        ...validResponse.resources,
        {
          id: '/planes/radius/local/resourceGroups/test/providers/Applications.Datastores/redisCaches/cache',
          type: 'Applications.Datastores/redisCaches',
          name: 'cache',
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        },
      ],
    };

    fireEvent.change(textArea, {
      target: { value: JSON.stringify(twoResourceResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('graph-resource-count')).toHaveTextContent('2');
    });
  });

  it('renders preview banner when graph is loaded', async () => {
    await renderInTestApp(<PreviewPage />);

    // Banner should not be present before import
    expect(screen.queryByTestId('preview-banner')).not.toBeInTheDocument();

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(validResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('preview-banner')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This graph was imported from a file and does not represent a deployed application.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('passes isPreview prop to AppGraph', async () => {
    await renderInTestApp(<PreviewPage />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(validResponse) },
    });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByTestId('graph-is-preview')).toHaveTextContent('true');
    });
  });

  describe('shareable URL', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    afterEach(() => {
      // Reset hash
      window.location.hash = '';
    });

    it('decodes URL hash on mount and renders graph', async () => {
      // Import pako and encode the valid response into a hash
      const pako = require('pako');
      const json = JSON.stringify(validResponse);
      const compressed = pako.deflate(json);
      let binary = '';
      for (let i = 0; i < compressed.length; i++) {
        binary += String.fromCharCode(compressed[i]);
      }
      const encoded = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

      window.location.hash = `graph=${encoded}`;

      await renderInTestApp(<PreviewPage />);

      await waitFor(() => {
        expect(screen.getByTestId('app-graph')).toBeInTheDocument();
        expect(screen.getByTestId('graph-resource-count')).toHaveTextContent(
          '1',
        );
      });
    });

    it('shows error for corrupted URL hash', async () => {
      window.location.hash = 'graph=!!!corrupted!!!';

      await renderInTestApp(<PreviewPage />);

      await waitFor(() => {
        expect(screen.getByTestId('hash-error')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('app-graph')).not.toBeInTheDocument();
    });

    it('shows share button when graph is loaded', async () => {
      await renderInTestApp(<PreviewPage />);

      // No share button before import
      expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();

      const textArea = screen.getByLabelText('JSON input');
      fireEvent.change(textArea, {
        target: { value: JSON.stringify(validResponse) },
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByTestId('share-button')).toBeInTheDocument();
        expect(screen.getByTestId('share-button')).toHaveTextContent(
          'Copy Link',
        );
      });
    });

    it('copies URL to clipboard when share button is clicked', async () => {
      await renderInTestApp(<PreviewPage />);

      const textArea = screen.getByLabelText('JSON input');
      fireEvent.change(textArea, {
        target: { value: JSON.stringify(validResponse) },
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByTestId('share-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('share-button'));
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(screen.getByTestId('share-button')).toHaveTextContent(
          'Link Copied!',
        );
      });
    });

    it('shows error when graph is too large to share', async () => {
      // Use unique pseudo-random data to defeat compression
      const makeUniqueId = (i: number) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        let n = i * 17 + 31;
        for (let j = 0; j < 120; j++) {
          id += chars[n % chars.length];
          n = (n * 37 + 11) % 1000003;
        }
        return id;
      };
      const hugeResponse = {
        resources: Array.from({ length: 3000 }, (_, i) => ({
          id: `/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/${makeUniqueId(i)}`,
          type: `Applications.${makeUniqueId(i + 10000).slice(0, 30)}/type${i}`,
          name: `resource-${makeUniqueId(i + 20000)}`,
          provisioningState: 'Succeeded',
          outputResources: [],
          connections: [],
        })),
      };
      await renderInTestApp(<PreviewPage />);

      const textArea = screen.getByLabelText('JSON input');
      fireEvent.change(textArea, {
        target: { value: JSON.stringify(hugeResponse) },
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByTestId('share-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('share-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('share-error')).toBeInTheDocument();
        expect(screen.getByTestId('share-error')).toHaveTextContent(
          'too large',
        );
      });
    });
  });
});
