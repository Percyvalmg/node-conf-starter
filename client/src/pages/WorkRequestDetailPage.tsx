import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShortlist } from '../hooks/useShortlist';
import { useSquadMutation } from '../hooks/useSquadMutation';
import { useWorkRequestDelete } from '../hooks/useWorkRequestDelete';
import { WorkRequest, ScoredCandidate } from '../types';

export function WorkRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: shortlistData, isLoading: shortlistLoading, error: shortlistError, retry: retryShortlist } = useShortlist(id);
  const { saveSquad, isSaving, error: squadError, clearError } = useSquadMutation(id);
  const { deleteRequest, isDeleting, error: deleteError } = useWorkRequestDelete();

  const [workRequest, setWorkRequest] = useState<WorkRequest | null>(null);
  const [wrLoading, setWrLoading] = useState(true);
  const [wrError, setWrError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const fetchWorkRequest = useCallback(async () => {
    if (!id) return;
    setWrLoading(true);
    setWrError(null);
    try {
      const response = await fetch(`/api/work-requests/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Work request not found');
        }
        throw new Error(`Failed to load work request: ${response.statusText}`);
      }
      const json: WorkRequest = await response.json();
      setWorkRequest(json);
    } catch (err) {
      setWrError(err instanceof Error ? err.message : 'Failed to load work request');
    } finally {
      setWrLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkRequest();
  }, [fetchWorkRequest]);

  // Pre-populate selected IDs from existing squad members
  useEffect(() => {
    if (workRequest?.squad?.members && workRequest.squad.members.length > 0) {
      const existingIds = new Set(workRequest.squad.members.map((m) => m.id));
      setSelectedIds(existingIds);
    }
  }, [workRequest]);

  const toggleCandidate = (candidateId: string) => {
    setSavedSuccessfully(false);
    clearError();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const candidates = shortlistData?.results ?? [];

  // Calculate combined skill coverage for selected candidates
  const skillCoverage = useMemo(() => {
    const requiredSkills = workRequest?.requiredSkills ?? [];
    if (requiredSkills.length === 0) return 0;
    const coveredSkills = new Set<string>();
    for (const candidate of candidates) {
      if (selectedIds.has(candidate.id)) {
        for (const skill of candidate.matchedSkills) {
          if (requiredSkills.includes(skill)) {
            coveredSkills.add(skill);
          }
        }
      }
    }
    return Math.round((coveredSkills.size / requiredSkills.length) * 100);
  }, [selectedIds, candidates, workRequest?.requiredSkills]);

  const handleConfirmSquad = async () => {
    const ids = Array.from(selectedIds);
    const result = await saveSquad(ids);
    if (result) {
      setSavedSuccessfully(true);
      // Refresh work request to update squad data
      fetchWorkRequest();
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this work request? This action cannot be undone.'
    );
    if (!confirmed) return;

    const success = await deleteRequest(id);
    if (success) {
      navigate('/history');
    }
  };

  // Loading state
  if (wrLoading || shortlistLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600" role="status" aria-live="polite">
          Loading work request...
        </div>
      </div>
    );
  }

  // Error state
  if (wrError) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <p className="text-red-800">{wrError}</p>
        <button
          onClick={fetchWorkRequest}
          className="mt-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workRequest) return null;

  return (
    <div>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/history')}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:underline"
        aria-label="Back to history"
      >
        ← Back to History
      </button>

      {/* Work Request Metadata */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workRequest.title}</h1>
            <p className="mt-2 text-gray-600">{workRequest.description}</p>
          </div>
          <UrgencyBadge level={workRequest.urgencyLevel} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetadataItem label="Duration" value={`${workRequest.durationWeeks} weeks`} />
          <MetadataItem label="Created" value={new Date(workRequest.createdAt).toLocaleDateString()} />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Required Skills</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {workRequest.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Required Roles</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {workRequest.requiredRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete action */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : 'Delete Work Request'}
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3" role="alert">
          <p className="text-sm text-red-800">{deleteError}</p>
        </div>
      )}

      {/* Shortlist section */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidate Shortlist</h2>

        {shortlistError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4">
            <p className="text-red-800">{shortlistError}</p>
            <button
              onClick={retryShortlist}
              className="mt-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {!shortlistError && candidates.length === 0 && (
          <div className="rounded-md bg-gray-50 border border-gray-200 p-8 text-center">
            <p className="text-gray-600 text-lg">No candidates qualify for this work request.</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting the required skills or roles to broaden the search.
            </p>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            {/* Summary bar */}
            {selectedIds.size > 0 && (
              <div className="mb-4 rounded-md bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {selectedIds.size} {selectedIds.size === 1 ? 'candidate' : 'candidates'} selected
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Skill coverage:{' '}
                      <span className={`font-semibold ${skillCoverage === 100 ? 'text-green-700' : 'text-indigo-700'}`}>
                        {skillCoverage}%
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmSquad}
                    disabled={isSaving}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    aria-label="Confirm squad selection"
                  >
                    {isSaving ? 'Saving...' : 'Confirm Squad'}
                  </button>
                </div>
              </div>
            )}

            {/* Squad error */}
            {squadError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3" role="alert">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-800">{squadError}</p>
                  <button
                    onClick={handleConfirmSquad}
                    className="ml-4 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Success message */}
            {savedSuccessfully && (
              <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3" role="status">
                <p className="text-sm text-green-800">
                  Squad saved successfully! Skill coverage: {skillCoverage}%
                </p>
              </div>
            )}

            {/* Unified shortlist table with checkboxes */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Candidate shortlist with squad selection">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
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
                      isSelected={selectedIds.has(candidate.id)}
                      onToggle={() => toggleCandidate(candidate.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function UrgencyBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
  };
  const colorClass = colorMap[level] ?? 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
      {level}
    </span>
  );
}

function CandidateRow({
  candidate,
  rank,
  isSelected,
  onToggle,
}: {
  candidate: ScoredCandidate;
  rank: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isHighAvailability = candidate.availabilityBand >= 70;

  return (
    <>
      <tr
        className={`cursor-pointer ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${candidate.name}`}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
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
          <AvailabilityIndicator band={candidate.availabilityBand} isHigh={isHighAvailability} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {candidate.workloadIndicator}/10
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
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
          <td colSpan={9} className="px-4 py-3 bg-gray-50">
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
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden="true" />
        <span className="text-green-800 font-medium">{band}%</span>
        <span className="sr-only">(high availability)</span>
        <span className="text-green-700 text-xs" aria-hidden="true">✓</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
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
