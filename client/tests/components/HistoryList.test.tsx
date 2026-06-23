import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from '../../src/pages/HistoryPage';

/**
 * Component tests for the HistoryPage.
 *
 * Requirements validated: 5.1, 5.2, 5.4
 */

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function stubFetch(options: {
  listItems?: typeof mockWorkRequests;
  listError?: boolean;
  total?: number;
  pageSize?: number;
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
      const pageSize = options.pageSize ?? 10;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: items,
            total: options.total ?? items.length,
            page: 1,
            pageSize,
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
    mockNavigate.mockClear();
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

  // ── Navigation to detail page ───────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to /work-requests/:id when a work request is clicked', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Platform Migration' }));

      expect(mockNavigate).toHaveBeenCalledWith('/work-requests/wr-1');
    });

    it('navigates to correct id for different work requests', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Data Pipeline Build')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'View details for Data Pipeline Build' }));

      expect(mockNavigate).toHaveBeenCalledWith('/work-requests/wr-2');
    });

    it('does not show an inline detail panel or selection placeholder', async () => {
      vi.stubGlobal('fetch', stubFetch({}));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      expect(
        screen.queryByText('Select a work request to view its details.')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Work request detail' })
      ).not.toBeInTheDocument();
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('hides pagination controls when all results fit on one page', async () => {
      vi.stubGlobal('fetch', stubFetch({ total: 3, pageSize: 10 }));
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    it('shows pagination controls when there are multiple pages', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          if (url.startsWith('/api/work-requests?')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: mockWorkRequests,
                  total: 25,
                  page: 1,
                  pageSize: 10,
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

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
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
                total: 25,
                page: Number(page),
                pageSize: 10,
              }),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      vi.stubGlobal('fetch', fetchMock);
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      });

      // Verify the second fetch used page=2
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('page=2'))).toBe(true);
    });

    it('uses page size of 10', async () => {
      const fetchMock = vi.fn((url: string) => {
        if (url.startsWith('/api/work-requests?')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: mockWorkRequests,
                total: 3,
                page: 1,
                pageSize: 10,
              }),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      });

      vi.stubGlobal('fetch', fetchMock);
      renderHistoryPage();

      await waitFor(() => {
        expect(screen.getByText('Platform Migration')).toBeInTheDocument();
      });

      // Verify fetch was called with pageSize=10
      const calls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(calls.some((u) => u.includes('pageSize=10'))).toBe(true);
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
              pageSize: 10,
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
  });
});
