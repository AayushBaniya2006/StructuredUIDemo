import { writable, derived } from 'svelte/store';
import type { Issue, IssueStatus, SeverityFilter, StatusFilter, QACriterion } from '$lib/types';

function createIssuesStore() {
  const issues = writable<Issue[]>([]);
  const selectedId = writable<string | null>(null);
  const hoveredId = writable<string | null>(null);
  const severityFilter = writable<SeverityFilter>('all');
  const statusFilter = writable<StatusFilter>('all');

  const criteria = writable<QACriterion[]>([]);
  const analysisState = writable<{
    status: 'idle' | 'analyzing' | 'done' | 'error';
    currentPage: number;
    totalPages: number;
    error: string | null;
    emptyIssues: boolean;
  }>({ status: 'idle', currentPage: 0, totalPages: 0, error: null, emptyIssues: false });

  const complianceScore = derived(criteria, ($criteria) => {
    if ($criteria.length === 0) return 0;
    return Math.round(($criteria.filter((c) => c.result === 'pass').length / $criteria.length) * 100);
  });

  const criteriaForPage = (page: number) =>
    derived(criteria, ($criteria) => $criteria.filter((c) => c.page === page));

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
    criteria,
    analysisState,
    criteriaForPage,
    complianceScore,

    select: (id: string | null) => selectedId.set(id),
    // Force re-emission even if same ID (clears then re-sets to trigger subscribers)
    reselect: (id: string) => {
      selectedId.set(null);
      selectedId.set(id);
    },
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

    loadCriteria: (data: QACriterion[]) => criteria.set(data),

    setAnalysisState: (state: Partial<{
      status: 'idle' | 'analyzing' | 'done' | 'error';
      currentPage: number;
      totalPages: number;
      error: string | null;
      emptyIssues: boolean;
    }>) => analysisState.update((s) => ({ ...s, ...state })),

    loadIssues: (data: Issue[]) => {
      issues.set(data);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      criteria.set([]);
      analysisState.set({ status: 'idle', currentPage: 0, totalPages: 0, error: null, emptyIssues: false });
    },

    loadAnalysisResult: (result: { criteria: QACriterion[]; issues: Issue[]; metadata?: { emptyIssues: boolean } }) => {
      issues.set(result.issues);
      criteria.set(result.criteria);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      analysisState.set({
        status: 'done',
        currentPage: 0,
        totalPages: 0,
        error: null,
        emptyIssues: result.metadata?.emptyIssues ?? false,
      });
    },
    setSeverityFilter: (f: SeverityFilter) => severityFilter.set(f),
    setStatusFilter: (f: StatusFilter) => statusFilter.set(f),
    getSelectedIssue: (): Issue | null => {
      let selectedIssue: Issue | null = null;
      selected.subscribe((issue) => (selectedIssue = issue))();
      return selectedIssue;
    },
  };
}

export const issuesStore = createIssuesStore();
