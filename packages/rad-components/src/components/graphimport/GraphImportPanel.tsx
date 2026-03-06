import React, { useState, useRef, useCallback } from 'react';
import {
  parseGraphJson,
  ApplicationGraphResponse,
} from '../../lib/graphImport';

export interface GraphImportPanelProps {
  onImport: (response: ApplicationGraphResponse) => void;
}

/**
 * Panel for importing ApplicationGraphResponse JSON data.
 * Supports pasting JSON into a text area or uploading a `.json` file.
 * Validates input and displays errors; calls onImport on success.
 */
export function GraphImportPanel({ onImport }: GraphImportPanelProps) {
  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!jsonText.trim()) {
      setErrors(['Please paste JSON or upload a file.']);
      return;
    }

    setLoading(true);
    setErrors([]);

    const result = parseGraphJson(jsonText);
    setLoading(false);

    if (result.success && result.data) {
      setErrors([]);
      onImport(result.data);
    } else {
      setErrors(result.errors || ['Unknown validation error']);
    }
  }, [jsonText, onImport]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setLoading(true);
      setErrors([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setJsonText(text);

        const result = parseGraphJson(text);
        setLoading(false);

        if (result.success && result.data) {
          setErrors([]);
          onImport(result.data);
        } else {
          setErrors(result.errors || ['Unknown validation error']);
        }
      };
      reader.onerror = () => {
        setLoading(false);
        setErrors(['Failed to read file.']);
      };
      reader.readAsText(file);
    },
    [onImport],
  );

  return (
    <div data-testid="graph-import-panel">
      <h3>Import Application Graph</h3>
      <p>
        Paste the JSON output from{' '}
        <code>rad app graph --output json</code> or upload a{' '}
        <code>.json</code> file.
      </p>

      <textarea
        aria-label="JSON input"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder='{"resources": [...]}'
        rows={12}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
      />

      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : 'Import'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          data-testid="file-upload"
        />
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: '#fdecea',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GraphImportPanel;
