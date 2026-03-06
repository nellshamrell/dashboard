import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PreviewBanner } from '../PreviewBanner';

const meta: Meta<typeof PreviewBanner> = {
  title: 'PreviewBanner',
  component: PreviewBanner,
};

export default meta;
type Story = StoryObj<typeof PreviewBanner>;

export const Default: Story = {
  render: () => <PreviewBanner />,
};

export const InContext: Story = {
  render: () => (
    <div style={{ maxWidth: '800px', padding: '16px' }}>
      <PreviewBanner />
      <div
        style={{
          marginTop: '16px',
          height: '300px',
          border: '2px dashed #9e9e9e',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#757575',
        }}
      >
        Graph placeholder
      </div>
    </div>
  ),
};
