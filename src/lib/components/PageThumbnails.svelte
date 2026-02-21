<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { viewerStore } from '$lib/stores/viewer';
  import { loadDocument, renderThumbnail } from '$lib/utils/pdf-renderer';
  import type { PDFDocument } from '$lib/utils/pdf-renderer';

  let { pdfSource = '/sample-blueprint.pdf' }: { pdfSource?: string } = $props();

  let currentPage = $state(1);
  let totalPages = $state(0);
  let thumbnailCanvases: HTMLCanvasElement[] = $state([]);
  let rendered = $state(false);

  const unsub = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    totalPages = v.totalPages;
  });
  onDestroy(unsub);

  async function renderThumbnails() {
    if (rendered || totalPages === 0) return;
    try {
      const doc = await loadDocument(pdfSource);
      for (let i = 0; i < doc.numPages; i++) {
        const page = await doc.getPage(i + 1);
        if (thumbnailCanvases[i]) {
          await renderThumbnail(page, thumbnailCanvases[i], 56);
        }
      }
      rendered = true;
    } catch {
      // Thumbnails are non-critical; silently fail
    }
  }

  $effect(() => {
    if (totalPages > 0 && thumbnailCanvases.length === totalPages) {
      renderThumbnails();
    }
  });
</script>

<div class="border-t border-gray-200 px-3 py-2">
  <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pages</span>
  <div class="mt-1.5 flex gap-2 overflow-x-auto">
    {#each Array(totalPages) as _, i}
      <button
        class="shrink-0 rounded border-2 transition-colors {currentPage === i + 1 ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}"
        onclick={() => viewerStore.goToPage(i + 1)}
      >
        <canvas
          bind:this={thumbnailCanvases[i]}
          class="block h-10 w-14 rounded-sm bg-gray-100 object-contain"
        ></canvas>
        <span class="block text-center text-[9px] text-gray-500">{i + 1}</span>
      </button>
    {/each}
  </div>
</div>
