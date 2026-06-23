/** Shared TypeScript interfaces matching server API types */

export type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';

/** POST /api/work-requests request body */
export interface WorkRequestInput {
  title: string;
  description: string;
  requiredSkills: string[];
  requiredRoles: string[];
  urgencyLevel: UrgencyLevel;
  durationWeeks: number;
}

/** Work request as returned from the API */
export interface WorkRequest {
  id: string;
  title: string;
  description: string;
  urgencyLevel: UrgencyLevel;
  durationWeeks: number;
  createdAt: string;
  requiredSkills: string[];
  requiredRoles: string[];
  /** Present on list responses only — true when a squad has been saved */
  hasSquad?: boolean;
  squad?: SquadSummary;
}

/** Score breakdown per candidate */
export interface ScoreBreakdown {
  skillMatch: number;
  roleAlignment: number;
  availability: number;
  workload: number;
}

/** Scored candidate in the shortlist */
export interface ScoredCandidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  matchedSkills: string[];
  availabilityBand: number;
  workloadIndicator: number;
  breakdown: ScoreBreakdown;
}

/** Squad summary returned after saving */
export interface SquadSummary {
  id: string;
  workRequestId?: string;
  skillCoveragePercent: number;
  createdAt?: string;
  updatedAt?: string;
  members: SquadMember[];
}

export interface SquadMember {
  id: string;
  name: string;
  role: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Shared hook return type for API fetching */
export interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}
