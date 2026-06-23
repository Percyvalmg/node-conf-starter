import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SquadPanel } from '../../src/components/SquadPanel';
import { ScoredCandidate } from '../../src/types';

/**
 * Component tests for the SquadPanel.
 *
 * Requirements validated: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

const mockCandidates: ScoredCandidate[] = [
  {
    id: 'c1',
    name: 'Alice Engineer',
    role: 'Engineer',
    matchScore: 95,
    matchedSkills: ['TypeScript', 'React'],
    availabilityBand: 80,
    workloadIndicator: 2,
    breakdown: { skillMatch: 100, roleAlignment: 100, availability: 80, workload: 60 },
  },
  {
    id: 'c2',
    name: 'Bob Architect',
    role: 'Architect',
    matchScore: 82,
    matchedSkills: ['TypeScript', 'Node.js'],
    availabilityBand: 70,
    workloadIndicator: 3,
    breakdown: { skillMatch: 67, roleAlignment: 50, availability: 70, workload: 40 },
  },
  {
    id: 'c3',
    name: 'Carol Tester',
    role: 'Tester',
    matchScore: 60,
    matchedSkills: ['Node.js'],
    availabilityBand: 90,
    workloadIndicator: 1,
    breakdown: { skillMatch: 33, roleAlignment: 0, availability: 90, workload: 80 },
  },
];

const requiredSkills = ['TypeScript', 'React', 'Node.js'];

function mockFetch(options?: { saveSuccess?: boolean; saveError?: string }) {
  return vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && url.includes('/squad')) {
      if (options?.saveSuccess === false) {
        return Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: options.saveError ?? 'Server error' }),
        } as Response);
      }
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'squad-1',
            workRequestId: 'wr-1',
            skillCoveragePercent: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            members: body.candidateIds.map((id: string) => {
              const c = mockCandidates.find((mc) => mc.id === id);
              return { id, name: c?.name ?? 'Unknown', role: c?.role ?? 'Unknown' };
            }),
          }),
      } as Response);
    }
    // Default fallback
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

describe('SquadPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the selection table with all candidates', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      expect(screen.getByText('Assemble Squad')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Alice Engineer')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Bob Architect')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Carol Tester')).toBeInTheDocument();
    });

    it('should show 0 candidates selected initially', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      expect(screen.getByText('0 candidates selected')).toBeInTheDocument();
    });

    it('should show validation message when zero candidates selected', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      expect(
        screen.getByText('Select at least one candidate to assemble a squad.')
      ).toBeInTheDocument();
    });

    it('should disable Confirm button when zero candidates selected', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      const button = screen.getByRole('button', { name: /confirm squad/i });
      expect(button).toBeDisabled();
    });
  });

  describe('selection logic', () => {
    it('should toggle candidate selection via checkbox', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      const checkbox = screen.getByLabelText('Select Alice Engineer');
      fireEvent.click(checkbox);

      expect(screen.getByText('1 candidate selected')).toBeInTheDocument();

      // Deselect
      fireEvent.click(checkbox);
      expect(screen.getByText('0 candidates selected')).toBeInTheDocument();
    });

    it('should update skill coverage when candidates are selected', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      // Select Alice (TypeScript, React) - covers 2/3 = 67%
      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));
      expect(screen.getByText('67%')).toBeInTheDocument();

      // Select Bob (TypeScript, Node.js) - covers 3/3 = 100%
      fireEvent.click(screen.getByLabelText('Select Bob Architect'));
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should enable Confirm button when at least one candidate selected', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));

      const button = screen.getByRole('button', { name: /confirm squad/i });
      expect(button).not.toBeDisabled();
    });

    it('should show selected members in the summary area', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));

      expect(screen.getByText('Selected Members')).toBeInTheDocument();
      // The remove button in the selected members area confirms the candidate is shown there
      expect(screen.getByLabelText('Remove Alice Engineer from squad')).toBeInTheDocument();
    });

    it('should pre-check existing squad members on load', () => {
      vi.stubGlobal('fetch', mockFetch());
      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
          existingSquadMembers={[
            { id: 'c1', name: 'Alice Engineer', role: 'Engineer' },
            { id: 'c3', name: 'Carol Tester', role: 'Tester' },
          ]}
        />
      );

      expect(screen.getByText('2 candidates selected')).toBeInTheDocument();
      const aliceCheckbox = screen.getByLabelText('Select Alice Engineer') as HTMLInputElement;
      expect(aliceCheckbox.checked).toBe(true);
      const carolCheckbox = screen.getByLabelText('Select Carol Tester') as HTMLInputElement;
      expect(carolCheckbox.checked).toBe(true);
    });
  });

  describe('save and error handling', () => {
    it('should save the squad successfully and show success message', async () => {
      const fetchMock = mockFetch();
      vi.stubGlobal('fetch', fetchMock);
      const onSaved = vi.fn();

      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
          onSquadSaved={onSaved}
        />
      );

      // Select candidates
      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));
      fireEvent.click(screen.getByLabelText('Select Bob Architect'));

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /confirm squad/i }));

      await waitFor(() => {
        expect(screen.getByText(/squad saved successfully/i)).toBeInTheDocument();
      });

      expect(onSaved).toHaveBeenCalledWith(100);

      // Verify fetch was called with correct candidate IDs
      const postCall = fetchMock.mock.calls.find(
        (call) => call[1]?.method === 'POST' && call[0].includes('/squad')
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1]!.body as string);
      expect(body.candidateIds).toContain('c1');
      expect(body.candidateIds).toContain('c2');
    });

    it('should show error and retain selection on save failure', async () => {
      vi.stubGlobal('fetch', mockFetch({ saveSuccess: false, saveError: 'Database error' }));

      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      // Select a candidate
      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /confirm squad/i }));

      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument();
      });

      // Selection should be retained
      const checkbox = screen.getByLabelText('Select Alice Engineer') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(screen.getByText('1 candidate selected')).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      vi.stubGlobal('fetch', mockFetch({ saveSuccess: false }));

      render(
        <SquadPanel
          workRequestId="wr-1"
          candidates={mockCandidates}
          requiredSkills={requiredSkills}
        />
      );

      fireEvent.click(screen.getByLabelText('Select Alice Engineer'));
      fireEvent.click(screen.getByRole('button', { name: /confirm squad/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});
