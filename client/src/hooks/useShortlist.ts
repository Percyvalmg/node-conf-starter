import { useState, useEffect, useCallback } from 'react';
import { ApiState, ScoredCandidate, ScoreBreakdown } from '../types';

export interface ShortlistData {
  results: ScoredCandidate[];
  warnings: { candidateId: string; field: string; message: string }[];
  totalCandidates: number;
  qualifiedCount: number;
}

export function useShortlist(workRequestId: string | undefined): ApiState<ShortlistData> {
  const [data, setData] = useState<ShortlistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShortlist = useCallback(async () => {
    if (!workRequestId) {
      setIsLoading(false);
      setError('No work request ID provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-requests/${workRequestId}/shortlist`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Work request not found');
        }
        throw new Error(`Failed to fetch shortlist: ${response.statusText}`);
      }
      const json = await response.json();
      const rawCandidates = json.candidates ?? json.results ?? [];
      const mappedResults: ScoredCandidate[] = rawCandidates.map((c: Record<string, unknown>) => ({
        id: (c.candidateId ?? c.id) as string,
        name: c.name as string,
        role: c.role as string,
        matchScore: c.matchScore as number,
        matchedSkills: c.matchedSkills as string[],
        availabilityBand: c.availabilityBand as number,
        workloadIndicator: c.workloadIndicator as number,
        breakdown: {
          skillMatch: ((c.breakdown as ScoreBreakdown).skillMatch ?? 0) * 100,
          roleAlignment: ((c.breakdown as ScoreBreakdown).roleAlignment ?? 0) * 100,
          availability: ((c.breakdown as ScoreBreakdown).availability ?? 0) * 100,
          workload: ((c.breakdown as ScoreBreakdown).workload ?? 0) * 100,
        },
      }));
      setData({
        results: mappedResults,
        warnings: json.warnings ?? [],
        totalCandidates: json.totalCandidates ?? 0,
        qualifiedCount: json.qualifiedCount ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shortlist');
    } finally {
      setIsLoading(false);
    }
  }, [workRequestId]);

  useEffect(() => {
    fetchShortlist();
  }, [fetchShortlist]);

  return { data, isLoading, error, retry: fetchShortlist };
}
