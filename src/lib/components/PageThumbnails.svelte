<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { viewerStore } from '$lib/stores/viewer';
  import { loadDocument, renderThumbnail } from '$lib/utils/pdf-renderer';
  import { t } from '$lib/config/app-config';

  let {
    pdfSource,
    documentId,
  }: {
    pdfSource?: string | ArrayBuffer;
    documentId: number;
  } = $props();

  let currentPage = $state(1);
  let totalPages = $state(0);
  let rendered = $state(false);
  let activeDocumentId = $state<number | null>(null);
  let containerEl = $state<HTMLDivElement>(undefined!);

  const unsub = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    totalPages = v.totalPages;
  });
  onDestroy(unsub);

  $effect(() => {
    if (documentId !== activeDocumentId) {
      activeDocumentId = documentId;
      rendered = false;
      queueThumbnailRender();
    }
  });

  async function renderThumbnails() {
    if (rendered || totalPages === 0 || !containerEl || !pdfSource) return;
    const localDocumentId = documentId;

    try {
      const doc = await loadDocument(pdfSource);
      const canvases = Array.from(containerEl.querySelectorAll('canvas')) as HTMLCanvasElement[];

      for (let i = 0; i < doc.numPages; i++) {
        if (localDocumentId !== documentId) return;

        const page = await doc.getPage(i + 1);
        const canvas = canvases[i];
        if (canvas) {
          await renderThumbnail(page, canvas, 56);
        }
      }

      if (localDocumentId === documentId) rendered = true;
    } catch {
      // Thumbnails are non-critical; silently fail
    }
  }

  async function queueThumbnailRender() {
    await tick();
    if (totalPages > 0) {
      renderThumbnails();
    }
  }

  $effect(() => {
    if (totalPages > 0) {
      queueThumbnailRender();
    }
  });
</script>

<div class="border-t border-gray-200 px-3 py-2" data-testid="page-thumbnails" bind:this={containerEl}>
  <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{t.thumbnails.title}</span>
  <div class="mt-1.5 flex gap-2 overflow-x-auto">
    {#each Array(totalPages) as _, i}
      <button
        class="shrink-0 rounded border-2 transition-colors {currentPage === i + 1 ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}"
        onclick={() => viewerStore.goToPage(i + 1)}
        data-testid={`thumbnail-${i + 1}`}
      >
        <canvas class="block h-10 w-14 rounded-sm bg-gray-100 object-contain"></canvas>
        <span class="block text-center text-[9px] text-gray-500">{i + 1}</span>
      </button>
    {/each}
  </div>
</div>
