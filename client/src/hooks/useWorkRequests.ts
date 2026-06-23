import { useState, useEffect, useCallback } from 'react';
import { ApiState, WorkRequest, PaginatedResponse } from '../types';

export interface WorkRequestsData {
  items: WorkRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useWorkRequests(
  page: number = 1,
  pageSize: number = 50
): ApiState<WorkRequestsData> {
  const [data, setData] = useState<WorkRequestsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/work-requests?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch work requests: ${response.statusText}`);
      }
      const json: PaginatedResponse<WorkRequest> = await response.json();
      setData({
        items: json.data,
        total: json.total,
        page: json.page,
        pageSize: json.pageSize,
        totalPages: Math.ceil(json.total / json.pageSize),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work requests');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchWorkRequests();
  }, [fetchWorkRequests]);

  return { data, isLoading, error, retry: fetchWorkRequests };
}

export function useWorkRequestDetail(id: string | null): ApiState<WorkRequest> {
  const [data, setData] = useState<WorkRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-requests/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Work request not found');
        }
        throw new Error(`Failed to fetch work request: ${response.statusText}`);
      }
      const json: WorkRequest = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work request');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, isLoading, error, retry: fetchDetail };
}
