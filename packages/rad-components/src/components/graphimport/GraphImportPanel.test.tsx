import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GraphImportPanel } from './GraphImportPanel';
import { ApplicationGraphResponse } from '../../lib/graphImport';

const validResponse: ApplicationGraphResponse = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/test/providers/Applications.Core/containers/webapp',
      type: 'Applications.Core/containers',
      name: 'webapp',
      provisioningState: 'Succeeded',
      outputResources: [],
      connections: [],
    },
  ],
};

describe('GraphImportPanel', () => {
  it('renders the import panel with text area and buttons', () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    expect(screen.getByLabelText('JSON input')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('calls onImport with parsed data when valid JSON is pasted and submitted', () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify(validResponse) },
    });

    fireEvent.click(screen.getByText('Import'));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(validResponse);
  });

  it('shows validation errors when invalid JSON is pasted and submitted', () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: '{invalid json' },
    });

    fireEvent.click(screen.getByText('Import'));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
  });

  it('shows validation errors for valid JSON that fails schema validation', () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    const textArea = screen.getByLabelText('JSON input');
    fireEvent.change(textArea, {
      target: { value: '{"resources": "not-array"}' },
    });

    fireEvent.click(screen.getByText('Import'));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows error when submitting with empty input', () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    fireEvent.click(screen.getByText('Import'));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/paste JSON or upload/i)).toBeInTheDocument();
  });

  it('handles file upload and calls onImport for valid file', async () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    const file = new File(
      [JSON.stringify(validResponse)],
      'graph.json',
      { type: 'application/json' },
    );

    const fileInput = screen.getByTestId('file-upload');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
      expect(onImport).toHaveBeenCalledWith(validResponse);
    });
  });

  it('handles file upload with invalid JSON and shows errors', async () => {
    const onImport = jest.fn();
    render(<GraphImportPanel onImport={onImport} />);

    const file = new File(
      ['{invalid'],
      'bad.json',
      { type: 'application/json' },
    );

    const fileInput = screen.getByTestId('file-upload');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await waitFor(() => {
      expect(onImport).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
