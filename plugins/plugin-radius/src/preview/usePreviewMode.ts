import { useEffect, useState } from 'react';
import { useApi, fetchApiRef } from '@backstage/core-plugin-api';

export interface PreviewStatus {
  previewMode: boolean;
  applicationName?: string;
  namespace?: string;
  resourceCount?: number;
}

export interface UsePreviewModeResult {
  isPreview: boolean;
  status: PreviewStatus | null;
  loading: boolean;
}

export function usePreviewMode(): UsePreviewModeResult {
  const fetchApi = useApi(fetchApiRef);
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetchApi.fetch(
          '/api/radius/preview/status',
        );
        if (!response.ok) {
          setStatus({ previewMode: false });
          return;
        }
        const data = (await response.json()) as PreviewStatus;
        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setStatus({ previewMode: false });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [fetchApi]);

  return {
    isPreview: status?.previewMode ?? false,
    status,
    loading,
  };
}
