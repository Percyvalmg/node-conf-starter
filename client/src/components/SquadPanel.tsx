import { useState, useEffect, useMemo } from 'react';
import { ScoredCandidate, SquadMember } from '../types';
import { useSquadMutation } from '../hooks/useSquadMutation';

interface SquadPanelProps {
  workRequestId: string;
  candidates: ScoredCandidate[];
  requiredSkills: string[];
  existingSquadMembers?: SquadMember[];
  onSquadSaved?: (skillCoveragePercent: number) => void;
}

export function SquadPanel({
  workRequestId,
  candidates,
  requiredSkills,
  existingSquadMembers,
  onSquadSaved,
}: SquadPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const { saveSquad, isSaving, error, clearError } = useSquadMutation(workRequestId);

  // Pre-check existing squad members on load
  useEffect(() => {
    if (existingSquadMembers && existingSquadMembers.length > 0) {
      const existingIds = new Set(existingSquadMembers.map((m) => m.id));
      setSelectedIds(existingIds);
    }
  }, [existingSquadMembers]);

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

  // Calculate combined skill coverage for selected candidates
  const skillCoverage = useMemo(() => {
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
  }, [selectedIds, candidates, requiredSkills]);

  const selectedCandidates = candidates.filter((c) => selectedIds.has(c.id));

  const handleConfirm = async () => {
    const ids = Array.from(selectedIds);
    const result = await saveSquad(ids);
    if (result) {
      setSavedSuccessfully(true);
      onSquadSaved?.(result.skillCoveragePercent);
    }
    // On failure, selection is retained (error state shown via toast)
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Assemble Squad</h2>

      {/* Selection summary */}
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
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || isSaving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            aria-label="Confirm squad selection"
          >
            {isSaving ? 'Saving...' : 'Confirm Squad'}
          </button>
        </div>

        {selectedIds.size === 0 && (
          <p className="mt-2 text-sm text-amber-700" role="alert">
            Select at least one candidate to assemble a squad.
          </p>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3" role="alert">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleConfirm}
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

      {/* Selected candidates list */}
      {selectedCandidates.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Members</h3>
          <div className="flex flex-wrap gap-2">
            {selectedCandidates.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800"
              >
                {c.name}
                <span className="text-indigo-500 text-xs">({c.role})</span>
                <button
                  onClick={() => toggleCandidate(c.id)}
                  className="ml-1 text-indigo-400 hover:text-indigo-700 focus:outline-none"
                  aria-label={`Remove ${c.name} from squad`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selection table with checkboxes */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" aria-label="Select squad members">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Select
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
                Skills
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <tr
                key={candidate.id}
                className={`cursor-pointer ${selectedIds.has(candidate.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                onClick={() => toggleCandidate(candidate.id)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.id)}
                    onChange={() => toggleCandidate(candidate.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${candidate.name}`}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
