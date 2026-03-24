import React from 'react';
import { Grid, Typography, Box } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  Breadcrumbs,
  Link,
} from '@backstage/core-components';
import { ResourceTable } from '../resourcetable';
import { usePreviewMode } from '../../preview/usePreviewMode';
import { PreviewBanner } from '../preview/PreviewBanner';
import { PreviewApplicationList } from '../preview/PreviewApplicationList';

export const ApplicationListPage = () => {
  const { isPreview } = usePreviewMode();

  return (
    <Page themeId="radius-application-list">
      <Header
        title="Applications"
        subtitle="Displaying deployed applications."
      />
      <Content>
        <Box mb={3}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link to="/">Home</Link>
            <Link to="/environments">Environments</Link>
            <Typography>Applications</Typography>
          </Breadcrumbs>
        </Box>
        <PreviewBanner isPreview={isPreview} />
        <Grid container spacing={3} direction="column">
          <Grid item>
            {isPreview ? (
              <PreviewApplicationList />
            ) : (
              <ResourceTable
                title="Applications"
                resourceType="Applications.Core/applications"
              />
            )}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
