<script lang="ts">
  import AppToolbar from '$lib/components/AppToolbar.svelte';
  import IssuesPanel from '$lib/components/IssuesPanel.svelte';
  import DocumentViewer from '$lib/components/DocumentViewer.svelte';
  import IssueDetail from '$lib/components/IssueDetail.svelte';
  import PageThumbnails from '$lib/components/PageThumbnails.svelte';
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';

  let pdfSource = $state('/sample-blueprint.pdf');
  let viewerRef: DocumentViewer;

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        viewerRef.loadNewPdf(reader.result);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Don't capture when typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key) {
      case 'j': {
        const issue = issuesStore.selectNext();
        if (issue) viewerStore.goToPage(issue.page);
        break;
      }
      case 'k': {
        const issue = issuesStore.selectPrev();
        if (issue) viewerStore.goToPage(issue.page);
        break;
      }
      case 'n':
        viewerStore.nextPage();
        break;
      case 'p':
        viewerStore.prevPage();
        break;
      case '=':
      case '+':
        viewerStore.zoomIn();
        break;
      case '-':
        viewerStore.zoomOut();
        break;
      case '0':
        viewerStore.resetZoom();
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen flex-col bg-gray-50">
  <AppToolbar onFileUpload={handleFileUpload} />

  <div class="flex flex-1 overflow-hidden">
    <!-- Left: Issues panel + thumbnails -->
    <div class="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <IssuesPanel />
      </div>
      <PageThumbnails pdfSource={pdfSource} />
    </div>

    <!-- Center: Document viewer -->
    <DocumentViewer bind:this={viewerRef} pdfSource={pdfSource} />

    <!-- Right: Issue detail -->
    <IssueDetail />
  </div>
</div>
