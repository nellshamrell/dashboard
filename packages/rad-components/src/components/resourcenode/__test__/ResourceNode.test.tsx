import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ResourceNode from '../ResourceNode';
import * as sampledata from '../../../sampledata';
import { ReactFlowProvider } from 'reactflow';
import { Resource } from '../../../graph';

describe('ResourceNode component', () => {
  it('ResourceNode should render correctly', () => {
    const resource = sampledata.ContainerResource;
    render(
      <ReactFlowProvider>
        <ResourceNode data={resource} />
      </ReactFlowProvider>,
    );
    const name = screen.getByRole('heading', { name: resource.name });
    expect(name).toBeInTheDocument();
    const type = screen.getByRole('heading', { name: resource.type });
    expect(type).toBeInTheDocument();
  });

  it('renders preview styling when provisioningState is Preview', () => {
    const previewResource: Resource = {
      ...sampledata.ContainerResource,
      provisioningState: 'Preview',
    };

    const { container } = render(
      <ReactFlowProvider>
        <ResourceNode data={previewResource} />
      </ReactFlowProvider>,
    );

    // Check dashed border style
    const styledDiv = container.querySelector('div[style*="dashed"]');
    expect(styledDiv).toBeInTheDocument();

    // Check Preview chip/badge
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('does not render preview styling when provisioningState is not Preview', () => {
    const resource = sampledata.ContainerResource;

    render(
      <ReactFlowProvider>
        <ResourceNode data={resource} />
      </ReactFlowProvider>,
    );

    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });
});
