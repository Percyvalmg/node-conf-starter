import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useShortlist } from '../hooks/useShortlist';
import { ScoredCandidate, WorkRequest } from '../types';
import { SquadPanel } from '../components/SquadPanel';

export function ShortlistPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, retry } = useShortlist(id);
  const [workRequest, setWorkRequest] = useState<WorkRequest | null>(null);

  const fetchWorkRequest = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/work-requests/${id}`);
      if (response.ok) {
        const json = await response.json();
        setWorkRequest(json);
      }
    } catch {
      // Non-critical — SquadPanel will work without it
    }
  }, [id]);

  useEffect(() => {
    fetchWorkRequest();
  }, [fetchWorkRequest]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600" role="status" aria-live="polite">
          Loading shortlist...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={retry}
          className="mt-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const results = data?.results ?? [];
  const qualifiedCount = data?.qualifiedCount ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Candidate Shortlist</h1>

      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {qualifiedCount > 0 && qualifiedCount < 10 && (
            <InfoMessage qualifiedCount={qualifiedCount} />
          )}
          <ShortlistTable candidates={results} />
          {id && (
            <SquadPanel
              workRequestId={id}
              candidates={results}
              requiredSkills={workRequest?.requiredSkills ?? []}
              existingSquadMembers={workRequest?.squad?.members}
              onSquadSaved={() => fetchWorkRequest()}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md bg-gray-50 border border-gray-200 p-8 text-center">
      <p className="text-gray-600 text-lg">
        No candidates qualify for this work request.
      </p>
      <p className="text-gray-500 text-sm mt-2">
        Try adjusting the required skills or roles to broaden the search.
      </p>
    </div>
  );
}

function InfoMessage({ qualifiedCount }: { qualifiedCount: number }) {
  return (
    <div
      className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-4"
      role="alert"
    >
      <div className="flex items-center">
        <span className="text-blue-600 mr-2" aria-hidden="true">ℹ</span>
        <p className="text-blue-800 text-sm">
          Fewer than 10 candidates qualify — showing {qualifiedCount}{' '}
          {qualifiedCount === 1 ? 'candidate' : 'candidates'} found.
        </p>
      </div>
    </div>
  );
}

function ShortlistTable({ candidates }: { candidates: ScoredCandidate[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Match Score
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matched Skills
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Availability
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Workload
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {candidates.map((candidate, index) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              rank={index + 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateRow({ candidate, rank }: { candidate: ScoredCandidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isHighAvailability = candidate.availabilityBand >= 70;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {rank}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
          {candidate.name}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {candidate.role}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
          {candidate.matchScore}%
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <div className="flex flex-wrap gap-1">
            {candidate.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm">
          <AvailabilityIndicator
            band={candidate.availabilityBand}
            isHigh={isHighAvailability}
          />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {candidate.workloadIndicator}/10
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none focus:underline"
            aria-expanded={expanded}
            aria-controls={`breakdown-${candidate.id}`}
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr id={`breakdown-${candidate.id}`}>
          <td colSpan={8} className="px-4 py-3 bg-gray-50">
            <ScoreBreakdownPanel candidate={candidate} />
          </td>
        </tr>
      )}
    </>
  );
}

function AvailabilityIndicator({ band, isHigh }: { band: number; isHigh: boolean }) {
  if (isHigh) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-green-600"
          aria-hidden="true"
        />
        <span className="text-green-800 font-medium">{band}%</span>
        <span className="sr-only">(high availability)</span>
        <span className="text-green-700 text-xs" aria-hidden="true">✓</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"
        aria-hidden="true"
      />
      <span className="text-amber-800 font-medium">{band}%</span>
      <span className="sr-only">(limited availability)</span>
      <span className="text-amber-700 text-xs" aria-hidden="true">⚠</span>
    </span>
  );
}

function ScoreBreakdownPanel({ candidate }: { candidate: ScoredCandidate }) {
  const { breakdown } = candidate;

  const factors = [
    { label: 'Skill Match', value: breakdown.skillMatch, weight: '40%' },
    { label: 'Role Alignment', value: breakdown.roleAlignment, weight: '20%' },
    { label: 'Availability', value: breakdown.availability, weight: '25%' },
    { label: 'Workload', value: breakdown.workload, weight: '15%' },
  ];

  return (
    <div className="max-w-md">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        Score Breakdown for {candidate.name}
      </h4>
      <div className="space-y-2">
        {factors.map((factor) => (
          <div key={factor.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {factor.label}{' '}
              <span className="text-gray-400 text-xs">({factor.weight})</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, factor.value)}%` }}
                />
              </div>
              <span className="text-gray-800 font-medium w-10 text-right">
                {Math.round(factor.value)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-gray-700">Total Match Score</span>
          <span className="text-indigo-700">{candidate.matchScore}%</span>
        </div>
      </div>
    </div>
  );
}
