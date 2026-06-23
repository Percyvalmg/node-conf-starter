import { useState, useCallback } from 'react';
import { SquadSummary } from '../types';

export interface UseSquadMutationReturn {
  saveSquad: (candidateIds: string[]) => Promise<SquadSummary | null>;
  isSaving: boolean;
  error: string | null;
  clearError: () => void;
}

export function useSquadMutation(workRequestId: string | undefined): UseSquadMutationReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const saveSquad = useCallback(
    async (candidateIds: string[]): Promise<SquadSummary | null> => {
      if (!workRequestId) {
        setError('No work request ID provided');
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/work-requests/${workRequestId}/squad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message =
            data?.fields?.candidateIds ?? data?.error ?? `Failed to save squad: ${response.statusText}`;
          throw new Error(message);
        }

        const squad: SquadSummary = await response.json();
        return squad;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save squad';
        setError(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [workRequestId]
  );

  return { saveSquad, isSaving, error, clearError };
}
