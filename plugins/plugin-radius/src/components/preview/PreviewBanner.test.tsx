import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PreviewBanner } from './PreviewBanner';

describe('PreviewBanner', () => {
  it('renders Alert with info severity when isPreview is true', () => {
    render(<PreviewBanner isPreview={true} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('MuiAlert-standardInfo');
  });

  it('displays correct preview message text', () => {
    render(<PreviewBanner isPreview={true} />);
    expect(
      screen.getByText(/Preview Mode/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aspire deploy/),
    ).toBeInTheDocument();
  });

  it('renders nothing when isPreview is false', () => {
    const { container } = render(<PreviewBanner isPreview={false} />);
    expect(container.firstChild).toBeNull();
  });
});
