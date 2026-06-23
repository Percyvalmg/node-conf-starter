import { useState } from 'react';
import { useWorkRequests, useWorkRequestDetail } from '../hooks/useWorkRequests';
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

// ── WorkRequestDetail panel ──────────────────────────────────────────────────

function WorkRequestDetail({
  workRequestId,
  onClose,
}: {
  workRequestId: string;
  onClose: () => void;
}) {
  const { data, isLoading, error, retry } = useWorkRequestDetail(workRequestId);

  return (
    <section
      aria-label="Work request detail"
      className="border border-gray-200 rounded-lg bg-white shadow-sm p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Work Request Detail</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          aria-label="Close detail panel"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
      </div>

      {isLoading && (
        <div className="py-8 text-center text-gray-500" role="status" aria-live="polite">
          Loading…
        </div>
      )}

      {error && (
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

      {data && !isLoading && (
        <div className="space-y-4">
          {/* Header info */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{data.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <UrgencyBadge level={data.urgencyLevel} />
              <span className="text-sm text-gray-500">{data.durationWeeks} weeks</span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500">Created {formatDate(data.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{data.description}</p>
            </div>
          )}

          {/* Required skills */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Required Skills</p>
            <div className="flex flex-wrap gap-1">
              {data.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Required roles */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Required Roles</p>
            <div className="flex flex-wrap gap-1">
              {data.requiredRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Assembled squad */}
          {data.squad ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-gray-700">Assembled Squad</p>
                <span className="text-xs text-gray-500">
                  — {data.squad.skillCoveragePercent}% skill coverage
                </span>
              </div>
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden" aria-label="Squad members">
                {data.squad.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between px-4 py-2 bg-white hover:bg-gray-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{member.name}</span>
                    <span className="text-gray-500">{member.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">No squad assembled yet for this request.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── HistoryList ───────────────────────────────────────────────────────────────

function HistoryList({
  items,
  selectedId,
  onSelect,
}: {
  items: WorkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white" aria-label="Work request history">
      {items.map((wr) => (
        <li key={wr.id}>
          <button
            className={`w-full text-left px-5 py-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors ${
              selectedId === wr.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
            }`}
            onClick={() => onSelect(wr.id)}
            aria-pressed={selectedId === wr.id}
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, error, retry } = useWorkRequests(page, 50);

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedId(null);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* List column */}
          <div>
            <p className="text-sm text-gray-500 mb-3">
              {data.total} {data.total === 1 ? 'request' : 'requests'} total
            </p>
            <HistoryList
              items={data.items}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            />
          </div>

          {/* Detail column */}
          <div>
            {selectedId ? (
              <WorkRequestDetail
                workRequestId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-6 text-center text-gray-500 text-sm">
                Select a work request to view its details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
