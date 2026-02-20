<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import type { Issue } from '$lib/types';

  let filteredIssues: Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let currentPage = $state(1);
  let totalPages = $state(0);

  const unsubFiltered = issuesStore.filtered.subscribe((v) => (filteredIssues = v));
  const unsubSelected = issuesStore.selectedId.subscribe((v) => (selectedId = v));
  const unsubViewer = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    totalPages = v.totalPages;
  });

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubFiltered();
    unsubSelected();
    unsubViewer();
  });

  function handleSelect(issue: Issue) {
    issuesStore.select(issue.id);
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

<aside class="flex h-full w-72 flex-col border-r border-gray-200 bg-white">
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">Issues</h2>
    <p class="text-xs text-gray-500">{filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}</p>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5">
          <span class="text-xs font-medium text-gray-500">Page {page}</span>
        </div>
        {#each grouped.get(page) ?? [] as issue (issue.id)}
          <button
            class="w-full px-4 py-2.5 text-left transition-colors hover:bg-blue-50 {issue.id === selectedId ? 'bg-blue-100 border-l-2 border-blue-600' : 'border-l-2 border-transparent'}"
            onclick={() => handleSelect(issue)}
            onmouseenter={() => handleHover(issue.id)}
            onmouseleave={() => handleHover(null)}
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full {getSeverityDot(issue.severity)}"></span>
              <span class="truncate text-sm font-medium text-gray-800">{issue.title}</span>
            </div>
            <div class="mt-0.5 flex items-center gap-2 pl-4">
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase">{issue.category}</span>
              {#if issue.status === 'resolved'}
                <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Resolved</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/each}

    {#if filteredIssues.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        No issues match filters
      </div>
    {/if}
  </div>
</aside>
