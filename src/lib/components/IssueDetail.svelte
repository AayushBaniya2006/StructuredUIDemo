<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import type { Issue } from '$lib/types';
  import { onDestroy } from 'svelte';

  let selected: Issue | null = $state(null);

  const unsub = issuesStore.selected.subscribe((v) => (selected = v));
  onDestroy(unsub);

  function getSeverityLabel(severity: string) {
    const labels: Record<string, { text: string; classes: string }> = {
      high: { text: 'High', classes: 'bg-red-100 text-red-800' },
      medium: { text: 'Medium', classes: 'bg-amber-100 text-amber-800' },
      low: { text: 'Low', classes: 'bg-blue-100 text-blue-800' },
    };
    return labels[severity] ?? { text: severity, classes: 'bg-gray-100 text-gray-800' };
  }

  function handlePrev() {
    const issue = issuesStore.selectPrev();
    if (issue) viewerStore.goToPage(issue.page);
  }

  function handleNext() {
    const issue = issuesStore.selectNext();
    if (issue) viewerStore.goToPage(issue.page);
  }
</script>

<aside class="flex h-full flex-col bg-white" data-testid="issue-detail">
  {#if selected}
    <div class="flex-1 overflow-y-auto p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs font-mono text-gray-400">{selected.id}</span>
        <span class="rounded px-1.5 py-0.5 text-xs font-medium {getSeverityLabel(selected.severity).classes}">
          {getSeverityLabel(selected.severity).text}
        </span>
      </div>

      <h3 class="mb-2 text-sm font-semibold text-gray-900">{selected.title}</h3>

      <div class="mb-3 flex items-center gap-2">
        <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 uppercase">{selected.category}</span>
        <span class="text-xs text-gray-400">Page {selected.page}</span>
      </div>

      <p class="mb-4 text-sm leading-relaxed text-gray-600">{selected.description}</p>

      <button
        class="w-full rounded-md px-3 py-2 text-sm font-medium transition-colors {selected.status === 'open' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
        onclick={() => issuesStore.toggleStatus(selected!.id)}
        data-testid="toggle-status"
      >
        {selected.status === 'open' ? 'Mark as Resolved' : 'Reopen Issue'}
      </button>
    </div>

    <div class="flex border-t border-gray-200">
      <button
        class="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        onclick={handlePrev}
        data-testid="detail-prev"
      >
        &larr; Prev
      </button>
      <div class="w-px bg-gray-200"></div>
      <button
        class="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        onclick={handleNext}
        data-testid="detail-next"
      >
        Next &rarr;
      </button>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center p-4">
      <p class="text-center text-sm text-gray-400">Select an issue to view details</p>
    </div>
  {/if}
</aside>
