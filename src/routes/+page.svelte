<script lang="ts">
  import { onDestroy } from 'svelte';
  import AppToolbar from '$lib/components/AppToolbar.svelte';
  import IssuesPanel from '$lib/components/IssuesPanel.svelte';
  import DocumentViewer from '$lib/components/DocumentViewer.svelte';
  import IssueDetail from '$lib/components/IssueDetail.svelte';
  import CriteriaPanel from '$lib/components/CriteriaPanel.svelte';
  import PageThumbnails from '$lib/components/PageThumbnails.svelte';
  import AnalysisProgress from '$lib/components/AnalysisProgress.svelte';
  import MetricsPanel from '$lib/components/MetricsPanel.svelte';
  import ReportPreview from '$lib/components/ReportPreview.svelte';
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import { loadDocument } from '$lib/utils/pdf-renderer';
  import { pageToBase64 } from '$lib/utils/page-to-image';
  import type { Issue, AnalysisResponse } from '$lib/types';
  import { t } from '$lib/config/app-config';

  let rightTab = $state<'issues' | 'criteria'>('issues');
  let documentLoaded = $state(false);
  let pdfSource = $state<string | ArrayBuffer>('');
  let documentId = $state(0);
  let fitRequested = $state(0);
  let uploadError = $state<string | null>(null);
  let blobUrl = $state<string | null>(null);
  let analysisAbortController: AbortController | null = $state(null);
  let showMetrics = $state(false);
  let showReport = $state(false);

  async function handleFileUpload(file: File) {
    if (file.type && file.type !== 'application/pdf') {
      uploadError = t.upload.errorNotPdf;
      return;
    }

    uploadError = null;

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }

    const objectUrl = URL.createObjectURL(file);
    blobUrl = objectUrl;
    pdfSource = objectUrl;
    documentId += 1;
    documentLoaded = true;

    // Run AI analysis on the uploaded PDF
    await runAnalysis();
  }

  async function handleLoadDemo() {
    uploadError = null;

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }

    pdfSource = '/demo-blueprint.pdf';
    documentId += 1;
    documentLoaded = true;

    // Run AI analysis on the demo blueprint
    await runAnalysis();
  }


  async function runAnalysis() {
    if (!pdfSource) return;

    // Reset state
    issuesStore.loadIssues([]);
    issuesStore.setAnalysisState({ status: 'analyzing', currentPage: 0, totalPages: 0, error: null });
    rightTab = 'criteria';

    const abortController = new AbortController();
    analysisAbortController = abortController;

    try {
      // Load the PDF document
      const doc = await loadDocument(pdfSource);
      const totalPages = doc.numPages;
      issuesStore.setAnalysisState({ totalPages });

      // Render each page to base64
      const pageImages: { pageNumber: number; image: string }[] = [];
      for (let i = 1; i <= totalPages; i++) {
        if (abortController.signal.aborted) return;

        issuesStore.setAnalysisState({ currentPage: i });
        const page = await doc.getPage(i);
        const base64 = await pageToBase64(page);
        pageImages.push({ pageNumber: i, image: base64 });
      }

      if (abortController.signal.aborted) return;

      // Send to API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pageImages }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const data: AnalysisResponse = await res.json();

      // Load results into stores using the new method that handles metadata
      issuesStore.loadAnalysisResult({
        criteria: data.criteria,
        issues: data.issues,
        metadata: data.metadata,
      });
    } catch (err) {
      if (abortController.signal.aborted) {
        issuesStore.setAnalysisState({ status: 'idle' });
        return;
      }
      console.error('Analysis failed:', err);
      issuesStore.setAnalysisState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        emptyIssues: false,
      });
    } finally {
      analysisAbortController = null;
    }
  }

  function cancelAnalysis() {
    analysisAbortController?.abort();
    analysisAbortController = null;
    issuesStore.setAnalysisState({ status: 'idle' });
  }

  function handleViewerError(message: string | null) {
    uploadError = message;
  }

  function handleResetZoom() {
    fitRequested += 1;
  }

  onDestroy(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  });

  // Keyboard shortcuts (only active when document is loaded)
  function handleKeydown(e: KeyboardEvent) {
    if (!documentLoaded) return;
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
        handleResetZoom();
        break;
    }
  }

  // Welcome screen file input
  let welcomeFileInput = $state<HTMLInputElement>(undefined!);
  function handleWelcomeFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFileUpload(file);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen flex-col bg-gray-50" data-testid="app-root">
  {#if !documentLoaded}
    <!-- Welcome state -->
    <div class="flex flex-1 items-center justify-center">
      <div class="mx-4 max-w-lg text-center">
        <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
          <img src="/logo.svg" alt="Structured AI" class="h-8 w-8" />
        </div>

        <h1 class="mb-2 text-2xl font-bold text-gray-900">{t.welcome.title}</h1>
        <p class="mb-8 text-sm text-gray-500">
          {t.welcome.description}
        </p>

        <div class="flex items-center justify-center">
          <button
            class="mr-3 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
            onclick={handleLoadDemo}
            data-testid="load-demo-button"
          >
            Load Demo Blueprint
          </button>
          <button
            class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            onclick={() => welcomeFileInput.click()}
            data-testid="welcome-upload"
          >
            {t.welcome.uploadButton}
          </button>
          <input
            bind:this={welcomeFileInput}
            type="file"
            accept=".pdf"
            class="hidden"
            onchange={handleWelcomeFileChange}
          />
        </div>

        {#if uploadError}
          <p class="mt-4 text-sm text-red-600">{uploadError}</p>
        {/if}

        <div class="mt-10 text-xs text-gray-400">
          <p class="mb-1 font-medium text-gray-500">{t.welcome.keyboardShortcutsTitle}</p>
          <p><kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">j</kbd> / <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">k</kbd> next/prev issue &nbsp; <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">n</kbd> / <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">p</kbd> next/prev page &nbsp; <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">+</kbd> / <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono">-</kbd> zoom</p>
        </div>
      </div>
    </div>
  {:else}
    <!-- Document loaded — full viewer UI -->
    <AppToolbar onFileUpload={handleFileUpload} onResetZoom={handleResetZoom} onRunAnalysis={runAnalysis} onShowMetrics={() => showMetrics = true} onExportReport={() => showReport = true} />

    <AnalysisProgress onCancel={cancelAnalysis} />

    {#if showMetrics}
      <MetricsPanel onClose={() => showMetrics = false} />
    {/if}

    {#if showReport}
      <ReportPreview onClose={() => showReport = false} />
    {/if}

    {#if uploadError}
      <div class="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" data-testid="upload-error">
        {uploadError}
      </div>
    {/if}

    <div class="flex flex-1 overflow-hidden">
      <!-- Left sidebar: issues + thumbnails -->
      <div class="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white lg:w-72" data-testid="issues-column">
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <IssuesPanel />
        </div>
        <PageThumbnails pdfSource={pdfSource} documentId={documentId} />
      </div>

      <!-- Center: PDF viewer -->
      <DocumentViewer pdfSource={pdfSource} {documentId} {fitRequested} onError={handleViewerError} />

      <!-- Right sidebar: issue detail / criteria -->
      <div class="flex w-52 shrink-0 flex-col border-l border-gray-200 bg-white lg:w-64" data-testid="right-sidebar">
        <!-- Tab header -->
        <div class="flex border-b border-gray-200">
          <button
            class="flex-1 py-2 text-xs font-medium transition-colors {rightTab === 'issues' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
            onclick={() => rightTab = 'issues'}
            data-testid="tab-issues"
          >
            Issue Detail
          </button>
          <button
            class="flex-1 py-2 text-xs font-medium transition-colors {rightTab === 'criteria' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
            onclick={() => rightTab = 'criteria'}
            data-testid="tab-criteria"
          >
            {t.panels.criteria.title}
          </button>
        </div>

        <!-- Tab content -->
        <div class="flex-1 overflow-hidden">
          {#if rightTab === 'issues'}
            <IssueDetail />
          {:else}
            <CriteriaPanel />
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
