import {
  InfoCard,
  LinkButton,
  Progress,
  ResponseErrorPanel,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { radiusApiRef } from '../../plugin';
import { EnvironmentProperties, Resource, ResourceList } from '../../resources';
import { ResourceLink } from '../resourcelink';
import { environmentPageRouteRef } from '../../routes';
import { parseResourceId } from '@radapp.io/rad-components';
import { usePreviewMode } from '../../preview/usePreviewMode';
import Typography from '@mui/material/Typography';

const EnvironmentListInfoFetcher = ({ isPreview }: { isPreview: boolean }) => {
  const route = useRouteRef(environmentPageRouteRef);

  const radiusApi = useApi(radiusApiRef);
  const { value, loading, error } = useAsync(
    async (): Promise<ResourceList<EnvironmentProperties> | null> => {
      if (isPreview) {
        return null;
      }
      return radiusApi.listEnvironments<EnvironmentProperties>();
    },
    [isPreview],
  );

  if (loading) {
    return <Progress data-testid="progress" />;
  } else if (isPreview) {
    return (
      <Typography variant="body2" color="textSecondary" style={{ padding: 16 }}>
        Environment details will be available after deploying to Radius.
      </Typography>
    );
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const columns: TableColumn<Resource<EnvironmentProperties>>[] = [
    {
      title: 'Name',
      type: 'string',
      width: '30%',
      highlight: true,
      render: row => <ResourceLink id={row.id} />,
    },
    {
      title: 'Actions',
      align: 'right',
      render: row => {
        const parsed = parseResourceId(row.id);
        if (!parsed) {
          return null;
        }

        const base = route({
          group: parsed.group,
          namespace: parsed.type.split('/')[0],
          type: parsed.type.split('/')[1],
          name: parsed.name,
        });
        return (
          <>
            <LinkButton to={`${base}/overview`}>Overview</LinkButton>
            <LinkButton to={`${base}/resources`}>Resources</LinkButton>
          </>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      components={{ Toolbar: _row => null }}
      options={{ search: false, paging: false, padding: 'dense', pageSize: 5 }}
      data={value?.value || []}
    />
  );
};

const EnvironmentListInfoContent = () => {
  const { isPreview, loading: previewLoading } = usePreviewMode();

  if (previewLoading) {
    return <Progress data-testid="progress" />;
  }

  return <EnvironmentListInfoFetcher isPreview={isPreview} />;
};

export const EnvironmentListInfoCard = () => {
  return (
    <InfoCard title="Environments">
      <EnvironmentListInfoContent />
    </InfoCard>
  );
};
