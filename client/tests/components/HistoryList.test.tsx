import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from '../../src/pages/HistoryPage';

/**
 * Component tests for the HistoryPage (HistoryList + WorkRequestDetail).
 *
 * Requirements validated: 6.1, 6.2, 6.4, 6.5
 */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeWorkRequest = (
  overrides: Partial<{
    id: string;
    title: string;
    urgencyLevel: string;
    hasSquad: boolean;
    createdAt: string;
  }> = {}
) => ({
  id: overrides.id ?? 'wr-1',
  title: overrides.title ?? 'Platform Migration',
  description: 'Migrate services to cloud',
  urgencyLevel: overrides.urgencyLevel ?? 'High',
  durationWeeks: 12,
  requiredSkills: ['TypeScript', 'React'],
  requiredRoles: ['Engineer', 'Architect'],
  createdAt: overrides.createdAt ?? '2026-06-01T10:00:00.000Z',
  hasSquad: overrides.hasSquad ?? false,
});

const mockWorkRequests = [
  makeWorkRequest({ id: 'wr-1', title: 'Platform Migration', hasSquad: true, urgencyLevel: 'High' }),
  makeWorkRequest({ id: 'wr-2', title: 'Data Pipeline Build', hasSquad: false, urgencyLevel: 'Medium' }),
  makeWorkRequest({ id: 'wr-3', title: 'Security Audit', hasSquad: false, urgencyLevel: 'Critical' }),
];

const mockDetailWithSquad = {
  ...makeWorkRequest({ id: 'wr-1', title: 'Platform Migration', hasSquad: true }),
  squad: {
    id: 'squad-1',
    skillCoveragePercent: 100,
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
    members: [
      { id: 'c1', name: 'Alice Engineer', role: 'Engineer' },
      { id: 'c2', name: 'Bob Architect', role: 'Architect' },
    ],
  },
};

const mockDetailNoSquad = {
  ...makeWorkRequest({ id: 'wr-2', title: 'Data Pipeline Build' }),
  squad: undefined,
};

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function stubFetch(options: {
  listItems?: typeof mockWorkRequests;
  listError?: boolean;
  total?: number;
  detailMap?: Record<string, unknown>;
  detailError?: boolean;
}) {
  return vi.fn((url: string) => {
    // List endpoint
    if (url.startsWith('/api/work-requests?')) {
      if (options.listError) {
        return Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response);
      }
      const items = options.listItems ?? mockWorkRequests;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: items,
            total: options.total ?? items.length,
            page: 1,
            pageSize: 50,
          }),
      } as Response);
    }

    // Detail endpoint — match /api/work-requests/:id (not shortlist/squad)
    const detailMatch = url.match(/^\/api\/work-requests\/([^/]+)$/);
    if (detailMatch) {
      const id = detailMatch[1];
      if (options.detailError) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response);
      }
      const detail = options.detailMap?.[id];
      if (!detail) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ error: 'Not found' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(detail),
      } as Response);
    }

    // Default fallback
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

function renderHistoryPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty state message when no work requests exist', async () => {
      vi.stubGlobal('fetch', stubFetch({ listItems: [], total: 0 }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('No work requests yet.')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Create your first work request to get started.')
      ).toBeInTheDocument();
    });
  });

  // ── List rendering ──────────────────────────────────────────────────────────

  describe('list rendering', () => {
    it('renders a list of work requests with titles', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });
      expect(screen.getByText('Data Pipeline Build')).toBeInTheDocument();
      expect(screen.getByText('Security Audit')).toBeInTheDocument();
    });

    it('displays urgency badges for each work request', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument();
      });
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('shows "Assembled" status for requests with a squad and "Pending" for those without', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Assembled')).toBeInTheDocument();
      });
      // Two requests without a squad = two "Pending" lozenges
      const pendingItems = screen.getAllByText('Pending');
      expect(pendingItems).toHaveLength(2);
    });

    it('shows total request count', async () => {
      vi.stubGlobal('fetch', stubFetch({ total: 3 }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('3 requests total')).toBeInTheDocument();
      });
    });

    it('shows singular "request" when total is 1', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ listItems: [mockWorkRequests[0]], total: 1 })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('1 request total')).toBeInTheDocument();
      });
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('hides pagination controls when all results fit on one page', async () => {
      vi.stubGlobal('fetch', stubFetch({ total: 3 }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    it('shows pagination controls when there are multiple pages', async () => {
      // Simulate 60 total items but only 3 returned (pageSize=50 → 2 pages)
      vi.stubGlobal('fetch', stubFetch({ total: 60 }));

      // Override to return a pageSize of 50 so totalPages = ceil(60/50) = 2
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          if (url.startsWith('/api/work-requests?')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: mockWorkRequests,
                  total: 60,
                  page: 1,
                  pageSize: 50,
                }),
            } as Response);
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
        })
      );

      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
      });

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();
    });

    it('navigates to the next page when Next is clicked', async () => {
      const fetchMock = vi.fn((url: string) => {
        if (url.startsWith('/api/work-requests?')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const page = params.get('page') ?? '1';
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: mockWorkRequests,
                total: 60,
                page: Number(page),
                pageSize: 50,
              }),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      vi.stubGlobal('fetch', fetchMock);
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });

      // Verify the second fetch used page=2
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('page=2'))).toBe(true);
    });
  });

  // ── Detail view ─────────────────────────────────────────────────────────────

  describe('detail view', () => {
    it('shows placeholder text before any item is selected', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Select a work request to view its details.')
      ).toBeInTheDocument();
    });

    it('opens detail panel when a list item is clicked', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ detailMap: { 'wr-1': mockDetailWithSquad } })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Platform Migration' }));

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Work request detail' })).toBeInTheDocument();
      });
    });

    it('displays squad member names and roles when a squad is assembled', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ detailMap: { 'wr-1': mockDetailWithSquad } })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Platform Migration' }));

      await waitFor(() => {
        expect(screen.getByText('Alice Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob Architect')).toBeInTheDocument();
      // Both role names appear in the member list
      const engineerCells = screen.getAllByText('Engineer');
      expect(engineerCells.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "no squad assembled" message when detail has no squad', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ detailMap: { 'wr-2': mockDetailNoSquad } })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Data Pipeline Build')).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'View details for Data Pipeline Build' })
      );

      await waitFor(() => {
        expect(
          screen.getByText('No squad assembled yet for this request.')
        ).toBeInTheDocument();
      });
    });

    it('closes the detail panel when the close button is clicked', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ detailMap: { 'wr-1': mockDetailWithSquad } })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Platform Migration' }));

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Work request detail' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Close detail panel' }));

      expect(
        screen.queryByRole('region', { name: 'Work request detail' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Select a work request to view its details.')
      ).toBeInTheDocument();
    });

    it('toggles detail closed when the same list item is clicked again', async () => {
      vi.stubGlobal(
        'fetch',
        stubFetch({ detailMap: { 'wr-1': mockDetailWithSquad } })
      );
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: 'View details for Platform Migration' });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Work request detail' })).toBeInTheDocument();
      });

      fireEvent.click(btn);

      expect(
        screen.queryByRole('region', { name: 'Work request detail' })
      ).not.toBeInTheDocument();
    });
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows an error message when the list fetch fails', async () => {
      vi.stubGlobal('fetch', stubFetch({ listError: true }));
      renderHistoryPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to fetch work requests/i)
        ).toBeInTheDocument();
      });
    });

    it('shows a Retry button on list fetch failure', async () => {
      vi.stubGlobal('fetch', stubFetch({ listError: true }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries the list fetch when Retry is clicked', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockWorkRequests,
              total: 3,
              page: 1,
              pageSize: 50,
            }),
        } as Response);

      vi.stubGlobal('fetch', fetchMock);
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });
    });

    it('shows an error in the detail panel when detail fetch fails', async () => {
      vi.stubGlobal('fetch', stubFetch({ detailError: true }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Platform Migration' }));

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Work request detail' })).toBeInTheDocument();
      });

      await waitFor(() => {
        // Detail panel shows a Retry button when its fetch fails
        expect(
          screen.getAllByRole('button', { name: /retry/i }).length
        ).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
