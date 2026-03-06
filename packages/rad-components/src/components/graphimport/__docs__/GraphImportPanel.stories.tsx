import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GraphImportPanel } from '../GraphImportPanel';
import { action } from '@storybook/addon-essentials';

const meta: Meta<typeof GraphImportPanel> = {
  title: 'GraphImportPanel',
  component: GraphImportPanel,
};

export default meta;
type Story = StoryObj<typeof GraphImportPanel>;

export const Empty: Story = {
  args: {
    onImport: (() => {}) as (response: unknown) => void,
  },
};

export const WithValidationError: Story = {
  render: () => {
    const [submitted, setSubmitted] = React.useState(false);
    return (
      <div>
        <GraphImportPanel onImport={() => setSubmitted(true)} />
        {submitted && <p>Graph imported successfully!</p>}
      </div>
    );
  },
};

export const WithLoadedData: Story = {
  render: () => {
    const [imported, setImported] = React.useState(false);
    return (
      <div>
        <GraphImportPanel onImport={() => setImported(true)} />
        {imported && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#e8f5e9',
              border: '1px solid #c8e6c9',
              borderRadius: '4px',
            }}
          >
            Graph imported successfully!
          </div>
        )}
      </div>
    );
  },
};
