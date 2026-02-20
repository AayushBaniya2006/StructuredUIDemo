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
          await renderThumbnail(page, thumbnailCanvases[i], 100);
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

<div class="flex flex-col gap-2 border-t border-gray-200 p-2">
  <span class="px-2 text-xs font-medium text-gray-400">Pages</span>
  <div class="flex flex-col gap-1.5 overflow-y-auto">
    {#each Array(totalPages) as _, i}
      <button
        class="rounded border-2 transition-colors {currentPage === i + 1 ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}"
        onclick={() => viewerStore.goToPage(i + 1)}
      >
        <canvas
          bind:this={thumbnailCanvases[i]}
          class="block w-full rounded-sm bg-gray-100"
        ></canvas>
        <span class="block text-center text-[10px] text-gray-500 mt-0.5">{i + 1}</span>
      </button>
    {/each}
  </div>
</div>
