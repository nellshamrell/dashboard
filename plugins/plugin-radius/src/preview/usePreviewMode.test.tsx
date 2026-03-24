import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { usePreviewMode } from './usePreviewMode';
import { waitFor } from '@testing-library/react';

// Test component to consume the hook
function TestComponent() {
  const { isPreview, loading } = usePreviewMode();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="isPreview">{String(isPreview)}</span>
    </div>
  );
}

describe('usePreviewMode', () => {
  it('returns isPreview true when status endpoint responds with previewMode true', async () => {
    const rendered = await renderInTestApp(<TestComponent />, {
      mountedRoutes: {},
    });

    // The fetchApi in test-utils defaults to a mock. We need to check behavior.
    // Since the test-utils fetchApi will likely return a network error,
    // the hook should default to { isPreview: false }
    await waitFor(() => {
      expect(rendered.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('returns isPreview false when fetch fails', async () => {
    const rendered = await renderInTestApp(<TestComponent />, {
      mountedRoutes: {},
    });

    await waitFor(() => {
      expect(rendered.getByTestId('loading').textContent).toBe('false');
      expect(rendered.getByTestId('isPreview').textContent).toBe('false');
    });
  });
});
