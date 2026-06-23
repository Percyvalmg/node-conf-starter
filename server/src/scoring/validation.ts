/**
 * Validation utilities for the scoring engine.
 * Validates candidate and work request data before scoring.
 */

import type { CandidateData, ValidationWarning, WorkRequestData } from './types.js';

/**
 * Validates a candidate has all required scoring inputs.
 * Returns a ValidationWarning if the candidate should be excluded, or null if valid.
 */
export function validateCandidate(candidate: CandidateData): ValidationWarning | null {
  const missingFields: string[] = [];

  if (candidate.id == null || candidate.id === '') {
    missingFields.push('id');
  }
  if (candidate.name == null || candidate.name === '') {
    missingFields.push('name');
  }
  if (candidate.role == null || candidate.role === '') {
    missingFields.push('role');
  }
  if (!Array.isArray(candidate.skills)) {
    missingFields.push('skills');
  }
  if (candidate.availabilityBand == null || typeof candidate.availabilityBand !== 'number') {
    missingFields.push('availabilityBand');
  }
  if (candidate.workloadIndicator == null || typeof candidate.workloadIndicator !== 'number') {
    missingFields.push('workloadIndicator');
  }

  if (missingFields.length > 0) {
    return {
      candidateId: candidate.id ?? 'unknown',
      reason: `Missing required scoring inputs: ${missingFields.join(', ')}`,
      type: 'excluded',
    };
  }

  return null;
}

/**
 * Validates that a work request has the required fields for scoring.
 * Returns true if valid, false otherwise.
 */
export function validateWorkRequest(workRequest: WorkRequestData): boolean {
  if (!Array.isArray(workRequest.requiredSkills) || workRequest.requiredSkills.length === 0) {
    return false;
  }
  if (!Array.isArray(workRequest.requiredRoles) || workRequest.requiredRoles.length === 0) {
    return false;
  }
  if (!['Critical', 'High', 'Medium', 'Low'].includes(workRequest.urgencyLevel)) {
    return false;
  }
  return true;
}
