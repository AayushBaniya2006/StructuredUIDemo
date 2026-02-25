<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { viewerStore, renderScale } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import { loadDocument, renderPage, getPageDimensions, getDocumentKey } from '$lib/utils/pdf-renderer';
  import type { PDFDocument, PDFPage } from '$lib/utils/pdf-renderer';
  import type { Issue } from '$lib/types';
  import BboxOverlay from './BboxOverlay.svelte';
  import { t } from '$lib/config/app-config';
  import { ZOOM_MAX, PAGE_CACHE_RADIUS, PAGE_CACHE_MAX } from '$lib/config/constants';

  let {
    pdfSource,
    documentId,
    fitRequested = 0,
    pdfLoading = false,
    onError,
    onReady,
  }: {
    pdfSource?: string | ArrayBuffer;
    documentId: number;
    fitRequested?: number;
    pdfLoading?: boolean;
    onError?: (message: string | null) => void;
    onReady?: () => void;
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
  let selectedIssue = $state<Issue | null>(null);

  let pageCache = new Map<number, PDFPage>();
  let loadToken = 0;
  let pendingRender = false;
  let lastDocumentId = $state<number | null>(null);
  let lastCenteredIssueKey = $state<string>('');

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
      renderCurrentPage();
    }
  });

  const unsubSelected = issuesStore.selected.subscribe((issue) => {
    selectedIssue = issue;
    // Reset centering key so that re-selecting the same issue re-centers
    lastCenteredIssueKey = '';
    maybeCenterSelectedIssue();
  });

  onDestroy(() => {
    unsubViewer();
    unsubRenderScale();
    unsubSelected();
  });

  $effect(() => {
    if (documentId !== lastDocumentId) {
      lastDocumentId = documentId;
      untrack(() => loadPdf());
    }
  });

  $effect(() => {
    if (pdfDoc && currentPage) {
      untrack(() => renderCurrentPage());
    }
  });

  // Re-fit to viewport when parent requests it
  let lastFitRequested = $state(0);
  $effect(() => {
    if (fitRequested > 0 && fitRequested !== lastFitRequested) {
      lastFitRequested = fitRequested;
      untrack(() => fitToViewport());
    }
  });

  async function loadPdf() {
    const currentToken = ++loadToken;
    try {
      error = null;
      onError?.(null);
      pageCache = new Map();
      lastCenteredIssueKey = '';
      if (!pdfSource) return;
      const doc = await loadDocument(pdfSource);
      if (currentToken !== loadToken) return;

      pdfDoc = doc;
      viewerStore.setTotalPages(doc.numPages);
      viewerStore.goToPage(1);
      await renderCurrentPage();
      fitToViewport();
      onReady?.();
    } catch (e) {
      const key = getDocumentKey(pdfSource ?? '');
      error = `Failed to load PDF (${key}): ${e instanceof Error ? e.message : e}`;
      onError?.(error);
    }
  }

  async function getPageFromCache(pageNumber: number): Promise<PDFPage> {
    const cached = pageCache.get(pageNumber);
    if (cached) return cached;
    if (!pdfDoc) throw new Error('PDF not loaded');

    const page = await pdfDoc.getPage(pageNumber);
    pageCache.set(pageNumber, page);
    trimPageCache(pageNumber);
    return page;
  }

  function trimPageCache(centerPage: number) {
    for (const pageNumber of [...pageCache.keys()]) {
      if (Math.abs(pageNumber - centerPage) > PAGE_CACHE_RADIUS) {
        pageCache.delete(pageNumber);
      }
    }
    // Absolute cap: evict farthest pages if cache still exceeds limit
    if (pageCache.size > PAGE_CACHE_MAX) {
      const sorted = [...pageCache.keys()].sort(
        (a, b) => Math.abs(a - centerPage) - Math.abs(b - centerPage)
      );
      for (const p of sorted.slice(PAGE_CACHE_MAX)) {
        pageCache.delete(p);
      }
    }
  }

  async function prefetchNeighbors(pageNumber: number) {
    if (!pdfDoc) return;

    const neighbors = [pageNumber - 1, pageNumber + 1].filter((p) => p >= 1 && p <= pdfDoc!.numPages);
    await Promise.all(
      neighbors.map(async (neighbor) => {
        if (!pageCache.has(neighbor)) {
          const page = await pdfDoc!.getPage(neighbor);
          pageCache.set(neighbor, page);
        }
      })
    );
    trimPageCache(pageNumber);
  }

  function fitToViewport() {
    if (!containerEl || !currentPageObj) return;
    const containerRect = containerEl.getBoundingClientRect();
    // Guard: if container hasn't been laid out yet, defer to next frame
    if (containerRect.width < 100 || containerRect.height < 100) {
      requestAnimationFrame(() => fitToViewport());
      return;
    }
    const viewport = currentPageObj.getViewport({ scale: 1 });
    const scaleX = (containerRect.width - 40) / viewport.width;
    const scaleY = (containerRect.height - 40) / viewport.height;
    const fitScale = Math.max(0.1, Math.min(scaleX, scaleY, ZOOM_MAX));
    viewerStore.zoomTo(fitScale);

    const pageW = viewport.width * fitScale;
    const pageH = viewport.height * fitScale;
    viewerStore.setPan((containerRect.width - pageW) / 2, (containerRect.height - pageH) / 2);
  }

  async function renderCurrentPage() {
    if (!pdfDoc || !canvasEl) return;
    if (isRendering) {
      pendingRender = true;
      return;
    }

    isRendering = true;
    try {
      do {
        pendingRender = false;
        const pageToRender = currentPage;
        try {
          currentPageObj = await getPageFromCache(pageToRender);
          await renderPage({
            page: currentPageObj,
            canvas: canvasEl,
            scale: lastRenderScale,
          });
          const dims = getPageDimensions(currentPageObj, lastRenderScale);
          canvasWidth = dims.width;
          canvasHeight = dims.height;
          maybeCenterSelectedIssue();
          void prefetchNeighbors(pageToRender);
        } catch (e) {
          error = `Failed to render page: ${e instanceof Error ? e.message : e}`;
          onError?.(error);
          pendingRender = false; // stop retry loop on render error
        }
      } while (pendingRender);
    } finally {
      isRendering = false;
    }
  }

  function maybeCenterSelectedIssue() {
    if (!selectedIssue || selectedIssue.page !== currentPage || !containerEl || canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }

    const key = `${selectedIssue.id}:${currentPage}`;
    if (lastCenteredIssueKey === key) return;

    const rect = containerEl.getBoundingClientRect();
    viewerStore.centerOnBbox(selectedIssue.bbox, canvasWidth, canvasHeight, rect.width, rect.height);
    lastCenteredIssueKey = key;
  }

  // Wheel zoom — smooth proportional zooming
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const factor = 1 + Math.abs(delta);
    const newZoom = delta > 0 ? zoom * factor : zoom / factor;
    viewerStore.zoomTo(newZoom);
    // User is manually zooming — allow re-centering on next issue click
    lastCenteredIssueKey = '';
  }

  // Pan via mouse drag
  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    viewerStore.setPan(panStartX + dx, panStartY + dy);
    // User is manually panning — allow re-centering on next issue click
    lastCenteredIssueKey = '';
  }

  function handlePointerUp() {
    isDragging = false;
  }
</script>

<div
  class="relative flex-1 overflow-hidden bg-gray-700 select-none"
  bind:this={containerEl}
  onwheel={handleWheel}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  role="application"
  aria-label="PDF Viewer"
  data-testid="document-viewer"
>
  {#if error}
    <div class="absolute inset-0 flex items-center justify-center text-red-400" data-testid="viewer-error">
      <p>{error}</p>
    </div>
  {:else}
    <div
      class="absolute origin-top-left"
      style="transform: translate({panX}px, {panY}px) scale({zoom / lastRenderScale}); will-change: transform;"
      data-testid="document-transform"
    >
      <canvas bind:this={canvasEl} class="block"></canvas>
      <BboxOverlay width={canvasWidth} height={canvasHeight} page={currentPage} />
    </div>
  {/if}

  {#if pdfLoading}
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-800/50 z-10" data-testid="pdf-loading">
      <div class="flex flex-col items-center gap-3">
        <svg class="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="text-sm font-medium text-white">Loading PDF…</span>
      </div>
    </div>
  {/if}

  {#if isRendering}
    <div class="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white" data-testid="rendering-indicator">
      {t.viewer.rendering}
    </div>
  {/if}

  <div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm text-white" data-testid="page-controls">
    <button
      onclick={() => viewerStore.prevPage()}
      disabled={currentPage <= 1}
      class="rounded px-2 py-0.5 hover:bg-white/20 disabled:opacity-30"
      data-testid="page-prev"
    >
      &larr;
    </button>
    <span data-testid="page-counter">{t.viewer.pageCounter.replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}</span>
    <button
      onclick={() => viewerStore.nextPage()}
      disabled={currentPage >= totalPages}
      class="rounded px-2 py-0.5 hover:bg-white/20 disabled:opacity-30"
      data-testid="page-next"
    >
      &rarr;
    </button>
  </div>
</div>
