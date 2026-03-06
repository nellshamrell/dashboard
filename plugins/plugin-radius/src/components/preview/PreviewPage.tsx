import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, Button } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import ShareIcon from '@material-ui/icons/Share';
import {
  Header,
  Page,
  Content,
  Breadcrumbs,
  Link,
} from '@backstage/core-components';
import {
  GraphImportPanel,
  AppGraph as AppGraphComponent,
  PreviewBanner,
  transformToAppGraph,
  decodeGraphUrl,
  copyShareUrl,
} from '@radapp.io/rad-components';
import type {
  AppGraphData,
  ApplicationGraphResponse,
} from '@radapp.io/rad-components';

const LARGE_GRAPH_RESOURCE_THRESHOLD = 50;
const LARGE_GRAPH_CONNECTION_THRESHOLD = 100;

export const PreviewPage = () => {
  const [graph, setGraph] = useState<AppGraphData | null>(null);
  const [currentResponse, setCurrentResponse] =
    useState<ApplicationGraphResponse | null>(null);
  const [largeGraphWarning, setLargeGraphWarning] = useState(false);
  const [emptyGraph, setEmptyGraph] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);

  // On mount, check URL hash for shared graph data
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('graph=')) {
      return;
    }

    const result = decodeGraphUrl(hash);
    if (result.success && result.data) {
      handleImport(result.data);
    } else {
      setHashError(result.errors?.join('; ') || 'Unable to decode shared link');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = (response: ApplicationGraphResponse) => {
    const appGraph = transformToAppGraph(response);

    // Clear share state on new import
    setShareError(null);
    setShareCopied(false);
    setHashError(null);

    // Check for empty graph
    if (appGraph.resources.length === 0) {
      setGraph(null);
      setCurrentResponse(null);
      setEmptyGraph(true);
      setLargeGraphWarning(false);
      return;
    }

    // Check for large graph
    const totalConnections = appGraph.resources.reduce(
      (sum, r) => sum + (r.connections?.length || 0),
      0,
    );
    const isLarge =
      appGraph.resources.length > LARGE_GRAPH_RESOURCE_THRESHOLD ||
      totalConnections > LARGE_GRAPH_CONNECTION_THRESHOLD;

    setEmptyGraph(false);
    setLargeGraphWarning(isLarge);
    setGraph(appGraph);
    setCurrentResponse(response);
  };

  const handleShare = async () => {
    if (!currentResponse) return;

    setShareCopied(false);
    setShareError(null);

    const result = await copyShareUrl(currentResponse);
    if (result.success) {
      setShareCopied(true);
      // Reset copied indicator after 3 seconds
      setTimeout(() => setShareCopied(false), 3000);
    } else {
      setShareError(
        result.error ||
          'Graph data is too large to share via URL. Export the JSON file instead.',
      );
    }
  };

  return (
    <Page themeId="radius-preview">
      <Header
        title="Preview"
        subtitle="Import and visualize application graphs from JSON."
      />
      <Content>
        <Box mb={3}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link to="/">Home</Link>
            <Typography>Preview</Typography>
          </Breadcrumbs>
        </Box>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <GraphImportPanel onImport={handleImport} />
          </Grid>

          {hashError && (
            <Grid item>
              <Alert severity="error" data-testid="hash-error">
                {hashError}
              </Alert>
            </Grid>
          )}

          {emptyGraph && (
            <Grid item>
              <Alert severity="info">
                No resources found in the imported graph.
              </Alert>
            </Grid>
          )}

          {largeGraphWarning && (
            <Grid item>
              <Alert severity="warning" data-testid="large-graph-warning">
                This graph is large and may take longer to render. Performance
                may be affected.
              </Alert>
            </Grid>
          )}

          {graph && (
            <Grid item>
              <PreviewBanner />
            </Grid>
          )}

          {graph && (
            <Grid item>
              <Box display="flex" alignItems="center" mb={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  data-testid="share-button"
                >
                  {shareCopied ? 'Link Copied!' : 'Copy Link'}
                </Button>
              </Box>
              {shareError && (
                <Alert
                  severity="warning"
                  data-testid="share-error"
                  style={{ marginBottom: '8px' }}
                >
                  {shareError}
                </Alert>
              )}
              <Box style={{ height: '600px', width: '100%' }}>
                <AppGraphComponent graph={graph} isPreview />
              </Box>
            </Grid>
          )}
        </Grid>
      </Content>
    </Page>
  );
};
