# Gemini AI Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded mock issues with real Gemini 2.5 Flash AI analysis that evaluates construction blueprints using criteria-based QA/QC, matching Structured AI's product workflow.

**Architecture:** Client renders each PDF page to a base64 PNG, sends to a SvelteKit server route that calls Gemini's REST API with a structured prompt. Gemini returns JSON with criteria results (PASS/FAIL/N/A) and issues with bounding boxes (0-1000 normalized). Server converts to our 0-1 format and returns to client, which loads results into stores.

**Tech Stack:** SvelteKit API routes, Google Gemini 2.5 Flash REST API, existing pdf.js + Svelte stores.

---

### Task 1: Add QACriterion and AnalysisResponse types

**Files:**
- Modify: `src/lib/types/index.ts`

**Step 1: Write the failing type check**

Add the new types to `src/lib/types/index.ts`. After the existing `StatusFilter` type (line 33), add:

```ts
// --- Gemini AI Analysis Types ---

export type CriterionResult = 'pass' | 'fail' | 'not-applicable';

export type QACriterion = {
  id: string;           // "EQ-1", "DIM-1"
  name: string;         // "Equipment Labels Present"
  description: string;  // what this criterion checks
  result: CriterionResult;
  summary: string;      // AI-generated explanation
  page: number;         // which page this was evaluated on
};

export type AnalysisResponse = {
  criteria: QACriterion[];
  issues: Issue[];
};
```

Also extend the `Issue` type (line 12-21) to add an optional `criterionId`:

```ts
export type Issue = {
  id: string;
  page: number;           // 1-indexed
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
  criterionId?: string;   // optional link to parent QA criterion
};
```

**Step 2: Verify types compile**

Run: `npm run check`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/lib/types/index.ts
git commit -m "feat: add QACriterion and AnalysisResponse types for Gemini integration"
```

---

### Task 2: Create page-to-image utility

**Files:**
- Create: `src/lib/utils/page-to-image.ts`

**Step 1: Write the utility**

This utility renders a PDF page to a base64 PNG string for sending to Gemini. It uses an OffscreenCanvas (or regular canvas fallback) to avoid touching the DOM viewer canvas.

Create `src/lib/utils/page-to-image.ts`:

```ts
import type { PDFPageProxy } from 'pdfjs-dist';

/**
 * Render a PDF page to a base64-encoded PNG data URL.
 * Targets ~1500px on the long edge for a quality/cost balance with Gemini.
 */
export async function pageToBase64(page: PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const maxDim = Math.max(viewport.width, viewport.height);
  const targetPx = 1500;
  const scale = targetPx / maxDim;

  const scaledViewport = page.getViewport({ scale });
  const width = Math.floor(scaledViewport.width);
  const height = Math.floor(scaledViewport.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for page-to-image');

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
  }).promise;

  // Return as data URL (base64 PNG)
  return canvas.toDataURL('image/png');
}
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/utils/page-to-image.ts
git commit -m "feat: add page-to-image utility for rendering PDF pages to base64 PNG"
```

---

### Task 3: Create the Gemini API server route

**Files:**
- Create: `src/routes/api/analyze/+server.ts`

**Step 1: Write the API route**

Create `src/routes/api/analyze/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QACriterion, Issue, IssueSeverity, IssueCategory, AnalysisResponse } from '$lib/types';
import { env } from '$env/dynamic/private';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const QA_CRITERIA = [
  { id: 'EQ', name: 'Equipment/Element Labels', description: 'All major equipment, rooms, and elements are labeled' },
  { id: 'DIM', name: 'Dimension Strings', description: 'Dimension lines are present and complete' },
  { id: 'TB', name: 'Title Block & Scale', description: 'Title block present with sheet number, scale indicated' },
  { id: 'FS', name: 'Fire Safety Markings', description: 'Fire exits, fire-rated assemblies, extinguishers marked' },
  { id: 'SYM', name: 'Symbol Consistency', description: 'Symbols match legend, no undefined symbols' },
  { id: 'ANN', name: 'Annotations & Notes', description: 'General notes, callouts, and references present' },
  { id: 'CRD', name: 'Coordination Markers', description: 'Grid lines, column markers, reference bubbles present' },
  { id: 'CLR', name: 'Clearance & Accessibility', description: 'ADA clearances, door swings, egress paths shown' },
];

function buildPrompt(pageNumber: number): string {
  const criteriaList = QA_CRITERIA.map(
    (c) => `- ${c.id}: ${c.name} — ${c.description}`
  ).join('\n');

  return `You are a construction QA/QC reviewer analyzing a blueprint page.

Evaluate this construction drawing (page ${pageNumber}) against these criteria:
${criteriaList}

For each criterion, determine:
- "pass" if the requirement is met
- "fail" if the requirement is NOT met (there's a deficiency)
- "not-applicable" if the criterion doesn't apply to this page type

For each FAILED criterion, identify specific issues with bounding boxes showing where the problem is on the drawing.

Return ONLY valid JSON in this exact format:
{
  "criteria": [
    {
      "id": "EQ-${pageNumber}",
      "criterionKey": "EQ",
      "name": "Equipment/Element Labels",
      "result": "pass" | "fail" | "not-applicable",
      "summary": "Brief explanation of finding"
    }
  ],
  "issues": [
    {
      "title": "Short issue title",
      "description": "Detailed description of the issue",
      "severity": "high" | "medium" | "low",
      "category": "clash" | "missing-label" | "code-violation" | "clearance",
      "criterionKey": "EQ",
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}

IMPORTANT:
- box_2d coordinates are normalized 0-1000 (0=top-left, 1000=bottom-right)
- Only include issues for FAILED criteria
- Be specific about what's missing or wrong
- Severity: high=safety/code violation, medium=missing info, low=minor annotation gap`;
}

type GeminiIssue = {
  title: string;
  description: string;
  severity: string;
  category: string;
  criterionKey: string;
  box_2d: [number, number, number, number];
};

type GeminiCriterion = {
  id: string;
  criterionKey: string;
  name: string;
  result: string;
  summary: string;
};

type GeminiPageResult = {
  criteria: GeminiCriterion[];
  issues: GeminiIssue[];
};

function convertBbox(box: [number, number, number, number]) {
  const [ymin, xmin, ymax, xmax] = box;
  return {
    x: Math.max(0, Math.min(1, xmin / 1000)),
    y: Math.max(0, Math.min(1, ymin / 1000)),
    width: Math.max(0, Math.min(1, (xmax - xmin) / 1000)),
    height: Math.max(0, Math.min(1, (ymax - ymin) / 1000)),
  };
}

const VALID_SEVERITIES = new Set(['high', 'medium', 'low']);
const VALID_CATEGORIES = new Set(['clash', 'missing-label', 'code-violation', 'clearance']);

async function analyzePage(
  pageNumber: number,
  imageBase64: string,
  apiKey: string
): Promise<GeminiPageResult> {
  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(pageNumber) },
          {
            inline_data: {
              mime_type: 'image/png',
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.2,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini response');

  return JSON.parse(text) as GeminiPageResult;
}

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return error(500, 'GEMINI_API_KEY is not configured. Set it in your .env file.');
  }

  const { pages } = await request.json() as {
    pages: { pageNumber: number; image: string }[];
  };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return error(400, 'Request must include a non-empty "pages" array.');
  }

  const allCriteria: QACriterion[] = [];
  const allIssues: Issue[] = [];
  let issueCounter = 1;

  for (const page of pages) {
    try {
      const result = await analyzePage(page.pageNumber, page.image, apiKey);

      // Convert criteria
      for (const c of result.criteria) {
        const validResult = ['pass', 'fail', 'not-applicable'].includes(c.result)
          ? c.result as QACriterion['result']
          : 'not-applicable';

        allCriteria.push({
          id: c.id || `${c.criterionKey}-${page.pageNumber}`,
          name: c.name,
          description: QA_CRITERIA.find((q) => q.id === c.criterionKey)?.description ?? '',
          result: validResult,
          summary: c.summary ?? '',
          page: page.pageNumber,
        });
      }

      // Convert issues
      for (const issue of result.issues) {
        const severity: IssueSeverity = VALID_SEVERITIES.has(issue.severity)
          ? (issue.severity as IssueSeverity)
          : 'medium';
        const category: IssueCategory = VALID_CATEGORIES.has(issue.category)
          ? (issue.category as IssueCategory)
          : 'missing-label';

        allIssues.push({
          id: `ISS-${String(issueCounter++).padStart(3, '0')}`,
          page: page.pageNumber,
          title: issue.title,
          description: issue.description,
          severity,
          status: 'open',
          category,
          bbox: convertBbox(issue.box_2d),
          criterionId: `${issue.criterionKey}-${page.pageNumber}`,
        });
      }
    } catch (err) {
      // If a single page fails, add a note but continue
      console.error(`Analysis failed for page ${page.pageNumber}:`, err);
      allCriteria.push({
        id: `ERR-${page.pageNumber}`,
        name: 'Analysis Error',
        description: 'Failed to analyze this page',
        result: 'not-applicable',
        summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        page: page.pageNumber,
      });
    }
  }

  return json({ criteria: allCriteria, issues: allIssues } satisfies AnalysisResponse);
};
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/routes/api/analyze/+server.ts
git commit -m "feat: add Gemini API route for blueprint analysis with criteria-based QA"
```

---

### Task 4: Add criteria store and analysis state

**Files:**
- Modify: `src/lib/stores/issues.ts`

**Step 1: Extend the issues store**

Add a `criteria` writable, an `analysisState` writable (for progress tracking), and expose them. Modify `src/lib/stores/issues.ts`:

After the existing imports (line 1-2), add:
```ts
import type { Issue, IssueStatus, SeverityFilter, StatusFilter, QACriterion } from '$lib/types';
```

Inside `createIssuesStore()`, after `const statusFilter` (line 9), add:
```ts
  const criteria = writable<QACriterion[]>([]);
  const analysisState = writable<{
    status: 'idle' | 'analyzing' | 'done' | 'error';
    currentPage: number;
    totalPages: number;
    error: string | null;
  }>({ status: 'idle', currentPage: 0, totalPages: 0, error: null });

  const criteriaForPage = (page: number) =>
    derived(criteria, ($criteria) => $criteria.filter((c) => c.page === page));
```

In the return object, add these new entries:
```ts
    criteria,
    analysisState,
    criteriaForPage,

    loadCriteria: (data: QACriterion[]) => criteria.set(data),

    setAnalysisState: (state: Partial<{
      status: 'idle' | 'analyzing' | 'done' | 'error';
      currentPage: number;
      totalPages: number;
      error: string | null;
    }>) => analysisState.update((s) => ({ ...s, ...state })),
```

Also update `loadIssues` to also reset criteria and analysis state:
```ts
    loadIssues: (data: Issue[]) => {
      issues.set(data);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      criteria.set([]);
      analysisState.set({ status: 'idle', currentPage: 0, totalPages: 0, error: null });
    },
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No type errors.

**Step 3: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass (the new store fields don't break existing behavior).

**Step 4: Commit**

```bash
git add src/lib/stores/issues.ts
git commit -m "feat: add criteria store and analysis state tracking"
```

---

### Task 5: Create AnalysisProgress overlay component

**Files:**
- Create: `src/lib/components/AnalysisProgress.svelte`

**Step 1: Write the component**

Create `src/lib/components/AnalysisProgress.svelte`:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';

  let { onCancel }: { onCancel?: () => void } = $props();

  let status = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  let currentPage = $state(0);
  let totalPages = $state(0);
  let errorMsg = $state<string | null>(null);

  const unsub = issuesStore.analysisState.subscribe((s) => {
    status = s.status;
    currentPage = s.currentPage;
    totalPages = s.totalPages;
    errorMsg = s.error;
  });
  onDestroy(unsub);

  let progress = $derived(totalPages > 0 ? (currentPage / totalPages) * 100 : 0);
</script>

{#if status === 'analyzing'}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="analysis-progress">
    <div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <svg class="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Analyzing Blueprint</h3>
          <p class="text-xs text-gray-500">
            {#if currentPage > 0}
              Checking page {currentPage} of {totalPages}...
            {:else}
              Preparing analysis...
            {/if}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full bg-blue-600 transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>

      <button
        class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onclick={() => onCancel?.()}
        data-testid="cancel-analysis"
      >
        Cancel
      </button>
    </div>
  </div>
{/if}

{#if status === 'error'}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="analysis-error">
    <div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Analysis Failed</h3>
          <p class="text-xs text-red-600">{errorMsg ?? 'Unknown error'}</p>
        </div>
      </div>

      <button
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        onclick={() => issuesStore.setAnalysisState({ status: 'idle', error: null })}
        data-testid="dismiss-error"
      >
        Dismiss
      </button>
    </div>
  </div>
{/if}
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/components/AnalysisProgress.svelte
git commit -m "feat: add AnalysisProgress overlay with per-page progress and cancel"
```

---

### Task 6: Create CriteriaPanel component

**Files:**
- Create: `src/lib/components/CriteriaPanel.svelte`

**Step 1: Write the component**

This replaces the right sidebar content when criteria data is available, showing PASS/FAIL/N/A cards matching Structured AI's UI.

Create `src/lib/components/CriteriaPanel.svelte`:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import type { QACriterion } from '$lib/types';

  let criteria: QACriterion[] = $state([]);
  let selectedCriterionId: string | null = $state(null);

  const unsub = issuesStore.criteria.subscribe((v) => (criteria = v));
  onDestroy(unsub);

  function getResultStyle(result: QACriterion['result']) {
    switch (result) {
      case 'pass':
        return { bg: 'bg-green-50 border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-800', label: 'PASS' };
      case 'fail':
        return { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-800', label: 'FAIL' };
      case 'not-applicable':
        return { bg: 'bg-gray-50 border-gray-200', icon: 'text-gray-400', badge: 'bg-gray-100 text-gray-500', label: 'N/A' };
    }
  }

  function handleCriterionClick(criterion: QACriterion) {
    if (criterion.result === 'fail') {
      if (selectedCriterionId === criterion.id) {
        // Deselect — clear filter
        selectedCriterionId = null;
        issuesStore.setSeverityFilter('all');
      } else {
        selectedCriterionId = criterion.id;
        // Filter issues to show only those linked to this criterion
        // We use severity filter reset + let the panel highlight matching issues
      }
    }
  }

  // Group by page
  function groupByPage(items: QACriterion[]): Map<number, QACriterion[]> {
    const groups = new Map<number, QACriterion[]>();
    for (const c of items) {
      if (!groups.has(c.page)) groups.set(c.page, []);
      groups.get(c.page)!.push(c);
    }
    return groups;
  }

  let grouped = $derived(groupByPage(criteria));
  let pages = $derived([...grouped.keys()].sort((a, b) => a - b));

  let stats = $derived({
    pass: criteria.filter((c) => c.result === 'pass').length,
    fail: criteria.filter((c) => c.result === 'fail').length,
    na: criteria.filter((c) => c.result === 'not-applicable').length,
  });
</script>

<div class="flex h-full flex-col" data-testid="criteria-panel">
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">QA Criteria</h2>
    <div class="mt-1 flex items-center gap-2 text-xs">
      <span class="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700">{stats.pass} pass</span>
      <span class="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">{stats.fail} fail</span>
      <span class="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">{stats.na} n/a</span>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5">
          <span class="text-xs font-medium text-gray-500">Page {page}</span>
        </div>
        {#each grouped.get(page) ?? [] as criterion (criterion.id)}
          {@const style = getResultStyle(criterion.result)}
          <button
            class="w-full border-l-2 px-4 py-3 text-left transition-colors {style.bg} {selectedCriterionId === criterion.id ? 'border-l-blue-600' : 'border-l-transparent'} hover:brightness-95"
            onclick={() => handleCriterionClick(criterion)}
            data-testid={`criterion-${criterion.id}`}
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-800">{criterion.name}</span>
              <span class="rounded px-1.5 py-0.5 text-[10px] font-bold {style.badge}">{style.label}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-gray-600">{criterion.summary}</p>
          </button>
        {/each}
      </div>
    {/each}

    {#if criteria.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        No analysis results yet
      </div>
    {/if}
  </div>
</div>
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/components/CriteriaPanel.svelte
git commit -m "feat: add CriteriaPanel with PASS/FAIL/N/A cards grouped by page"
```

---

### Task 7: Add "Run Check" button to AppToolbar

**Files:**
- Modify: `src/lib/components/AppToolbar.svelte`

**Step 1: Extend the toolbar**

Add an `onRunAnalysis` callback prop and a "Run Check" / "Re-run Check" button. Modify `src/lib/components/AppToolbar.svelte`:

Update the props destructuring (line 7) to add the new callback:
```ts
  let { onFileUpload, onResetZoom, onRunAnalysis }: {
    onFileUpload?: (file: File) => void;
    onResetZoom?: () => void;
    onRunAnalysis?: () => void;
  } = $props();
```

Add analysis state tracking. After the existing store subscriptions (line 18-19), add:
```ts
  let analysisStatus = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const unsubAnalysis = issuesStore.analysisState.subscribe((s) => (analysisStatus = s.status));
```

Update the `onDestroy` (line 20) to also clean up the new subscription:
```ts
  onDestroy(() => { unsubViewer(); unsubSev(); unsubStat(); unsubAnalysis(); });
```

In the template, after the Upload button + hidden input (after line 70), add:

```svelte
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
```

**Step 2: Verify it compiles**

Run: `npm run check`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/components/AppToolbar.svelte
git commit -m "feat: add Run Check / Re-run Check button to toolbar"
```

---

### Task 8: Add right sidebar tab switching (Issues vs Criteria)

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/IssueDetail.svelte` (minor — wrap in a container)

**Step 1: Add tab state and CriteriaPanel to the right sidebar**

In `src/routes/+page.svelte`, add the new imports at the top of the script:

```ts
  import AnalysisProgress from '$lib/components/AnalysisProgress.svelte';
  import CriteriaPanel from '$lib/components/CriteriaPanel.svelte';
```

Add a tab state variable:
```ts
  let rightTab = $state<'issues' | 'criteria'>('issues');
```

Replace the right sidebar section (line 187: `<IssueDetail />`) with:

```svelte
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
            QA Criteria
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
```

**Step 2: Update IssueDetail to fill its container**

In `src/lib/components/IssueDetail.svelte`, change the outer `<aside>` (line 32):

From:
```svelte
<aside class="flex h-full w-52 shrink-0 flex-col border-l border-gray-200 bg-white lg:w-64" data-testid="issue-detail">
```

To (remove width, border, and shrink since parent now handles sizing):
```svelte
<aside class="flex h-full flex-col bg-white" data-testid="issue-detail">
```

**Step 3: Verify it compiles**

Run: `npm run check`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/IssueDetail.svelte
git commit -m "feat: add tabbed right sidebar with Issue Detail and QA Criteria tabs"
```

---

### Task 9: Wire up the full analysis flow in +page.svelte

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add the analysis function**

This is the core integration. Add the `pageToBase64` import and `runAnalysis` function to `src/routes/+page.svelte`.

Add imports:
```ts
  import { loadDocument } from '$lib/utils/pdf-renderer';
  import { pageToBase64 } from '$lib/utils/page-to-image';
  import type { Issue, AnalysisResponse } from '$lib/types';
```

Add an AbortController ref:
```ts
  let analysisAbortController: AbortController | null = $state(null);
```

Add the `runAnalysis` function:
```ts
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
      issuesStore.setAnalysisState({ currentPage: totalPages }); // Show "all pages processed"
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

      // Load results into stores
      issuesStore.loadIssues(data.issues);
      issuesStore.loadCriteria(data.criteria);
      issuesStore.setAnalysisState({ status: 'done' });
    } catch (err) {
      if (abortController.signal.aborted) {
        issuesStore.setAnalysisState({ status: 'idle' });
        return;
      }
      console.error('Analysis failed:', err);
      issuesStore.setAnalysisState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
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
```

**Step 2: Update handleLoadDemo to run analysis**

Replace `handleLoadDemo` (lines 42-53):
```ts
  async function handleLoadDemo() {
    uploadError = null;

    pdfSource = '/sample-blueprint.pdf';
    documentId += 1;
    documentLoaded = true;

    // Run real AI analysis instead of loading mock issues
    await runAnalysis();
  }
```

**Step 3: Update handleFileUpload to run analysis**

Replace lines 38-39 inside `handleFileUpload` (after setting documentLoaded):
```ts
    // Run AI analysis on the uploaded PDF
    await runAnalysis();
```

**Step 4: Wire up the toolbar and progress overlay**

Update the `AppToolbar` usage (line 166) to pass `onRunAnalysis`:
```svelte
    <AppToolbar onFileUpload={handleFileUpload} onResetZoom={handleResetZoom} onRunAnalysis={runAnalysis} />
```

Add the `AnalysisProgress` overlay. Inside the `{:else}` block (after the toolbar, before the flex container), add:
```svelte
    <AnalysisProgress onCancel={cancelAnalysis} />
```

**Step 5: Verify it compiles**

Run: `npm run check`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: wire up full Gemini analysis flow with progress and cancel"
```

---

### Task 10: Set up environment variables

**Files:**
- Create: `.env.example`
- Create: `.env` (gitignored)
- Modify: `.gitignore` (ensure .env is listed)

**Step 1: Create .env.example**

Create `.env.example`:
```
# Get your API key at https://aistudio.google.com/apikey
GEMINI_API_KEY=your_key_here
```

**Step 2: Create .env (local only)**

Create `.env`:
```
GEMINI_API_KEY=
```

**Step 3: Ensure .env is in .gitignore**

Check `.gitignore` and add `.env` if not already present.

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example for Gemini API key setup"
```

---

### Task 11: Integration testing

**Step 1: Start the dev server and test with demo**

Run: `npm run dev`

Before testing, you need a Gemini API key set in `.env`:
```
GEMINI_API_KEY=your_actual_key_here
```

Get one free at: https://aistudio.google.com/apikey

**Step 2: Test the full flow**

1. Click "Try Demo" — should show analysis progress overlay
2. Progress should update per page: "Checking page 1 of 4...", etc.
3. After analysis completes, criteria should appear in the "QA Criteria" tab
4. Issues with bounding boxes should appear on the drawing
5. Click "Cancel" during analysis — should stop and return to idle
6. Click "Run Check" in toolbar — should re-run analysis
7. "Re-run Check" appears after first analysis completes
8. Upload a different PDF — should automatically run analysis

**Step 3: Test error handling**

1. Remove `GEMINI_API_KEY` from `.env` — should show error: "GEMINI_API_KEY is not configured"
2. Set an invalid key — should show Gemini API error message
3. Dismiss error and retry

**Step 4: Fix any bugs found**

Address issues as they come up.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: integration fixes from Gemini analysis testing"
```

---

### Task 12: Verify build and deploy

**Step 1: Run type check**

Run: `npm run check`
Expected: No errors.

**Step 2: Run tests**

Run: `npm run test`
Expected: All existing tests pass.

**Step 3: Build for production**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: verify build passes with Gemini integration"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add QACriterion and AnalysisResponse types |
| 2 | Create page-to-image utility |
| 3 | Create Gemini API server route |
| 4 | Add criteria store and analysis state |
| 5 | Create AnalysisProgress overlay component |
| 6 | Create CriteriaPanel component |
| 7 | Add "Run Check" button to toolbar |
| 8 | Add right sidebar tab switching |
| 9 | Wire up full analysis flow in +page.svelte |
| 10 | Set up environment variables |
| 11 | Integration testing |
| 12 | Verify build and deploy |
