import React from 'react';
import { Box, Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import VisibilityIcon from '@material-ui/icons/Visibility';

/**
 * PreviewBanner displays a prominent banner above the graph area
 * to indicate that the currently rendered graph is a preview
 * (imported from a file) and does not represent a deployed application.
 */
export function PreviewBanner() {
  return (
    <Alert
      severity="info"
      icon={<VisibilityIcon fontSize="inherit" />}
      data-testid="preview-banner"
      style={{
        backgroundColor: '#e3f2fd',
        border: '1px dashed #90caf9',
      }}
    >
      <Box>
        <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
          Preview
        </Typography>
        <Typography variant="body2" color="textSecondary">
          This graph was imported from a file and does not represent a deployed
          application.
        </Typography>
      </Box>
    </Alert>
  );
}

export default PreviewBanner;
