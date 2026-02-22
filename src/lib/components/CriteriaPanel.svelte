<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import type { QACriterion } from '$lib/types';
  import { t } from '$lib/config/app-config';

  let criteria: QACriterion[] = $state([]);
  let selectedCriterionId: string | null = $state(null);

  const unsub = issuesStore.criteria.subscribe((v) => (criteria = v));
  onDestroy(unsub);

  function getResultStyle(result: QACriterion['result']) {
    switch (result) {
      case 'pass':
        return { bg: 'bg-green-50 border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-800', label: 'PASS' };
      case 'fail':
        return { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-800', label: 'FAIL' };
      case 'not-applicable':
        return { bg: 'bg-gray-50 border-gray-200', icon: 'text-gray-400', badge: 'bg-gray-100 text-gray-500', label: 'N/A' };
    }
  }

  function handleCriterionClick(criterion: QACriterion) {
    if (criterion.result === 'fail') {
      if (selectedCriterionId === criterion.id) {
        selectedCriterionId = null;
        issuesStore.setSeverityFilter('all');
      } else {
        selectedCriterionId = criterion.id;
      }
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
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5">
          <span class="text-xs font-medium text-gray-500">{t.panels.criteria.pageLabel} {page}</span>
        </div>
        {#each grouped.get(page) ?? [] as criterion (criterion.id)}
          {@const style = getResultStyle(criterion.result)}
          <button
            class="w-full border-l-2 px-4 py-3 text-left transition-colors {style.bg} {selectedCriterionId === criterion.id ? 'border-l-blue-600' : 'border-l-transparent'} hover:brightness-95"
            onclick={() => handleCriterionClick(criterion)}
            data-testid={`criterion-${criterion.id}`}
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-800">{criterion.name}</span>
              <span class="rounded px-1.5 py-0.5 text-[10px] font-bold {style.badge}">{style.label}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-gray-600">{criterion.summary}</p>
            {#if criterion.confidence !== undefined}
              <div class="mt-1 flex items-center gap-1">
                <span class="text-[10px] text-gray-500">Confidence:</span>
                <span class="text-[10px] font-medium {criterion.confidence >= 80 ? 'text-green-600' : criterion.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}">{Math.round(criterion.confidence)}%</span>
              </div>
            {/if}
          </button>
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
