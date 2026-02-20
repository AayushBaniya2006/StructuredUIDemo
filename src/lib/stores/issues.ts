import { writable, derived } from 'svelte/store';
import type { Issue, IssueSeverity, IssueStatus, SeverityFilter, StatusFilter } from '$lib/types';
import issuesData from '$lib/data/issues.json';

function createIssuesStore() {
  const issues = writable<Issue[]>(issuesData as Issue[]);
  const selectedId = writable<string | null>(null);
  const hoveredId = writable<string | null>(null);
  const severityFilter = writable<SeverityFilter>('all');
  const statusFilter = writable<StatusFilter>('all');

  const filtered = derived(
    [issues, severityFilter, statusFilter],
    ([$issues, $severity, $status]) => {
      return $issues.filter((issue) => {
        if ($severity !== 'all' && issue.severity !== $severity) return false;
        if ($status !== 'all' && issue.status !== $status) return false;
        return true;
      });
    }
  );

  const selected = derived(
    [issues, selectedId],
    ([$issues, $id]) => $issues.find((i) => i.id === $id) ?? null
  );

  const issuesForPage = (page: number) =>
    derived(filtered, ($filtered) =>
      $filtered.filter((i) => i.page === page)
    );

  return {
    issues,
    selectedId,
    hoveredId,
    severityFilter,
    statusFilter,
    filtered,
    selected,
    issuesForPage,

    select: (id: string | null) => selectedId.set(id),
    hover: (id: string | null) => hoveredId.set(id),

    toggleStatus: (id: string) =>
      issues.update(($issues) =>
        $issues.map((i) =>
          i.id === id
            ? { ...i, status: i.status === 'open' ? 'resolved' : 'open' as IssueStatus }
            : i
        )
      ),

    selectNext: () => {
      let currentFiltered: Issue[] = [];
      let currentId: string | null = null;
      filtered.subscribe((v) => (currentFiltered = v))();
      selectedId.subscribe((v) => (currentId = v))();

      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const next = currentFiltered[(idx + 1) % currentFiltered.length];
      selectedId.set(next.id);
      return next;
    },

    selectPrev: () => {
      let currentFiltered: Issue[] = [];
      let currentId: string | null = null;
      filtered.subscribe((v) => (currentFiltered = v))();
      selectedId.subscribe((v) => (currentId = v))();

      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const prev = currentFiltered[(idx - 1 + currentFiltered.length) % currentFiltered.length];
      selectedId.set(prev.id);
      return prev;
    },

    setSeverityFilter: (f: SeverityFilter) => severityFilter.set(f),
    setStatusFilter: (f: StatusFilter) => statusFilter.set(f),
  };
}

export const issuesStore = createIssuesStore();
