import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkRequestPage } from '../../src/pages/WorkRequestPage';

/**
 * Component tests for the WorkRequestForm/WorkRequestPage.
 *
 * Requirements validated: 1.1, 1.3, 1.6
 */

const mockSkills = ['TypeScript', 'React', 'Node.js', 'Python', 'AWS'];
const mockRoles = ['Engineer', 'Architect', 'Tester'];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function mockFetchResponses(overrides?: { workRequestResponse?: Response }) {
  const fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (url === '/api/skills') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ skills: mockSkills }),
      } as Response);
    }
    if (url === '/api/roles') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ roles: mockRoles }),
      } as Response);
    }
    if (url === '/api/work-requests' && options?.method === 'POST') {
      if (overrides?.workRequestResponse) {
        return Promise.resolve(overrides.workRequestResponse);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'wr-123',
            title: 'Test Title',
            description: 'Test Description',
            urgencyLevel: 'High',
            durationWeeks: 8,
            requiredSkills: ['TypeScript'],
            requiredRoles: ['Engineer'],
            createdAt: new Date().toISOString(),
          }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderWorkRequestPage() {
  return render(
    <MemoryRouter>
      <WorkRequestPage />
    </MemoryRouter>
  );
}

describe('WorkRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchResponses();
  });

  describe('form rendering', () => {
    it('should render the form with all required fields', async () => {
      renderWorkRequestPage();

      expect(await screen.findByRole('heading', { name: /create work request/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /available skills/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /available roles/i })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: /urgency level/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit work request/i })).toBeInTheDocument();
    });

    it('should display fetched skills as selectable options', async () => {
      renderWorkRequestPage();

      for (const skill of mockSkills) {
        expect(await screen.findByText(skill)).toBeInTheDocument();
      }
    });

    it('should display fetched roles as selectable options', async () => {
      renderWorkRequestPage();

      for (const role of mockRoles) {
        expect(await screen.findByText(role)).toBeInTheDocument();
      }
    });

    it('should not have any urgency level pre-selected', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript'); // wait for data load

      const radios = screen.getAllByRole('radio');
      for (const radio of radios) {
        expect(radio).not.toBeChecked();
      }
    });
  });

  describe('inline validation (Req 1.3)', () => {
    it('should show error when title is empty on submit', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    });

    it('should show error when no skills are selected', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      // Fill in title but leave skills empty
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      expect(await screen.findByText(/select at least 1 skill/i)).toBeInTheDocument();
    });

    it('should show error when no roles are selected', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });
      // Select a skill
      fireEvent.click(screen.getByText('TypeScript'));
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      expect(await screen.findByText(/select at least 1 role/i)).toBeInTheDocument();
    });

    it('should show error when urgency level is not selected', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('TypeScript'));
      fireEvent.click(screen.getByText('Engineer'));
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      expect(await screen.findByText(/select an urgency level/i)).toBeInTheDocument();
    });

    it('should show error when duration is missing', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('TypeScript'));
      fireEvent.click(screen.getByText('Engineer'));
      fireEvent.click(screen.getByLabelText('High'));
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      expect(await screen.findByText(/duration is required/i)).toBeInTheDocument();
    });
  });

  describe('data retention on error (Req 1.6)', () => {
    it('should retain form data when server returns an error', async () => {
      mockFetchResponses({
        workRequestResponse: {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed to save work request. Please try again.' }),
        } as Response,
      });

      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      // Fill the form
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Work Request' } });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Important work' },
      });
      fireEvent.click(screen.getByText('TypeScript'));
      fireEvent.click(screen.getByText('Engineer'));
      fireEvent.click(screen.getByLabelText('Critical'));
      fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: '12' } });

      // Submit and trigger error
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      // Wait for error message
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // Verify form data is retained
      expect(screen.getByLabelText(/title/i)).toHaveValue('My Work Request');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Important work');
      expect(screen.getByLabelText(/duration/i)).toHaveValue(12);
    });

    it('should retain form data when client-side validation fails', async () => {
      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      // Fill some fields but leave others empty
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Partial Entry' } });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Some description' },
      });
      fireEvent.click(screen.getByText('React'));

      // Submit (will fail validation since roles, urgency, duration are missing)
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      // Validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/select at least 1 role/i)).toBeInTheDocument();
      });

      // Form data should be retained
      expect(screen.getByLabelText(/title/i)).toHaveValue('Partial Entry');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Some description');
    });
  });

  describe('successful submission', () => {
    it('should navigate to shortlist on successful submission', async () => {
      mockFetchResponses();

      renderWorkRequestPage();

      await screen.findByText('TypeScript');

      // Fill valid form
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Valid Request' } });
      fireEvent.click(screen.getByText('TypeScript'));
      fireEvent.click(screen.getByText('Engineer'));
      fireEvent.click(screen.getByLabelText('High'));
      fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: '8' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /submit work request/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/work-requests/wr-123/shortlist');
      });
    });
  });
});
