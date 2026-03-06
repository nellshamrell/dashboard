import React, { useState } from 'react';
import { Grid, Typography, Box } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
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
  transformToAppGraph,
} from '@radapp.io/rad-components';
import type {
  AppGraphData,
  ApplicationGraphResponse,
} from '@radapp.io/rad-components';

const LARGE_GRAPH_RESOURCE_THRESHOLD = 50;
const LARGE_GRAPH_CONNECTION_THRESHOLD = 100;

export const PreviewPage = () => {
  const [graph, setGraph] = useState<AppGraphData | null>(null);
  const [largeGraphWarning, setLargeGraphWarning] = useState(false);
  const [emptyGraph, setEmptyGraph] = useState(false);

  const handleImport = (response: ApplicationGraphResponse) => {
    const appGraph = transformToAppGraph(response);

    // Check for empty graph
    if (appGraph.resources.length === 0) {
      setGraph(null);
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
              <Box style={{ height: '600px', width: '100%' }}>
                <AppGraphComponent graph={graph} />
              </Box>
            </Grid>
          )}
        </Grid>
      </Content>
    </Page>
  );
};
