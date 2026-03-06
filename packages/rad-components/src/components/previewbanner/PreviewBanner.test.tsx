import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PreviewBanner } from './PreviewBanner';

describe('PreviewBanner', () => {
  it('renders with the correct title text', () => {
    render(<PreviewBanner />);

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders the explanatory description', () => {
    render(<PreviewBanner />);

    expect(
      screen.getByText(
        'This graph was imported from a file and does not represent a deployed application.',
      ),
    ).toBeInTheDocument();
  });

  it('renders with the preview-banner test id', () => {
    render(<PreviewBanner />);

    expect(screen.getByTestId('preview-banner')).toBeInTheDocument();
  });

  it('renders as an info alert', () => {
    render(<PreviewBanner />);

    const alert = screen.getByTestId('preview-banner');
    expect(alert).toHaveClass('MuiAlert-standardInfo');
  });

  it('has dashed border styling', () => {
    render(<PreviewBanner />);

    const alert = screen.getByTestId('preview-banner');
    expect(alert).toHaveStyle({ border: '1px dashed #90caf9' });
  });
});
