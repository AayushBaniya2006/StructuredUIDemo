<script lang="ts">
  import { viewerStore } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import type { SeverityFilter, StatusFilter } from '$lib/types';
  import { onDestroy } from 'svelte';

  let { onFileUpload, onResetZoom, onRunAnalysis }: {
    onFileUpload?: (file: File) => void;
    onResetZoom?: () => void;
    onRunAnalysis?: () => void;
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
  const unsubAnalysis = issuesStore.analysisState.subscribe((s) => (analysisStatus = s.status));
  onDestroy(() => { unsubViewer(); unsubSev(); unsubStat(); unsubAnalysis(); });

  let fileInput = $state<HTMLInputElement>(undefined!);

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && onFileUpload) onFileUpload(file);
  }

  const severityOptions: { value: SeverityFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-gray-200 text-gray-700' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
  ];
</script>

<header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 bg-white px-3 py-1.5" data-testid="app-toolbar">
  <!-- Title -->
  <div class="flex items-center gap-1.5">
    <svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h1 class="text-xs font-semibold text-gray-900 whitespace-nowrap">Blueprint Issue Viewer</h1>
  </div>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Upload -->
  <button
    class="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
    onclick={() => fileInput.click()}
    data-testid="upload-button"
  >
    Upload PDF
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
      Analyzing...
    {:else if analysisStatus === 'done'}
      Re-run Check
    {:else}
      Run Check
    {/if}
  </button>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Zoom controls -->
  <div class="flex items-center gap-0.5">
    <button
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomOut()}
      data-testid="zoom-out"
    >&minus;</button>
    <span class="min-w-[2.5rem] text-center text-[11px] font-medium text-gray-600 tabular-nums">
      {Math.round(zoom * 100)}%
    </span>
    <button
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomIn()}
      data-testid="zoom-in"
    >+</button>
    <button
      class="rounded px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100"
      onclick={() => onResetZoom?.()}
      data-testid="zoom-reset"
    >Fit</button>
  </div>

  <div class="hidden sm:block h-4 w-px bg-gray-200"></div>

  <!-- Severity filters -->
  <div class="flex items-center gap-0.5">
    <span class="text-[10px] text-gray-400 mr-0.5 hidden md:inline">Severity:</span>
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
    <span class="text-[10px] text-gray-400 mr-0.5 hidden md:inline">Status:</span>
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
    {showAll ? 'All Boxes' : 'Selected Only'}
  </button>
</header>
