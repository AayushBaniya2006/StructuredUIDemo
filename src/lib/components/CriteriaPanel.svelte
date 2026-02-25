<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import type { QACriterion } from '$lib/types';
  import { SHEET_TYPE_ABBREV } from '$lib/types';
  import { t } from '$lib/config/app-config';
  import { HIGH_CONFIDENCE_THRESHOLD } from '$lib/config/constants';

  let criteria: QACriterion[] = $state([]);
  const unsub = issuesStore.criteria.subscribe((v) => (criteria = v));
  onDestroy(unsub);

  function getBorderColor(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'border-l-green-500';
      case 'fail': return 'border-l-red-500';
      case 'not-applicable': return 'border-l-gray-200';
    }
  }

  function getBadgeStyle(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'not-applicable': return 'bg-gray-100 text-gray-500';
    }
  }

  function getIconPath(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'fail': return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'not-applicable': return 'M18 12H6';
    }
  }

  function getIconColor(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'text-green-500';
      case 'fail': return 'text-red-500';
      case 'not-applicable': return 'text-gray-300';
    }
  }

  function groupByPage(items: QACriterion[]): Map<number, QACriterion[]> {
    const groups = new Map<number, QACriterion[]>();
    for (const c of items) {
      if (!groups.has(c.page)) groups.set(c.page, []);
      groups.get(c.page)!.push(c);
    }
    return groups;
  }

  let grouped = $derived(groupByPage(criteria));
  let pages = $derived([...grouped.keys()].sort((a, b) => a - b));

  let stats = $derived({
    pass: criteria.filter((c) => c.result === 'pass').length,
    fail: criteria.filter((c) => c.result === 'fail').length,
    na: criteria.filter((c) => c.result === 'not-applicable').length,
  });
</script>

<div class="flex h-full flex-col" data-testid="criteria-panel">
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">{t.panels.criteria.title}</h2>
    <div class="mt-1 flex items-center gap-2 text-xs">
      <span class="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700">{stats.pass} {t.panels.criteria.pass}</span>
      <span class="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">{stats.fail} {t.panels.criteria.fail}</span>
      <span class="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">{stats.na} {t.panels.criteria.na}</span>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      {@const pageCriteria = grouped.get(page) ?? []}
      {@const sheetType = pageCriteria[0]?.sheetType}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500">{t.panels.criteria.pageLabel} {page}</span>
          {#if sheetType && sheetType !== 'unknown'}
            <span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
              {SHEET_TYPE_ABBREV[sheetType]}
            </span>
          {/if}
        </div>
        {#each pageCriteria as criterion (criterion.id)}
          <div
            class="border-l-4 px-4 py-3 {getBorderColor(criterion.result)} bg-white"
            data-testid={`criterion-${criterion.id}`}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="h-4 w-4 shrink-0 {getIconColor(criterion.result)}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d={getIconPath(criterion.result)} />
                </svg>
                <span class="text-xs font-semibold text-gray-800 truncate">{criterion.name}</span>
              </div>
              <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold {getBadgeStyle(criterion.result)}">
                {criterion.result === 'not-applicable' ? 'N/A' : criterion.result.toUpperCase()}
              </span>
            </div>

            {#if criterion.result !== 'not-applicable'}
              <!-- AI Summary inset box -->
              <div class="mt-2 rounded bg-gray-50 px-3 py-2 border border-gray-100">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">AI Summary</p>
                <p class="text-xs leading-relaxed text-gray-600">{criterion.summary}</p>
              </div>
            {/if}

            {#if criterion.confidence !== undefined}
              <div class="mt-1.5 flex items-center gap-1">
                <span class="text-[10px] text-gray-400">Confidence:</span>
                <span class="text-[10px] font-medium {criterion.confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'text-green-600' : criterion.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                  {Math.round(criterion.confidence)}%
                </span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/each}

    {#if criteria.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        {t.panels.criteria.empty}
      </div>
    {/if}
  </div>
</div>
