<script lang="ts">
  import { viewerStore } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import type { SeverityFilter, StatusFilter } from '$lib/types';
  import { t } from '$lib/config/app-config';
  import { onDestroy } from 'svelte';

  let { onFileUpload, onResetZoom, onRunAnalysis, onShowMetrics, onExportReport, onShare }: {
    onFileUpload?: (file: File) => void;
    onResetZoom?: () => void;
    onRunAnalysis?: () => void;
    onShowMetrics?: () => void;
    onExportReport?: () => void;
    onShare?: () => void;
  } = $props();

  let zoom = $state(1);
  let showAll = $state(true);
  let severityFilter = $state<SeverityFilter>('all');
  let statusFilter = $state<StatusFilter>('all');

  const unsubViewer = viewerStore.subscribe((v) => {
    zoom = v.zoom;
    showAll = v.showAllOverlays;
  });
  const unsubSev = issuesStore.severityFilter.subscribe((v) => (severityFilter = v));
  const unsubStat = issuesStore.statusFilter.subscribe((v) => (statusFilter = v));
  let analysisStatus = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  let complianceScore = $state(0);
  let showShareToast = $state(false);
  const unsubAnalysis = issuesStore.analysisState.subscribe((s) => (analysisStatus = s.status));
  const unsubCompliance = issuesStore.complianceScore.subscribe((s) => (complianceScore = s));
  onDestroy(() => { unsubViewer(); unsubSev(); unsubStat(); unsubAnalysis(); unsubCompliance(); });

  let fileInput = $state<HTMLInputElement>(undefined!);

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && onFileUpload) onFileUpload(file);
  }

  function handleShare() {
    const shareUrl = `${window.location.origin}?demo=true`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showShareToast = true;
      setTimeout(() => showShareToast = false, 3000);
    });
  }

  const severityOptions: { value: SeverityFilter; label: string; color: string }[] = [
    { value: 'all', label: t.filters.severity.all, color: 'bg-gray-200 text-gray-700' },
    { value: 'high', label: t.filters.severity.high, color: 'bg-red-100 text-red-700' },
    { value: 'medium', label: t.filters.severity.medium, color: 'bg-amber-100 text-amber-700' },
    { value: 'low', label: t.filters.severity.low, color: 'bg-blue-100 text-blue-700' },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t.filters.status.all },
    { value: 'open', label: t.filters.status.open },
    { value: 'resolved', label: t.filters.status.resolved },
  ];
</script>

<header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 bg-white px-3 py-1.5" data-testid="app-toolbar">
  <!-- Title -->
  <div class="flex items-center gap-1.5">
    <img src="/logo.svg" alt="Structured AI" class="h-5 w-5" />
    <h1 class="text-xs font-semibold text-gray-900 whitespace-nowrap">{t.toolbar.title}</h1>
    {#if complianceScore > 0}
      <div class="flex items-center gap-2 ml-4">
        <span class="text-[10px] text-gray-400">Compliance:</span>
        <span class="rounded px-2 py-0.5 text-xs font-bold {complianceScore >= 80 ? 'bg-green-100 text-green-700' : complianceScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
          {complianceScore}%
        </span>
      </div>
    {/if}
  </div>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Upload -->
  <button
    class="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
    onclick={() => fileInput.click()}
    data-testid="upload-button"
  >
    {t.toolbar.uploadButton}
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept=".pdf"
    class="hidden"
    onchange={handleFileChange}
    data-testid="upload-input"
  />

  <!-- Run Analysis -->
  <button
    class="rounded px-2.5 py-1 text-[11px] font-medium transition-colors {analysisStatus === 'analyzing' ? 'bg-amber-100 text-amber-700 cursor-wait' : 'bg-green-600 text-white hover:bg-green-700'}"
    onclick={() => onRunAnalysis?.()}
    disabled={analysisStatus === 'analyzing'}
    data-testid="run-analysis"
  >
    {#if analysisStatus === 'analyzing'}
      {t.toolbar.analyzing}
    {:else if analysisStatus === 'done'}
      {t.toolbar.reRunCheck}
    {:else}
      {t.toolbar.runCheck}
    {/if}
  </button>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Zoom controls -->
  <div class="flex items-center gap-0.5">
    <button
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomOut()}
      data-testid="zoom-out"
    >{t.toolbar.zoomOut}</button>
    <span class="min-w-[2.5rem] text-center text-[11px] font-medium text-gray-600 tabular-nums">
      {Math.round(zoom * 100)}%
    </span>
    <button
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomIn()}
      data-testid="zoom-in"
    >{t.toolbar.zoomIn}</button>
    <button
      class="rounded px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100"
      onclick={() => onResetZoom?.()}
      data-testid="zoom-reset"
    >{t.toolbar.zoomReset}</button>
  </div>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Severity filters -->
  <div class="flex items-center gap-0.5">
    <span class="text-[10px] text-gray-400 mr-0.5 hidden md:inline">{t.toolbar.severityLabel}</span>
    {#each severityOptions as opt}
      <button
        class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors {severityFilter === opt.value ? opt.color + ' ring-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}"
        onclick={() => issuesStore.setSeverityFilter(opt.value)}
        data-testid={`severity-${opt.value}`}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  <!-- Status filters -->
  <div class="flex items-center gap-0.5">
    <span class="text-[10px] text-gray-400 mr-0.5 hidden md:inline">{t.toolbar.statusLabel}</span>
    {#each statusOptions as opt}
      <button
        class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors {statusFilter === opt.value ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}"
        onclick={() => issuesStore.setStatusFilter(opt.value)}
        data-testid={`status-${opt.value}`}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  <div class="flex-1"></div>

  <!-- Overlay toggle -->
  <button
    class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors {showAll ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}"
    onclick={() => viewerStore.toggleOverlays()}
    data-testid="overlay-toggle"
  >
    {showAll ? t.toolbar.showAll : t.toolbar.selectedOnly}
  </button>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Metrics button -->
  <button
    class="rounded px-2.5 py-1 text-[11px] font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700"
    onclick={() => onShowMetrics?.()}
    data-testid="show-metrics"
  >
    Metrics
  </button>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Export button -->
  <button
    class="rounded px-2.5 py-1 text-[11px] font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
    onclick={() => onExportReport?.()}
    data-testid="export-report"
  >
    Export
  </button>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Share button -->
  <button
    class="rounded px-2.5 py-1 text-[11px] font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700"
    onclick={handleShare}
    data-testid="share-analysis"
  >
    Share
  </button>
</header>

{#if showShareToast}
  <div class="fixed top-4 right-4 z-50 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg flex items-center gap-2">
    <svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
    <span class="text-sm">Link copied to clipboard!</span>
  </div>
{/if}
