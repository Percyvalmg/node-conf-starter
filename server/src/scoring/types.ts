/**
 * Scoring engine types for Squad Assembly.
 * These types represent the data shapes consumed and produced by the pure scoring functions.
 */

export interface CandidateData {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availabilityBand: number; // 0-100
  workloadIndicator: number; // 0-10
}

export interface WorkRequestData {
  id: string;
  requiredSkills: string[];
  requiredRoles: string[];
  urgencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  durationWeeks: number;
}

export interface ScoreBreakdown {
  skillMatch: number; // 0-1 factor value
  roleAlignment: number; // 0 or 1
  availability: number; // 0-1 normalised
  workload: number; // 0-1 factor value
}

export interface ScoredResult {
  candidateId: string;
  name: string;
  role: string;
  matchScore: number; // 0-100 integer
  matchedSkills: string[];
  availabilityBand: number;
  workloadIndicator: number;
  breakdown: ScoreBreakdown;
}

export interface ValidationWarning {
  candidateId: string;
  reason: string;
  type: 'excluded' | 'warning';
}

export interface RankingResult {
  results: ScoredResult[];
  warnings: ValidationWarning[];
  totalCandidates: number;
  qualifiedCount: number;
}
