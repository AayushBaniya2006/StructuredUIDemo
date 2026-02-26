<script lang="ts">
  import { onDestroy } from 'svelte';
  import { viewerStore } from '$lib/stores/viewer';
  import { issuesStore } from '$lib/stores/issues';
  import { loadDocument, renderThumbnail } from '$lib/utils/pdf-renderer';
  import { t } from '$lib/config/app-config';
  import { SHEET_TYPE_ABBREV } from '$lib/types';
  import type { QACriterion } from '$lib/types';

  let {
    pdfSource,
    documentId,
  }: {
    pdfSource?: string | ArrayBuffer;
    documentId: number;
  } = $props();

  let currentPage = $state(1);
  let totalPages = $state(0);
  let activeDocumentId = $state<number | null>(null);
  let criteriaList = $state<QACriterion[]>([]);

  const unsubCriteria = issuesStore.criteria.subscribe((v) => (criteriaList = v));

  function getSheetAbbrev(pageNum: number): string | null {
    const c = criteriaList.find((crit) => crit.page === pageNum && crit.sheetType && crit.sheetType !== 'unknown');
    return c?.sheetType ? SHEET_TYPE_ABBREV[c.sheetType] : null;
  }

  // Shared doc promise per documentId to avoid re-loading
  let cachedDocId = -1;
  let cachedDocPromise: Promise<Awaited<ReturnType<typeof loadDocument>>> | null = null;

  function getDoc() {
    if (cachedDocId !== documentId || !cachedDocPromise) {
      cachedDocId = documentId;
      cachedDocPromise = pdfSource ? loadDocument(pdfSource) : null!;
    }
    return cachedDocPromise;
  }

  const unsub = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    totalPages = v.totalPages;
  });
  onDestroy(() => { unsub(); unsubCriteria(); });

  // Svelte action: lazily renders the canvas when it scrolls into view
  function lazyThumb(canvas: HTMLCanvasElement, pageNum: number) {
    let rendered = false;

    async function render() {
      if (rendered || !pdfSource) return;
      rendered = true;
      try {
        const doc = await getDoc();
        const page = await doc.getPage(pageNum);
        await renderThumbnail(page, canvas, 56);
      } catch {
        // thumbnails are non-critical
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          render();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(canvas);

    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  // Reset cached doc when document changes
  $effect(() => {
    if (documentId !== activeDocumentId) {
      activeDocumentId = documentId;
      cachedDocId = -1;
      cachedDocPromise = null;
    }
  });
</script>

<div class="border-t border-gray-200 px-3 py-2" data-testid="page-thumbnails">
  <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{t.thumbnails.title}</span>
  <div class="mt-1.5 flex gap-2 overflow-x-auto">
    {#key documentId}
      {#each Array(totalPages) as _, i}
        {@const pageNum = i + 1}
        <button
          class="shrink-0 rounded border-2 transition-colors {currentPage === pageNum ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}"
          onclick={() => viewerStore.goToPage(pageNum)}
          data-testid={`thumbnail-${pageNum}`}
        >
          <canvas class="block h-10 w-14 rounded-sm bg-gray-100" use:lazyThumb={pageNum}></canvas>
          <div class="flex items-center justify-center gap-1">
            <span class="block text-center text-[9px] text-gray-500">{pageNum}</span>
            {#if getSheetAbbrev(pageNum)}
              <span class="text-[8px] font-bold text-blue-600">{getSheetAbbrev(pageNum)}</span>
            {/if}
          </div>
        </button>
      {/each}
    {/key}
  </div>
</div>
