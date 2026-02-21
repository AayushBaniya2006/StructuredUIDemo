<script lang="ts">
  import { viewerStore } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import type { SeverityFilter, StatusFilter } from '$lib/types';
  import { onDestroy } from 'svelte';

  let { onFileUpload }: { onFileUpload?: (file: File) => void } = $props();

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
  onDestroy(() => { unsubViewer(); unsubSev(); unsubStat(); });

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

<header class="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2">
  <!-- Title -->
  <div class="flex items-center gap-2">
    <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h1 class="text-sm font-semibold text-gray-900 whitespace-nowrap">Blueprint Issue Viewer</h1>
  </div>

  <div class="h-5 w-px bg-gray-300"></div>

  <!-- Upload -->
  <button
    class="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
    onclick={() => fileInput.click()}
  >
    Upload PDF
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept=".pdf"
    class="hidden"
    onchange={handleFileChange}
  />

  <div class="h-5 w-px bg-gray-300"></div>

  <!-- Zoom controls -->
  <div class="flex items-center gap-1">
    <button
      class="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomOut()}
    >-</button>
    <span class="min-w-[3rem] text-center text-xs font-medium text-gray-700">
      {Math.round(zoom * 100)}%
    </span>
    <button
      class="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      onclick={() => viewerStore.zoomIn()}
    >+</button>
    <button
      class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
      onclick={() => viewerStore.resetZoom()}
    >Reset</button>
  </div>

  <div class="h-5 w-px bg-gray-300"></div>

  <!-- Severity filters -->
  <div class="flex items-center gap-1">
    <span class="text-xs text-gray-400 mr-1">Severity:</span>
    {#each severityOptions as opt}
      <button
        class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {severityFilter === opt.value ? opt.color + ' ring-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}"
        onclick={() => issuesStore.setSeverityFilter(opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  <!-- Status filters -->
  <div class="flex items-center gap-1">
    <span class="text-xs text-gray-400 mr-1">Status:</span>
    {#each statusOptions as opt}
      <button
        class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {statusFilter === opt.value ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}"
        onclick={() => issuesStore.setStatusFilter(opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  <div class="flex-1"></div>

  <!-- Overlay toggle -->
  <button
    class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {showAll ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}"
    onclick={() => viewerStore.toggleOverlays()}
  >
    {showAll ? 'All Boxes' : 'Selected Only'}
  </button>
</header>
