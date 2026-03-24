import React from 'react';
import { Alert } from '@material-ui/lab';

export interface PreviewBannerProps {
  isPreview: boolean;
}

export const PreviewBanner = ({ isPreview }: PreviewBannerProps) => {
  if (!isPreview) {
    return null;
  }

  return (
    <Alert severity="info" style={{ marginBottom: '16px' }}>
      Preview Mode — Showing projected Radius topology from your Aspire app
      model. Run <code>aspire deploy</code> to deploy to Radius and see live
      resources.
    </Alert>
  );
};
