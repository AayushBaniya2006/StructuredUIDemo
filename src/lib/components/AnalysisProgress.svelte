<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import { t } from '$lib/config/app-config';

  let { onCancel }: { onCancel?: () => void } = $props();

  let status = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  let currentPage = $state(0);
  let totalPages = $state(0);
  let errorMsg = $state<string | null>(null);
  let elapsedTime = $state(0);
  let estimatedTime = $derived(totalPages > 0 ? Math.round(totalPages * 2) : 0);

  const unsub = issuesStore.analysisState.subscribe((s) => {
    status = s.status;
    currentPage = s.currentPage;
    totalPages = s.totalPages;
    errorMsg = s.error;
  });
  onDestroy(unsub);

  let progress = $derived(totalPages > 0 ? (currentPage / totalPages) * 100 : 0);

  let interval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    if (status === 'analyzing') {
      elapsedTime = 0;
      interval = setInterval(() => {
        elapsedTime += 1;
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
      interval = null;
      elapsedTime = 0;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

{#if status === 'analyzing'}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="analysis-progress">
    <div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <svg class="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">{t.analysis.title}</h3>
          <p class="text-xs text-gray-500">
            {#if currentPage > 0}
              Rendering pages…
            {:else if totalPages > 0}
              Analyzing with AI…
            {:else}
              {t.analysis.preparing}
            {/if}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full bg-blue-600 transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>

      <!-- Timing info -->
      <div class="mb-4 text-center text-xs text-gray-500">
        <p>Elapsed: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')} · Est. remaining: ~{Math.round((estimatedTime - elapsedTime) / 60)}:{String((estimatedTime - elapsedTime) % 60).padStart(2, '0')}</p>
      </div>

      <!-- Status detail -->
      <div class="mb-4 rounded-lg bg-gray-50 p-3">
        {#if currentPage > 0}
          <p class="text-xs text-gray-500 mb-1">Rendering:</p>
          <p class="text-sm font-medium text-gray-900">Page {currentPage} of {totalPages}</p>
        {:else if totalPages > 0}
          <p class="text-xs text-gray-500 mb-1">Analyzing:</p>
          <p class="text-sm font-medium text-gray-900">All {totalPages} pages in parallel</p>
        {:else}
          <p class="text-xs text-gray-500 mb-1">Status:</p>
          <p class="text-sm font-medium text-gray-900">Preparing…</p>
        {/if}
      </div>

      <button
        class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onclick={() => onCancel?.()}
        data-testid="cancel-analysis"
      >
        {t.analysis.cancel}
      </button>
    </div>
  </div>
{/if}

{#if status === 'error'}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="analysis-error">
    <div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">{t.analysis.failed}</h3>
          <p class="text-xs text-red-600">{errorMsg ?? 'Unknown error'}</p>
        </div>
      </div>

      <button
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        onclick={() => issuesStore.setAnalysisState({ status: 'idle', error: null })}
        data-testid="dismiss-error"
      >
        {t.analysis.dismiss}
      </button>
    </div>
  </div>
{/if}
