/**
 * Scoring engine for Squad Assembly.
 * Pure function module — no side effects, no database access.
 * Receives data as arguments and returns scored results.
 */

import type {
  CandidateData,
  RankingResult,
  ScoreBreakdown,
  ScoredResult,
  ValidationWarning,
  WorkRequestData,
} from './types.js';
import { validateCandidate } from './validation.js';

/**
 * Computes the skill match factor.
 * Ratio of candidate skills matching required skills to total required skills.
 * Case-insensitive comparison.
 */
function computeSkillMatch(candidateSkills: string[], requiredSkills: string[]): {
  factor: number;
  matchedSkills: string[];
} {
  if (requiredSkills.length === 0) {
    return { factor: 0, matchedSkills: [] };
  }

  const requiredLower = requiredSkills.map((s) => s.toLowerCase());
  const matchedSkills: string[] = [];

  for (const skill of candidateSkills) {
    if (requiredLower.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    }
  }

  const factor = matchedSkills.length / requiredSkills.length;
  return { factor, matchedSkills };
}

/**
 * Computes the role alignment factor.
 * Binary: 1.0 if candidate's role matches any required role (case-insensitive), 0.0 otherwise.
 */
function computeRoleAlignment(candidateRole: string, requiredRoles: string[]): number {
  const roleLower = candidateRole.toLowerCase();
  return requiredRoles.some((r) => r.toLowerCase() === roleLower) ? 1.0 : 0.0;
}

/**
 * Computes the availability factor.
 * Normalises the availability band (0-100) to 0-1 scale.
 */
function computeAvailability(availabilityBand: number): number {
  return availabilityBand / 100;
}

/**
 * Computes the workload factor.
 * Formula: max(0, (5 - min(workloadIndicator, 5)) / 5)
 * A workload indicator >= 5 yields 0, lower values yield higher scores.
 */
function computeWorkload(workloadIndicator: number): number {
  const capped = Math.min(workloadIndicator, 5);
  return Math.max(0, (5 - capped) / 5);
}

/**
 * Returns the urgency multiplier for the availability factor.
 * 1.5 for Critical or High, 1.0 for Medium or Low.
 */
function getUrgencyMultiplier(urgencyLevel: string): number {
  return urgencyLevel === 'Critical' || urgencyLevel === 'High' ? 1.5 : 1.0;
}

/**
 * Scores a single candidate against a work request.
 * Returns a ScoredResult or null (with a ValidationWarning) if the candidate should be excluded.
 */
export function scoreCandidate(
  candidate: CandidateData,
  workRequest: WorkRequestData,
): { result: ScoredResult; warning: null } | { result: null; warning: ValidationWarning } {
  // Validate candidate inputs
  const validationWarning = validateCandidate(candidate);
  if (validationWarning) {
    return { result: null, warning: validationWarning };
  }

  // Compute individual factors
  const { factor: skillMatchFactor, matchedSkills } = computeSkillMatch(
    candidate.skills,
    workRequest.requiredSkills,
  );

  // Exclude candidates with zero skill match
  if (skillMatchFactor === 0) {
    return {
      result: null,
      warning: {
        candidateId: candidate.id,
        reason: 'Zero overlapping skills with work request requirements',
        type: 'excluded',
      },
    };
  }

  const roleAlignmentFactor = computeRoleAlignment(candidate.role, workRequest.requiredRoles);
  const availabilityFactor = computeAvailability(candidate.availabilityBand);
  const workloadFactor = computeWorkload(candidate.workloadIndicator);
  const urgencyMultiplier = getUrgencyMultiplier(workRequest.urgencyLevel);

  // Weighted sum formula
  const weightedSum =
    skillMatchFactor * 0.4 +
    roleAlignmentFactor * 0.2 +
    availabilityFactor * urgencyMultiplier * 0.25 +
    workloadFactor * 0.15;

  // Cap at 1.0 and convert to integer 0-100
  const capped = Math.min(1.0, weightedSum);
  const matchScore = Math.round(capped * 100);

  const breakdown: ScoreBreakdown = {
    skillMatch: skillMatchFactor,
    roleAlignment: roleAlignmentFactor,
    availability: availabilityFactor,
    workload: workloadFactor,
  };

  const result: ScoredResult = {
    candidateId: candidate.id,
    name: candidate.name,
    role: candidate.role,
    matchScore,
    matchedSkills,
    availabilityBand: candidate.availabilityBand,
    workloadIndicator: candidate.workloadIndicator,
    breakdown,
  };

  return { result, warning: null };
}

/**
 * Ranks all candidates against a work request.
 * Excludes candidates with zero skill match or missing inputs.
 * Returns results sorted by matchScore descending, then skillMatch descending as tiebreaker.
 */
export function rankCandidates(
  candidates: CandidateData[],
  workRequest: WorkRequestData,
): RankingResult {
  const results: ScoredResult[] = [];
  const warnings: ValidationWarning[] = [];

  for (const candidate of candidates) {
    const outcome = scoreCandidate(candidate, workRequest);
    if (outcome.result) {
      results.push(outcome.result);
    } else {
      warnings.push(outcome.warning);
    }
  }

  // Sort by matchScore descending, then by skillMatch descending as tiebreaker
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return b.breakdown.skillMatch - a.breakdown.skillMatch;
  });

  return {
    results,
    warnings,
    totalCandidates: candidates.length,
    qualifiedCount: results.length,
  };
}
