<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import type { Issue } from '$lib/types';
  import { SHEET_TYPE_ABBREV } from '$lib/types';
  import { t } from '$lib/config/app-config';
  import { HIGH_CONFIDENCE_THRESHOLD } from '$lib/config/constants';

  let filteredIssues: Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let currentPage = $state(1);
  let analysisStatus = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  let emptyIssues = $state(false);

  const unsubFiltered = issuesStore.filtered.subscribe((v) => (filteredIssues = v));
  const unsubSelected = issuesStore.selectedId.subscribe((v) => {
    selectedId = v;
    // Scroll the selected row into view after DOM updates
    if (v) {
      tick().then(() => {
        const el = document.querySelector(`[data-testid="issue-row-${v}"]`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    }
  });
  const unsubViewer = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
  });
  const unsubAnalysis = issuesStore.analysisState.subscribe((v) => {
    analysisStatus = v.status;
    emptyIssues = v.emptyIssues;
  });

  onDestroy(() => {
    unsubFiltered();
    unsubSelected();
    unsubViewer();
    unsubAnalysis();
  });

  function handleSelect(issue: Issue) {
    if (issue.id === selectedId) {
      // Re-clicking the same issue — force re-center
      issuesStore.reselect(issue.id);
    } else {
      issuesStore.select(issue.id);
    }
    viewerStore.goToPage(issue.page);
  }

  function handleHover(id: string | null) {
    issuesStore.hover(id);
  }

  function getSeverityDot(severity: string): string {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  }

  function groupByPage(issues: Issue[]): Map<number, Issue[]> {
    const groups = new Map<number, Issue[]>();
    for (const issue of issues) {
      if (!groups.has(issue.page)) groups.set(issue.page, []);
      groups.get(issue.page)!.push(issue);
    }
    return groups;
  }

  let grouped = $derived(groupByPage(filteredIssues));
  let pages = $derived([...grouped.keys()].sort((a, b) => a - b));
</script>

<aside class="flex h-full flex-col" data-testid="issues-panel">
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">{t.panels.issues.title}</h2>
    <p class="text-xs text-gray-500">{filteredIssues.length} {filteredIssues.length === 1 ? t.panels.issues.countSingular : t.panels.issues.countPlural}</p>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 px-4 py-1.5 {page === currentPage ? 'bg-blue-50 border-l-2 border-blue-400' : 'bg-gray-50'}">
          <span class="text-xs font-medium {page === currentPage ? 'text-blue-700' : 'text-gray-500'}">{t.panels.issues.pageLabel} {page}</span>
        </div>
        {#each grouped.get(page) ?? [] as issue (issue.id)}
          <button
            class="w-full px-4 py-2.5 text-left transition-colors hover:bg-blue-50 {issue.id === selectedId ? 'bg-blue-100 border-l-2 border-blue-600' : 'border-l-2 border-transparent'}"
            onclick={() => handleSelect(issue)}
            onmouseenter={() => handleHover(issue.id)}
            onmouseleave={() => handleHover(null)}
            data-testid={`issue-row-${issue.id}`}
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full {getSeverityDot(issue.severity)}"></span>
              <span class="truncate text-sm font-medium text-gray-800">{issue.title}</span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-1.5 pl-4">
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase">{issue.category.replace('-', ' ')}</span>
              {#if issue.sheetType && issue.sheetType !== 'unknown'}
                <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{SHEET_TYPE_ABBREV[issue.sheetType]}</span>
              {/if}
              {#if issue.confidence !== undefined}
                <span class="rounded px-1.5 py-0.5 text-[10px] font-medium
                  {issue.confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'bg-green-50 text-green-700' : issue.confidence >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}">
                  {Math.round(issue.confidence)}%
                </span>
              {/if}
              {#if issue.status === 'resolved'}
                <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Resolved</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/each}

    {#if filteredIssues.length === 0 && analysisStatus === 'done'}
      <div class="flex flex-col items-center justify-center p-8 text-center">
        {#if emptyIssues}
          <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="mb-1 text-sm font-medium text-gray-900">{t.panels.issues.emptySuccess}</p>
          <p class="text-xs text-gray-500">{t.panels.issues.emptySuccessSubtext}</p>
        {:else}
          <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="mb-1 text-sm font-medium text-gray-900">{t.panels.issues.emptyFiltered}</p>
          <p class="text-xs text-gray-500">Try adjusting the severity or status filters above.</p>
        {/if}
      </div>
    {:else if filteredIssues.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        {t.panels.issues.empty}
      </div>
    {/if}
  </div>
</aside>
