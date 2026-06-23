import { describe, it, expect } from 'vitest';
import { scoreCandidate, rankCandidates } from '../../src/scoring/index.js';
import type { CandidateData, WorkRequestData } from '../../src/scoring/index.js';

/**
 * Unit tests for the scoring engine.
 *
 * Requirements validated: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

// Helper to create a valid candidate
function makeCandidate(overrides: Partial<CandidateData> = {}): CandidateData {
  return {
    id: 'candidate-1',
    name: 'Test Candidate',
    role: 'Engineer',
    skills: ['TypeScript', 'React', 'Node.js'],
    availabilityBand: 80,
    workloadIndicator: 2,
    ...overrides,
  };
}

// Helper to create a valid work request
function makeWorkRequest(overrides: Partial<WorkRequestData> = {}): WorkRequestData {
  return {
    id: 'wr-1',
    requiredSkills: ['TypeScript', 'React', 'Node.js'],
    requiredRoles: ['Engineer'],
    urgencyLevel: 'Medium',
    durationWeeks: 8,
    ...overrides,
  };
}

describe('scoreCandidate', () => {
  describe('concrete scoring examples', () => {
    it('should compute correct score for a full skill match with Medium urgency', () => {
      // skill_match = 3/3 = 1.0
      // role_alignment = 1.0 (Engineer matches)
      // availability = 80/100 = 0.8
      // workload = (5 - 2) / 5 = 0.6
      // urgency_multiplier = 1.0 (Medium)
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 0.8*1.0*0.25 + 0.6*0.15
      //             = 0.40 + 0.20 + 0.20 + 0.09 = 0.89
      // matchScore = Math.round(0.89 * 100) = 89
      const candidate = makeCandidate();
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(89);
    });

    it('should compute correct score for partial skill match', () => {
      // skill_match = 2/3 = 0.6667
      // role_alignment = 1.0
      // availability = 80/100 = 0.8
      // workload = (5 - 2) / 5 = 0.6
      // urgency_multiplier = 1.0 (Medium)
      // weighted_sum = 0.6667*0.40 + 1.0*0.20 + 0.8*1.0*0.25 + 0.6*0.15
      //             = 0.26668 + 0.20 + 0.20 + 0.09 = 0.75668
      // matchScore = Math.round(0.75668 * 100) = 76
      const candidate = makeCandidate({ skills: ['TypeScript', 'React'] });
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(76);
    });

    it('should apply 1.5x urgency multiplier for Critical urgency', () => {
      // skill_match = 3/3 = 1.0
      // role_alignment = 1.0
      // availability = 80/100 = 0.8
      // workload = (5 - 2) / 5 = 0.6
      // urgency_multiplier = 1.5 (Critical)
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 0.8*1.5*0.25 + 0.6*0.15
      //             = 0.40 + 0.20 + 0.30 + 0.09 = 0.99
      // matchScore = Math.round(0.99 * 100) = 99
      const candidate = makeCandidate();
      const workRequest = makeWorkRequest({ urgencyLevel: 'Critical' });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(99);
    });

    it('should apply 1.5x urgency multiplier for High urgency', () => {
      // Same candidate, High urgency — same multiplier as Critical
      const candidate = makeCandidate();
      const workRequest = makeWorkRequest({ urgencyLevel: 'High' });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(99);
    });

    it('should give 0 role_alignment when role does not match', () => {
      // skill_match = 3/3 = 1.0
      // role_alignment = 0.0 (Tester is not in required roles [Engineer])
      // availability = 80/100 = 0.8
      // workload = (5 - 2) / 5 = 0.6
      // urgency_multiplier = 1.0
      // weighted_sum = 1.0*0.40 + 0.0*0.20 + 0.8*1.0*0.25 + 0.6*0.15
      //             = 0.40 + 0.00 + 0.20 + 0.09 = 0.69
      // matchScore = Math.round(0.69 * 100) = 69
      const candidate = makeCandidate({ role: 'Tester' });
      const workRequest = makeWorkRequest({ requiredRoles: ['Engineer'] });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(69);
    });

    it('should return matched skills in the result', () => {
      const candidate = makeCandidate({ skills: ['TypeScript', 'React', 'Java'] });
      const workRequest = makeWorkRequest({ requiredSkills: ['TypeScript', 'React', 'Node.js'] });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchedSkills).toContain('TypeScript');
      expect(outcome.result!.matchedSkills).toContain('React');
      expect(outcome.result!.matchedSkills).not.toContain('Java');
      expect(outcome.result!.matchedSkills).not.toContain('Node.js');
    });

    it('should match skills case-insensitively', () => {
      const candidate = makeCandidate({ skills: ['typescript', 'REACT'] });
      const workRequest = makeWorkRequest({ requiredSkills: ['TypeScript', 'React', 'Node.js'] });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchedSkills.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should exclude candidates with zero skill match', () => {
      const candidate = makeCandidate({ skills: ['Java', 'Python'] });
      const workRequest = makeWorkRequest({ requiredSkills: ['TypeScript', 'React'] });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).toBeNull();
      expect(outcome.warning).not.toBeNull();
      expect(outcome.warning!.type).toBe('excluded');
      expect(outcome.warning!.reason).toContain('Zero overlapping skills');
    });

    it('should exclude candidates with missing required fields', () => {
      const candidate = {
        id: 'c-1',
        name: 'Broken',
        role: '',
        skills: ['TypeScript'],
        availabilityBand: 50,
        workloadIndicator: 2,
      } as CandidateData;

      const outcome = scoreCandidate(candidate, makeWorkRequest());
      expect(outcome.result).toBeNull();
      expect(outcome.warning).not.toBeNull();
      expect(outcome.warning!.type).toBe('excluded');
    });

    it('should handle candidate with missing skills array', () => {
      const candidate = {
        id: 'c-2',
        name: 'No Skills',
        role: 'Engineer',
        skills: null as unknown as string[],
        availabilityBand: 50,
        workloadIndicator: 2,
      } as CandidateData;

      const outcome = scoreCandidate(candidate, makeWorkRequest());
      expect(outcome.result).toBeNull();
      expect(outcome.warning).not.toBeNull();
    });
  });

  describe('boundary values per factor', () => {
    it('should score 0 workload factor when workloadIndicator is 5', () => {
      // workload = (5 - 5) / 5 = 0
      // skill_match = 1.0, role_alignment = 1.0, availability = 1.0 (100%)
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 1.0*1.0*0.25 + 0*0.15
      //             = 0.40 + 0.20 + 0.25 + 0 = 0.85
      // matchScore = 85
      const candidate = makeCandidate({
        skills: ['TypeScript', 'React', 'Node.js'],
        availabilityBand: 100,
        workloadIndicator: 5,
      });
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(85);
    });

    it('should cap workloadIndicator at 5 when it exceeds 5 (workload factor = 0)', () => {
      // workload = max(0, (5 - min(10, 5)) / 5) = max(0, 0/5) = 0
      // Same result as workloadIndicator = 5
      const candidate = makeCandidate({
        skills: ['TypeScript', 'React', 'Node.js'],
        availabilityBand: 100,
        workloadIndicator: 10,
      });
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(85);
    });

    it('should score maximum workload factor (1.0) when workloadIndicator is 0', () => {
      // workload = (5 - 0) / 5 = 1.0
      // skill_match = 1.0, role_alignment = 1.0, availability = 1.0 (100%)
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 1.0*1.0*0.25 + 1.0*0.15
      //             = 0.40 + 0.20 + 0.25 + 0.15 = 1.00
      // matchScore = 100
      const candidate = makeCandidate({
        skills: ['TypeScript', 'React', 'Node.js'],
        availabilityBand: 100,
        workloadIndicator: 0,
      });
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(100);
    });

    it('should score 0 availability factor when availabilityBand is 0', () => {
      // availability = 0/100 = 0
      // skill_match = 1.0, role_alignment = 1.0, workload = (5-2)/5 = 0.6
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 0*1.0*0.25 + 0.6*0.15
      //             = 0.40 + 0.20 + 0 + 0.09 = 0.69
      // matchScore = 69
      const candidate = makeCandidate({ availabilityBand: 0 });
      const workRequest = makeWorkRequest();

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(69);
    });

    it('should cap the final score at 100 when multiplier pushes sum above 1.0', () => {
      // skill_match = 1.0, role_alignment = 1.0, availability = 1.0 (100%), workload = 1.0 (0 workload)
      // urgency_multiplier = 1.5 (Critical)
      // weighted_sum = 1.0*0.40 + 1.0*0.20 + 1.0*1.5*0.25 + 1.0*0.15
      //             = 0.40 + 0.20 + 0.375 + 0.15 = 1.125
      // capped at 1.0 → matchScore = 100
      const candidate = makeCandidate({
        skills: ['TypeScript', 'React', 'Node.js'],
        availabilityBand: 100,
        workloadIndicator: 0,
      });
      const workRequest = makeWorkRequest({ urgencyLevel: 'Critical' });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(100);
    });

    it('should produce a low score for a minimally matching candidate', () => {
      // skill_match = 1/3 = 0.333
      // role_alignment = 0.0 (Tester vs Engineer)
      // availability = 20/100 = 0.2
      // workload = (5 - min(7,5)) / 5 = 0
      // urgency_multiplier = 1.0
      // weighted_sum = 0.333*0.40 + 0*0.20 + 0.2*1.0*0.25 + 0*0.15
      //             = 0.1333 + 0 + 0.05 + 0 = 0.1833
      // matchScore = Math.round(0.1833 * 100) = 18
      const candidate = makeCandidate({
        skills: ['TypeScript', 'Java'],
        role: 'Tester',
        availabilityBand: 20,
        workloadIndicator: 7,
      });
      const workRequest = makeWorkRequest({ requiredRoles: ['Engineer'] });

      const outcome = scoreCandidate(candidate, workRequest);
      expect(outcome.result).not.toBeNull();
      expect(outcome.result!.matchScore).toBe(18);
    });
  });
});

describe('rankCandidates', () => {
  describe('sorting correctness (Req 3.7)', () => {
    it('should sort candidates by matchScore descending', () => {
      const candidates: CandidateData[] = [
        makeCandidate({ id: 'c1', skills: ['TypeScript'], availabilityBand: 20, workloadIndicator: 5 }),
        makeCandidate({ id: 'c2', skills: ['TypeScript', 'React', 'Node.js'], availabilityBand: 100, workloadIndicator: 0 }),
        makeCandidate({ id: 'c3', skills: ['TypeScript', 'React'], availabilityBand: 60, workloadIndicator: 3 }),
      ];
      const workRequest = makeWorkRequest();

      const result = rankCandidates(candidates, workRequest);

      expect(result.results.length).toBe(3);
      expect(result.results[0].candidateId).toBe('c2');
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].matchScore).toBeGreaterThanOrEqual(result.results[i].matchScore);
      }
    });

    it('should use skillMatch as tiebreaker when scores are equal', () => {
      // Two candidates with the same total score but different skill_match values
      // c1: skills 2/4 match, role = 1, avail = 100, workload = 0, urgency Medium
      //   = 0.5*0.40 + 1.0*0.20 + 1.0*0.25 + 1.0*0.15 = 0.20 + 0.20 + 0.25 + 0.15 = 0.80
      // c2: skills 1/4 match, role = 1, avail = 100, workload = 0, urgency Medium
      //   = 0.25*0.40 + 1.0*0.20 + 1.0*0.25 + 1.0*0.15 = 0.10 + 0.20 + 0.25 + 0.15 = 0.70
      // These don't tie, so let me create a real tie scenario:
      // c1: skills 2/4=0.5, role=0, avail=50, workload=(5-3)/5=0.4
      //   = 0.5*0.40 + 0*0.20 + 0.5*0.25 + 0.4*0.15 = 0.20 + 0 + 0.125 + 0.06 = 0.385 → 39
      // c2: skills 1/4=0.25, role=1, avail=50, workload=(5-1)/5=0.8
      //   = 0.25*0.40 + 1*0.20 + 0.5*0.25 + 0.8*0.15 = 0.10 + 0.20 + 0.125 + 0.12 = 0.545 → 55
      // Still not tied. Let me just verify the tiebreaker works by checking sort stability:
      // Create candidates that have the same matchScore value.
      // Best approach: same total, different skill breakdown

      // A simpler approach — with 2 required skills:
      // c1: skills 2/2=1.0, role=0, avail=0, workload=(5-5)/5=0
      //   = 1.0*0.40 + 0*0.20 + 0*0.25 + 0*0.15 = 0.40 → 40
      // c2: skills 1/2=0.5, role=1, avail=0, workload=(5-5)/5=0
      //   = 0.5*0.40 + 1*0.20 + 0*0.25 + 0*0.15 = 0.20 + 0.20 = 0.40 → 40
      // Tied at 40! c1 has skill_match 1.0, c2 has skill_match 0.5 → c1 should come first
      const candidates: CandidateData[] = [
        makeCandidate({
          id: 'c2',
          name: 'C2',
          skills: ['TypeScript'],
          role: 'Engineer',
          availabilityBand: 0,
          workloadIndicator: 5,
        }),
        makeCandidate({
          id: 'c1',
          name: 'C1',
          skills: ['TypeScript', 'React'],
          role: 'Tester',
          availabilityBand: 0,
          workloadIndicator: 5,
        }),
      ];
      const workRequest = makeWorkRequest({
        requiredSkills: ['TypeScript', 'React'],
        requiredRoles: ['Engineer'],
      });

      const result = rankCandidates(candidates, workRequest);

      expect(result.results.length).toBe(2);
      expect(result.results[0].matchScore).toBe(result.results[1].matchScore);
      expect(result.results[0].candidateId).toBe('c1'); // higher skill_match
      expect(result.results[1].candidateId).toBe('c2');
    });
  });

  describe('empty pool and all excluded', () => {
    it('should return empty results for an empty candidate pool', () => {
      const result = rankCandidates([], makeWorkRequest());

      expect(result.results).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.totalCandidates).toBe(0);
      expect(result.qualifiedCount).toBe(0);
    });

    it('should return empty results when all candidates are excluded (zero skill match)', () => {
      const candidates: CandidateData[] = [
        makeCandidate({ id: 'c1', skills: ['Java', 'Python'] }),
        makeCandidate({ id: 'c2', skills: ['SQL', 'Docker'] }),
      ];
      const workRequest = makeWorkRequest({ requiredSkills: ['TypeScript', 'React'] });

      const result = rankCandidates(candidates, workRequest);

      expect(result.results).toEqual([]);
      expect(result.warnings.length).toBe(2);
      expect(result.totalCandidates).toBe(2);
      expect(result.qualifiedCount).toBe(0);
    });

    it('should exclude candidates with missing inputs and produce warnings', () => {
      const candidates: CandidateData[] = [
        {
          id: 'c1',
          name: '',
          role: 'Engineer',
          skills: ['TypeScript'],
          availabilityBand: 50,
          workloadIndicator: 2,
        } as CandidateData,
        makeCandidate({ id: 'c2', skills: ['TypeScript', 'React', 'Node.js'] }),
      ];
      const workRequest = makeWorkRequest();

      const result = rankCandidates(candidates, workRequest);

      expect(result.results.length).toBe(1);
      expect(result.results[0].candidateId).toBe('c2');
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].candidateId).toBe('c1');
    });
  });

  describe('max workload (Req 3.5)', () => {
    it('should yield 0 workload factor for workloadIndicator of 5 or above', () => {
      const candidates: CandidateData[] = [
        makeCandidate({ id: 'c1', skills: ['TypeScript', 'React', 'Node.js'], workloadIndicator: 5 }),
        makeCandidate({ id: 'c2', skills: ['TypeScript', 'React', 'Node.js'], workloadIndicator: 10 }),
      ];
      const workRequest = makeWorkRequest();

      const result = rankCandidates(candidates, workRequest);

      // Both should have the same score since workload > 5 is capped at 5
      expect(result.results[0].matchScore).toBe(result.results[1].matchScore);
      expect(result.results[0].breakdown.workload).toBe(0);
      expect(result.results[1].breakdown.workload).toBe(0);
    });
  });

  describe('ranking result metadata', () => {
    it('should include totalCandidates and qualifiedCount', () => {
      const candidates: CandidateData[] = [
        makeCandidate({ id: 'c1', skills: ['TypeScript'] }),
        makeCandidate({ id: 'c2', skills: ['Java'] }), // no match
        makeCandidate({ id: 'c3', skills: ['React', 'Node.js'] }),
      ];
      const workRequest = makeWorkRequest({ requiredSkills: ['TypeScript', 'React', 'Node.js'] });

      const result = rankCandidates(candidates, workRequest);

      expect(result.totalCandidates).toBe(3);
      expect(result.qualifiedCount).toBe(2); // c2 excluded
    });
  });
});
