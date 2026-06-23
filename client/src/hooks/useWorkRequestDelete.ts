import { useState, useCallback } from 'react';

export interface UseWorkRequestDeleteReturn {
  deleteRequest: (id: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

export function useWorkRequestDelete(): UseWorkRequestDeleteReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteRequest = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-requests/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        return true;
      }

      if (response.status === 404) {
        throw new Error('Work request not found');
      }

      throw new Error(`Failed to delete work request: ${response.statusText}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete work request';
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteRequest, isDeleting, error };
}
