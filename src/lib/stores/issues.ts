import { writable, derived, get } from 'svelte/store';
import type { Issue, IssueStatus, SeverityFilter, StatusFilter, QACriterion, SheetType } from '$lib/types';

type AnalysisStateType = {
  status: 'idle' | 'analyzing' | 'done' | 'error';
  currentPage: number;
  totalPages: number;
  analyzedPages: number;
  error: string | null;
  emptyIssues: boolean;
};

function createIssuesStore() {
  const issues = writable<Issue[]>([]);
  const selectedId = writable<string | null>(null);
  const hoveredId = writable<string | null>(null);
  const severityFilter = writable<SeverityFilter>('all');
  const statusFilter = writable<StatusFilter>('all');
  const confidenceFilter = writable<number>(0); // 0 = show all; >0 = minimum threshold
  const criteria = writable<QACriterion[]>([]);
  const analysisState = writable<AnalysisStateType>({
    status: 'idle',
    currentPage: 0,
    totalPages: 0,
    analyzedPages: 0,
    error: null,
    emptyIssues: false,
  });

  const complianceScore = derived(criteria, ($criteria) => {
    if ($criteria.length === 0) return 0;
    return Math.round(
      ($criteria.filter((c) => c.result === 'pass').length / $criteria.length) * 100
    );
  });

  const criteriaForPage = (page: number) =>
    derived(criteria, ($criteria) => $criteria.filter((c) => c.page === page));

  const filtered = derived(
    [issues, severityFilter, statusFilter, confidenceFilter],
    ([$issues, $severity, $status, $confidence]) => {
      return $issues.filter((issue) => {
        if ($severity !== 'all' && issue.severity !== $severity) return false;
        if ($status !== 'all' && issue.status !== $status) return false;
        // Issues with no confidence score are always shown
        if ($confidence > 0 && issue.confidence !== undefined && issue.confidence < $confidence)
          return false;
        return true;
      });
    }
  );

  const selected = derived(
    [issues, selectedId],
    ([$issues, $id]) => $issues.find((i) => i.id === $id) ?? null
  );

  const issuesForPage = (page: number) =>
    derived(filtered, ($filtered) => $filtered.filter((i) => i.page === page));

  return {
    issues,
    selectedId,
    hoveredId,
    severityFilter,
    statusFilter,
    confidenceFilter,
    filtered,
    selected,
    issuesForPage,
    criteria,
    analysisState,
    criteriaForPage,
    complianceScore,

    select: (id: string | null) => selectedId.set(id),
    reselect: (id: string) => {
      selectedId.set(null);
      selectedId.set(id);
    },
    hover: (id: string | null) => hoveredId.set(id),

    toggleStatus: (id: string) =>
      issues.update(($issues) =>
        $issues.map((i) =>
          i.id === id
            ? { ...i, status: i.status === 'open' ? 'resolved' : ('open' as IssueStatus) }
            : i
        )
      ),

    selectNext: () => {
      const currentFiltered = get(filtered);
      const currentId = get(selectedId);
      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const next = currentFiltered[(idx + 1) % currentFiltered.length];
      selectedId.set(next.id);
      return next;
    },

    selectPrev: () => {
      const currentFiltered = get(filtered);
      const currentId = get(selectedId);
      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const prev = currentFiltered[(idx - 1 + currentFiltered.length) % currentFiltered.length];
      selectedId.set(prev.id);
      return prev;
    },

    /** Append issues without resetting selection/filters — used by streaming */
    appendIssues: (newIssues: Issue[]) =>
      issues.update(($issues) => [...$issues, ...newIssues]),

    /** Append criteria without resetting — used by streaming */
    appendCriteria: (newCriteria: QACriterion[]) =>
      criteria.update(($criteria) => [...$criteria, ...newCriteria]),

    setAnalysisState: (
      state: Partial<AnalysisStateType> | ((prev: AnalysisStateType) => Partial<AnalysisStateType>)
    ) =>
      analysisState.update((s) => ({
        ...s,
        ...(typeof state === 'function' ? state(s) : state),
      })),

    loadIssues: (data: Issue[]) => {
      issues.set(data);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      confidenceFilter.set(0);
      criteria.set([]);
      analysisState.set({
        status: 'idle',
        currentPage: 0,
        totalPages: 0,
        analyzedPages: 0,
        error: null,
        emptyIssues: false,
      });
    },

    loadAnalysisResult: (result: {
      criteria: QACriterion[];
      issues: Issue[];
      metadata?: { emptyIssues: boolean };
    }) => {
      issues.set(result.issues);
      criteria.set(result.criteria);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      confidenceFilter.set(0);
      analysisState.set({
        status: 'done',
        currentPage: 0,
        totalPages: 0,
        analyzedPages: 0,
        error: null,
        emptyIssues: result.metadata?.emptyIssues ?? false,
      });
    },

    setSeverityFilter: (f: SeverityFilter) => severityFilter.set(f),
    setStatusFilter: (f: StatusFilter) => statusFilter.set(f),
    setConfidenceFilter: (threshold: number) => confidenceFilter.set(threshold),

    getSelectedIssue: (): Issue | null => get(selected),
    getIssueCount: (): number => get(issues).length,

    /** Returns the detected sheet type for a given page (from criteria) */
    sheetTypeForPage: (page: number): SheetType => {
      const pageCriteria = get(criteria).filter((c) => c.page === page);
      return pageCriteria[0]?.sheetType ?? 'unknown';
    },
  };
}

export const issuesStore = createIssuesStore();
