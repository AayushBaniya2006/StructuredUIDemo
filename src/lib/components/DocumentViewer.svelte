<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { viewerStore, renderScale } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import { loadDocument, renderPage, getPageDimensions } from '$lib/utils/pdf-renderer';
  import type { PDFDocument, PDFPage } from '$lib/utils/pdf-renderer';
  import BboxOverlay from './BboxOverlay.svelte';

  let {
    pdfSource = '/sample-blueprint.pdf',
  }: {
    pdfSource?: string;
  } = $props();

  let containerEl = $state<HTMLDivElement>(undefined!);
  let canvasEl = $state<HTMLCanvasElement>(undefined!);
  let pdfDoc: PDFDocument | null = $state(null);
  let currentPageObj: PDFPage | null = $state(null);
  let canvasWidth = $state(0);
  let canvasHeight = $state(0);
  let isRendering = $state(false);
  let error = $state<string | null>(null);

  // Pan state for drag
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  let currentPage = $state(1);
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let lastRenderScale = $state(1);
  let totalPages = $state(0);

  // Subscribe to stores
  const unsubViewer = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    zoom = v.zoom;
    panX = v.panX;
    panY = v.panY;
    totalPages = v.totalPages;
  });

  const unsubRenderScale = renderScale.subscribe((s) => {
    if (s !== lastRenderScale) {
      lastRenderScale = s;
      if (currentPageObj) renderCurrentPage();
    }
  });

  onDestroy(() => {
    unsubViewer();
    unsubRenderScale();
  });

  async function loadPdf() {
    try {
      error = null;
      pdfDoc = await loadDocument(pdfSource);
      viewerStore.setTotalPages(pdfDoc.numPages);
      await renderCurrentPage();
    } catch (e) {
      error = `Failed to load PDF: ${e instanceof Error ? e.message : e}`;
    }
  }

  async function renderCurrentPage() {
    if (!pdfDoc || !canvasEl || isRendering) return;
    isRendering = true;
    try {
      currentPageObj = await pdfDoc.getPage(currentPage);
      await renderPage({
        page: currentPageObj,
        canvas: canvasEl,
        scale: lastRenderScale,
      });
      const dims = getPageDimensions(currentPageObj, lastRenderScale);
      canvasWidth = dims.width;
      canvasHeight = dims.height;
    } catch (e) {
      error = `Failed to render page: ${e instanceof Error ? e.message : e}`;
    } finally {
      isRendering = false;
    }
  }

  // Re-render when page changes
  $effect(() => {
    if (pdfDoc && currentPage) {
      renderCurrentPage();
    }
  });

  onMount(() => {
    loadPdf();
  });

  // Wheel zoom
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      viewerStore.zoomIn();
    } else {
      viewerStore.zoomOut();
    }
  }

  // Pan via mouse drag
  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    viewerStore.setPan(panStartX + dx, panStartY + dy);
  }

  function handlePointerUp() {
    isDragging = false;
  }

  export function loadNewPdf(source: string | ArrayBuffer) {
    if (typeof source === 'string') {
      pdfSource = source;
      loadPdf();
    } else {
      loadDocument(source).then((doc) => {
        pdfDoc = doc;
        viewerStore.setTotalPages(doc.numPages);
        viewerStore.goToPage(1);
        renderCurrentPage();
      });
    }
  }
</script>

<div
  class="relative flex-1 overflow-hidden bg-gray-900 select-none"
  bind:this={containerEl}
  onwheel={handleWheel}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  role="application"
  aria-label="PDF Viewer"
>
  {#if error}
    <div class="absolute inset-0 flex items-center justify-center text-red-400">
      <p>{error}</p>
    </div>
  {:else}
    <div
      class="absolute origin-top-left"
      style="transform: translate({panX}px, {panY}px) scale({zoom / lastRenderScale}); will-change: transform;"
    >
      <canvas bind:this={canvasEl} class="block"></canvas>
      <BboxOverlay width={canvasWidth} height={canvasHeight} page={currentPage} />
    </div>
  {/if}

  {#if isRendering}
    <div class="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
      Rendering...
    </div>
  {/if}

  <!-- Page navigation -->
  <div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm text-white">
    <button
      onclick={() => viewerStore.prevPage()}
      disabled={currentPage <= 1}
      class="rounded px-2 py-0.5 hover:bg-white/20 disabled:opacity-30"
    >
      &larr;
    </button>
    <span>Page {currentPage} of {totalPages}</span>
    <button
      onclick={() => viewerStore.nextPage()}
      disabled={currentPage >= totalPages}
      class="rounded px-2 py-0.5 hover:bg-white/20 disabled:opacity-30"
    >
      &rarr;
    </button>
  </div>
</div>
