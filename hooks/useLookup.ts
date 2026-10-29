import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/apiBaseUrl';

interface LookupState<T> {
  data: T[];
  loading: boolean;
  failed: boolean;
}

/** Fetch each lookup independently so a failed endpoint does not hide others. */
export function useLookup<T>(endpoint: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LookupState<T>>({ data: [], loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const base = apiBaseUrl();
        const response = await fetch(`${base}/${endpoint}`, { credentials: 'include', signal: controller.signal });
        if (!response.ok) throw new Error('Lookup failed');
        const payload = await response.json() as { data: T[] };
        if (!Array.isArray(payload.data)) throw new Error('Invalid lookup response');
        if (!controller.signal.aborted) setState({ data: payload.data, loading: false, failed: false });
      } catch {
        if (!controller.signal.aborted) setState({ data: [], loading: false, failed: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, attempt]);

  function retry() {
    setState({ data: [], loading: true, failed: false });
    setAttempt((previous) => previous + 1);
  }
  return { ...state, retry };
}
