import { useState, useCallback } from 'react';
import { WorkRequestInput } from '../types';

interface CreateWorkRequestState {
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string> | null;
}

interface CreateWorkRequestResult {
  state: CreateWorkRequestState;
  submit: (input: WorkRequestInput) => Promise<{ id: string } | null>;
  clearError: () => void;
}

export function useCreateWorkRequest(): CreateWorkRequestResult {
  const [state, setState] = useState<CreateWorkRequestState>({
    isSubmitting: false,
    error: null,
    fieldErrors: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, fieldErrors: null }));
  }, []);

  const submit = useCallback(async (input: WorkRequestInput): Promise<{ id: string } | null> => {
    setState({ isSubmitting: true, error: null, fieldErrors: null });

    try {
      const response = await fetch('/api/work-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        if (response.status === 400 && body?.errors) {
          const fieldErrors: Record<string, string> = {};
          for (const err of body.errors) {
            if (err.field && err.message) {
              fieldErrors[err.field] = err.message;
            }
          }
          setState({ isSubmitting: false, error: null, fieldErrors });
          return null;
        }

        const message = body?.error || 'Failed to save work request. Please try again.';
        setState({ isSubmitting: false, error: message, fieldErrors: null });
        return null;
      }

      const data = await response.json();
      setState({ isSubmitting: false, error: null, fieldErrors: null });
      return data;
    } catch {
      setState({
        isSubmitting: false,
        error: 'Unable to reach the server. Please try again.',
        fieldErrors: null,
      });
      return null;
    }
  }, []);

  return { state, submit, clearError };
}
