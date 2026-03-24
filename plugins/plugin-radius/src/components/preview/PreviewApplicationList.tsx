import React from 'react';
import {
  Progress,
  ResponseErrorPanel,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { useApi, fetchApiRef } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { Link } from '@backstage/core-components';
import { parseResourceId } from '@radapp.io/rad-components';

interface PreviewApplication {
  id: string;
  name: string;
  type: string;
  properties: {
    provisioningState: string;
  };
}

interface PreviewApplicationListResponse {
  value: PreviewApplication[];
}

export const PreviewApplicationList = () => {
  const fetchApi = useApi(fetchApiRef);

  const { value, loading, error } = useAsync(async () => {
    const response = await fetchApi.fetch(
      '/api/radius/preview/applications',
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch preview applications: ${response.status}`);
    }
    return (await response.json()) as PreviewApplicationListResponse;
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const columns: TableColumn<PreviewApplication>[] = [
    {
      title: 'Name',
      type: 'string',
      render: row => (
        <Link to={`/resources?application=${encodeURIComponent(row.id)}`}>
          {row.name}
        </Link>
      ),
    },
    {
      title: 'Resource Group',
      type: 'string',
      render: row => parseResourceId(row.id)?.group,
    },
    {
      title: 'Status',
      type: 'string',
      render: row => row.properties.provisioningState,
    },
  ];

  return (
    <Table
      title="Applications (Preview)"
      columns={columns}
      data={value?.value ?? []}
      options={{ paging: false, search: false }}
    />
  );
};
