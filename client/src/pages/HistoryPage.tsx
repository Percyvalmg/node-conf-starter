import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkRequests } from '../hooks/useWorkRequests';
import { WorkRequest, UrgencyLevel } from '../types';

// ── Urgency badge ────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
};

function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[level]}`}
    >
      {level}
    </span>
  );
}

// ── Squad status lozenge ─────────────────────────────────────────────────────

function SquadStatus({ assembled }: { assembled: boolean }) {
  if (assembled) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
        <span aria-hidden="true">✓</span> Assembled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      Pending
    </span>
  );
}

// ── Format date ──────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── HistoryList ───────────────────────────────────────────────────────────────

function HistoryList({
  items,
  onSelect,
}: {
  items: WorkRequest[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white" aria-label="Work request history">
      {items.map((wr) => (
        <li key={wr.id}>
          <button
            className="w-full text-left px-5 py-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
            onClick={() => onSelect(wr.id)}
            aria-label={`View details for ${wr.title}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{wr.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(wr.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <UrgencyBadge level={wr.urgencyLevel} />
                <SquadStatus assembled={wr.hasSquad ?? false} />
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between mt-4" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Previous page"
      >
        ← Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}

// ── HistoryPage (root export) ─────────────────────────────────────────────────

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, retry } = useWorkRequests(page, 10);
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    navigate(`/work-requests/${id}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Work Request History</h1>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 text-center text-gray-500" role="status" aria-live="polite">
          Loading history…
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={retry}
            className="mt-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.items.length === 0 && (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-8 text-center" role="status">
          <p className="text-gray-600 text-lg">No work requests yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Create your first work request to get started.
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {data.total} {data.total === 1 ? 'request' : 'requests'} total
          </p>
          <HistoryList
            items={data.items}
            onSelect={handleSelect}
          />
          <Pagination
            page={page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
