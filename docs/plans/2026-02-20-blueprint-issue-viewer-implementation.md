# Blueprint Issue Review Viewer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a construction blueprint issue review viewer that demonstrates the "AI found issues → human reviews in viewer" workflow for a Structured AI internship cold email.

**Architecture:** SvelteKit single-page app with pdf.js canvas rendering, SVG bounding-box overlays, and reactive Svelte 5 stores for state. Three-column layout: issues panel (left), PDF viewer (center), issue detail (right).

**Tech Stack:** SvelteKit + Vite, TypeScript, pdf.js (pdfjs-dist), Tailwind CSS v4, Vitest for testing.

---

### Task 1: Scaffold SvelteKit project with TypeScript and Tailwind

**Files:**
- Create: project root via `npx sv create`
- Modify: `package.json` (add pdfjs-dist)
- Modify: `svelte.config.js` (ensure SSR disabled for pdf.js compatibility)
- Create: `src/app.css` (Tailwind directives)

**Step 1: Create SvelteKit project**

Run:
```bash
cd /Volumes/CS_Stuff/StructuredUIDemo
npx sv create . --template minimal --types ts --no-add-ons --no-install
```

If `sv` prompts, select: SvelteKit minimal, TypeScript, no additional options.

**Step 2: Install dependencies**

Run:
```bash
npm install
npm install pdfjs-dist
npm install -D @tailwindcss/vite tailwindcss
```

**Step 3: Configure Tailwind CSS v4**

Add Tailwind Vite plugin to `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
```

Create/replace `src/app.css`:

```css
@import 'tailwindcss';
```

Import it in `src/routes/+layout.svelte`:

```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

**Step 4: Disable SSR (pdf.js needs browser APIs)**

Create `src/routes/+layout.ts`:

```ts
export const ssr = false;
```

**Step 5: Verify it runs**

Run: `npm run dev`
Expected: App loads at localhost:5173 with no errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "scaffold: SvelteKit + TypeScript + Tailwind CSS + pdfjs-dist"
```

---

### Task 2: Define types and mock issue data

**Files:**
- Create: `src/lib/types/index.ts`
- Create: `src/lib/data/issues.json`

**Step 1: Write the types**

Create `src/lib/types/index.ts`:

```ts
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';
export type IssueCategory = 'clash' | 'missing-label' | 'code-violation' | 'clearance';

export type BoundingBox = {
  x: number;      // normalized 0–1 from left
  y: number;      // normalized 0–1 from top
  width: number;  // normalized 0–1
  height: number; // normalized 0–1
};

export type Issue = {
  id: string;
  page: number;           // 1-indexed
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
};

export type ViewerState = {
  currentPage: number;
  totalPages: number;
  zoom: number;
  panX: number;
  panY: number;
  showAllOverlays: boolean;
};

export type SeverityFilter = IssueSeverity | 'all';
export type StatusFilter = IssueStatus | 'all';
```

**Step 2: Create mock issues data**

Create `src/lib/data/issues.json` with 18 realistic construction issues across 4 pages:

```json
[
  {
    "id": "ISS-001",
    "page": 1,
    "title": "Missing door swing annotation",
    "description": "Door D-103 in the main corridor is missing the swing direction annotation. Per ADA compliance, all egress doors must show swing direction on plan drawings.",
    "severity": "medium",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.35, "y": 0.42, "width": 0.08, "height": 0.06 }
  },
  {
    "id": "ISS-002",
    "page": 1,
    "title": "Room label missing for storage area",
    "description": "The storage area adjacent to the lobby does not have a room number or name label. All enclosed spaces must be labeled per drawing standards.",
    "severity": "low",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.12, "y": 0.65, "width": 0.10, "height": 0.08 }
  },
  {
    "id": "ISS-003",
    "page": 1,
    "title": "Fire exit path not marked",
    "description": "The northwest stairwell exit path is not marked on the ground floor plan. Building code requires all emergency egress routes to be clearly indicated.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.05, "y": 0.08, "width": 0.12, "height": 0.10 }
  },
  {
    "id": "ISS-004",
    "page": 1,
    "title": "Dimension string gap at column line",
    "description": "Dimension chain breaks at column line C-3. The gap between gridlines B and D is not dimensioned, making field layout ambiguous.",
    "severity": "medium",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.55, "y": 0.20, "width": 0.15, "height": 0.04 }
  },
  {
    "id": "ISS-005",
    "page": 1,
    "title": "Window schedule reference mismatch",
    "description": "Window W-105 on plan references type 'A3' but the window schedule lists it as type 'B2'. Verify correct window type for this opening.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.78, "y": 0.50, "width": 0.06, "height": 0.05 }
  },
  {
    "id": "ISS-006",
    "page": 2,
    "title": "Insufficient corridor width",
    "description": "Corridor between rooms 201 and 203 measures 32 inches on plan. Minimum corridor width per IBC is 44 inches for occupant loads over 50.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.40, "y": 0.30, "width": 0.04, "height": 0.20 }
  },
  {
    "id": "ISS-007",
    "page": 2,
    "title": "Bathroom vent not shown",
    "description": "Room 204 (bathroom) does not show an exhaust vent on the first floor plan. Mechanical ventilation is required for interior bathrooms per IMC.",
    "severity": "medium",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.62, "y": 0.55, "width": 0.08, "height": 0.07 }
  },
  {
    "id": "ISS-008",
    "page": 2,
    "title": "Stairwell handrail not indicated",
    "description": "The stairwell between floors does not indicate handrail placement. IBC requires handrails on both sides for stairways wider than 44 inches.",
    "severity": "medium",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.15, "y": 0.10, "width": 0.10, "height": 0.15 }
  },
  {
    "id": "ISS-009",
    "page": 2,
    "title": "Duplicate room number 202",
    "description": "Two different rooms on the first floor are both labeled '202'. Each room must have a unique identifier.",
    "severity": "low",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.70, "y": 0.40, "width": 0.09, "height": 0.07 }
  },
  {
    "id": "ISS-010",
    "page": 3,
    "title": "HVAC duct clashes with beam",
    "description": "The 24-inch supply duct running east-west at gridline 4 intersects with the W12x26 beam at column line B. Duct must be routed below beam or beam must be raised.",
    "severity": "high",
    "status": "open",
    "category": "clash",
    "bbox": { "x": 0.30, "y": 0.35, "width": 0.20, "height": 0.06 }
  },
  {
    "id": "ISS-011",
    "page": 3,
    "title": "Electrical conduit crosses plumbing",
    "description": "2-inch electrical conduit and 4-inch waste pipe share the same routing path at elevation 9'-6\". Minimum 3-inch separation required per NEC.",
    "severity": "high",
    "status": "open",
    "category": "clash",
    "bbox": { "x": 0.55, "y": 0.48, "width": 0.10, "height": 0.08 }
  },
  {
    "id": "ISS-012",
    "page": 3,
    "title": "Sprinkler head coverage gap",
    "description": "Area between gridlines 3-4 and B-C exceeds maximum sprinkler coverage area of 225 sq ft per head. Additional sprinkler head needed.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.38, "y": 0.55, "width": 0.15, "height": 0.12 }
  },
  {
    "id": "ISS-013",
    "page": 3,
    "title": "Return air duct size mismatch",
    "description": "Return air duct shown as 18x12 on plan but mechanical schedule specifies 24x12 for zone 3. Undersized duct will cause air balance issues.",
    "severity": "medium",
    "status": "open",
    "category": "clash",
    "bbox": { "x": 0.10, "y": 0.70, "width": 0.12, "height": 0.05 }
  },
  {
    "id": "ISS-014",
    "page": 3,
    "title": "Missing fire damper at rated wall",
    "description": "Supply duct penetrates 2-hour rated wall at gridline C without a fire damper. Fire dampers required at all rated wall penetrations per NFPA 90A.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.50, "y": 0.25, "width": 0.04, "height": 0.10 }
  },
  {
    "id": "ISS-015",
    "page": 4,
    "title": "Footing undersized for column load",
    "description": "Footing F-4 at column C-3 is shown as 4'x4' but structural calculations require 5'x5' for the applied load of 120 kips.",
    "severity": "high",
    "status": "open",
    "category": "code-violation",
    "bbox": { "x": 0.45, "y": 0.50, "width": 0.08, "height": 0.08 }
  },
  {
    "id": "ISS-016",
    "page": 4,
    "title": "Missing rebar callout",
    "description": "Grade beam GB-2 between footings F-3 and F-5 does not show reinforcement schedule. All structural concrete members must have rebar callouts.",
    "severity": "medium",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.25, "y": 0.45, "width": 0.18, "height": 0.04 }
  },
  {
    "id": "ISS-017",
    "page": 4,
    "title": "Column splice location conflict",
    "description": "Steel column splice at level 2 is shown at 4'-0\" above floor but structural notes require splices at mid-height (5'-6\"). Verify splice elevation.",
    "severity": "medium",
    "status": "open",
    "category": "clash",
    "bbox": { "x": 0.60, "y": 0.30, "width": 0.06, "height": 0.12 }
  },
  {
    "id": "ISS-018",
    "page": 4,
    "title": "Foundation drain not shown",
    "description": "Perimeter foundation drain is not indicated on the structural plan. Geotechnical report recommends drain tile around all footings due to high water table.",
    "severity": "low",
    "status": "open",
    "category": "missing-label",
    "bbox": { "x": 0.02, "y": 0.80, "width": 0.96, "height": 0.04 }
  }
]
```

**Step 3: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/issues.json
git commit -m "feat: add Issue types and mock construction QA data (18 issues)"
```

---

### Task 3: Create Svelte stores for viewer and issues state

**Files:**
- Create: `src/lib/stores/viewer.ts`
- Create: `src/lib/stores/issues.ts`

**Step 1: Write the viewer store**

Create `src/lib/stores/viewer.ts`:

```ts
import { writable, derived } from 'svelte/store';
import type { ViewerState } from '$lib/types';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_RENDER_THRESHOLDS = [0.5, 1, 1.5, 2, 3, 4];

function createViewerStore() {
  const { subscribe, update, set } = writable<ViewerState>({
    currentPage: 1,
    totalPages: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    showAllOverlays: true,
  });

  return {
    subscribe,
    set,
    setTotalPages: (total: number) =>
      update((s) => ({ ...s, totalPages: total })),
    goToPage: (page: number) =>
      update((s) => ({
        ...s,
        currentPage: Math.max(1, Math.min(page, s.totalPages)),
        panX: 0,
        panY: 0,
      })),
    nextPage: () =>
      update((s) => ({
        ...s,
        currentPage: Math.min(s.currentPage + 1, s.totalPages),
        panX: 0,
        panY: 0,
      })),
    prevPage: () =>
      update((s) => ({
        ...s,
        currentPage: Math.max(s.currentPage - 1, 1),
        panX: 0,
        panY: 0,
      })),
    zoomIn: () =>
      update((s) => ({
        ...s,
        zoom: Math.min(s.zoom + ZOOM_STEP, ZOOM_MAX),
      })),
    zoomOut: () =>
      update((s) => ({
        ...s,
        zoom: Math.max(s.zoom - ZOOM_STEP, ZOOM_MIN),
      })),
    zoomTo: (level: number) =>
      update((s) => ({
        ...s,
        zoom: Math.max(ZOOM_MIN, Math.min(level, ZOOM_MAX)),
      })),
    resetZoom: () =>
      update((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 })),
    pan: (dx: number, dy: number) =>
      update((s) => ({ ...s, panX: s.panX + dx, panY: s.panY + dy })),
    setPan: (x: number, y: number) =>
      update((s) => ({ ...s, panX: x, panY: y })),
    toggleOverlays: () =>
      update((s) => ({ ...s, showAllOverlays: !s.showAllOverlays })),
  };
}

export const viewerStore = createViewerStore();

// Derived store: the render scale (snaps to thresholds for canvas re-render)
export const renderScale = derived(viewerStore, ($viewer) => {
  const zoom = $viewer.zoom;
  let best = ZOOM_RENDER_THRESHOLDS[0];
  for (const t of ZOOM_RENDER_THRESHOLDS) {
    if (t <= zoom) best = t;
    else break;
  }
  return best;
});
```

**Step 2: Write the issues store**

Create `src/lib/stores/issues.ts`:

```ts
import { writable, derived } from 'svelte/store';
import type { Issue, IssueSeverity, IssueStatus, SeverityFilter, StatusFilter } from '$lib/types';
import issuesData from '$lib/data/issues.json';

function createIssuesStore() {
  const issues = writable<Issue[]>(issuesData as Issue[]);
  const selectedId = writable<string | null>(null);
  const hoveredId = writable<string | null>(null);
  const severityFilter = writable<SeverityFilter>('all');
  const statusFilter = writable<StatusFilter>('all');

  const filtered = derived(
    [issues, severityFilter, statusFilter],
    ([$issues, $severity, $status]) => {
      return $issues.filter((issue) => {
        if ($severity !== 'all' && issue.severity !== $severity) return false;
        if ($status !== 'all' && issue.status !== $status) return false;
        return true;
      });
    }
  );

  const selected = derived(
    [issues, selectedId],
    ([$issues, $id]) => $issues.find((i) => i.id === $id) ?? null
  );

  const issuesForPage = (page: number) =>
    derived(filtered, ($filtered) =>
      $filtered.filter((i) => i.page === page)
    );

  return {
    issues,
    selectedId,
    hoveredId,
    severityFilter,
    statusFilter,
    filtered,
    selected,
    issuesForPage,

    select: (id: string | null) => selectedId.set(id),
    hover: (id: string | null) => hoveredId.set(id),

    toggleStatus: (id: string) =>
      issues.update(($issues) =>
        $issues.map((i) =>
          i.id === id
            ? { ...i, status: i.status === 'open' ? 'resolved' : 'open' as IssueStatus }
            : i
        )
      ),

    selectNext: () => {
      let currentFiltered: Issue[] = [];
      let currentId: string | null = null;
      filtered.subscribe((v) => (currentFiltered = v))();
      selectedId.subscribe((v) => (currentId = v))();

      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const next = currentFiltered[(idx + 1) % currentFiltered.length];
      selectedId.set(next.id);
      return next;
    },

    selectPrev: () => {
      let currentFiltered: Issue[] = [];
      let currentId: string | null = null;
      filtered.subscribe((v) => (currentFiltered = v))();
      selectedId.subscribe((v) => (currentId = v))();

      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const prev = currentFiltered[(idx - 1 + currentFiltered.length) % currentFiltered.length];
      selectedId.set(prev.id);
      return prev;
    },

    setSeverityFilter: (f: SeverityFilter) => severityFilter.set(f),
    setStatusFilter: (f: StatusFilter) => statusFilter.set(f),
  };
}

export const issuesStore = createIssuesStore();
```

**Step 3: Commit**

```bash
git add src/lib/stores/viewer.ts src/lib/stores/issues.ts
git commit -m "feat: add viewer and issues Svelte stores with filtering"
```

---

### Task 4: Build PDF renderer utility

**Files:**
- Create: `src/lib/utils/pdf-renderer.ts`

**Step 1: Write the PDF renderer**

Create `src/lib/utils/pdf-renderer.ts`:

```ts
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Configure worker — uses the bundled worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export type PDFDocument = PDFDocumentProxy;
export type PDFPage = PDFPageProxy;

export async function loadDocument(source: string | ArrayBuffer): Promise<PDFDocument> {
  const loadingTask = pdfjsLib.getDocument(source);
  return loadingTask.promise;
}

export interface RenderOptions {
  page: PDFPage;
  canvas: HTMLCanvasElement;
  scale: number;
}

export async function renderPage({ page, canvas, scale }: RenderOptions): Promise<void> {
  const viewport = page.getViewport({ scale });
  const outputScale = window.devicePixelRatio || 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context');

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  const transform =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  const renderContext = {
    canvasContext: context,
    transform,
    viewport,
  };

  await page.render(renderContext).promise;
}

export function getPageDimensions(page: PDFPage, scale: number) {
  const viewport = page.getViewport({ scale });
  return {
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height),
  };
}

export async function renderThumbnail(
  page: PDFPage,
  canvas: HTMLCanvasElement,
  maxWidth: number = 120
): Promise<void> {
  const viewport = page.getViewport({ scale: 1 });
  const thumbnailScale = maxWidth / viewport.width;
  await renderPage({ page, canvas, scale: thumbnailScale });
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/pdf-renderer.ts
git commit -m "feat: add pdf.js renderer utility with lazy rendering support"
```

---

### Task 5: Build coordinate utility for bbox mapping

**Files:**
- Create: `src/lib/utils/coordinates.ts`

**Step 1: Write the coordinate utility**

Create `src/lib/utils/coordinates.ts`:

```ts
import type { BoundingBox } from '$lib/types';

/**
 * Convert normalized bbox (0–1) to pixel coordinates for a given canvas size.
 */
export function bboxToPixels(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: bbox.x * canvasWidth,
    y: bbox.y * canvasHeight,
    width: bbox.width * canvasWidth,
    height: bbox.height * canvasHeight,
  };
}

/**
 * Calculate the pan offset to center a bbox in the viewport.
 */
export function centerOnBbox(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): { panX: number; panY: number } {
  const centerX = (bbox.x + bbox.width / 2) * canvasWidth * zoom;
  const centerY = (bbox.y + bbox.height / 2) * canvasHeight * zoom;
  return {
    panX: viewportWidth / 2 - centerX,
    panY: viewportHeight / 2 - centerY,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/coordinates.ts
git commit -m "feat: add bbox-to-pixel coordinate conversion utilities"
```

---

### Task 6: Build the DocumentViewer component

**Files:**
- Create: `src/lib/components/DocumentViewer.svelte`

**Step 1: Write the DocumentViewer**

Create `src/lib/components/DocumentViewer.svelte`:

```svelte
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

  let containerEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
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

  // Subscribe to stores
  const unsubViewer = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    zoom = v.zoom;
    panX = v.panX;
    panY = v.panY;
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
    pdfSource = typeof source === 'string' ? source : pdfSource;
    if (typeof source !== 'string') {
      // ArrayBuffer path
      loadDocument(source).then((doc) => {
        pdfDoc = doc;
        viewerStore.setTotalPages(doc.numPages);
        viewerStore.goToPage(1);
        renderCurrentPage();
      });
    } else {
      loadPdf();
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
    <span>Page {currentPage} of {$viewerStore.totalPages}</span>
    <button
      onclick={() => viewerStore.nextPage()}
      disabled={currentPage >= $viewerStore.totalPages}
      class="rounded px-2 py-0.5 hover:bg-white/20 disabled:opacity-30"
    >
      &rarr;
    </button>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/DocumentViewer.svelte
git commit -m "feat: add DocumentViewer with pdf.js rendering, zoom, and pan"
```

---

### Task 7: Build the BboxOverlay SVG component

**Files:**
- Create: `src/lib/components/BboxOverlay.svelte`

**Step 1: Write the BboxOverlay**

Create `src/lib/components/BboxOverlay.svelte`:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import { bboxToPixels } from '$lib/utils/coordinates';
  import { derived } from 'svelte/store';

  let { width, height, page }: { width: number; height: number; page: number } = $props();

  const pageIssues = $derived(issuesStore.issuesForPage(page));
  let issues: import('$lib/types').Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let hoveredId: string | null = $state(null);
  let showAll = $state(true);

  // Subscribe to reactive stores
  $effect(() => {
    const unsub = derived(
      [pageIssues, issuesStore.selectedId, issuesStore.hoveredId, viewerStore],
      ([$issues, $selId, $hovId, $viewer]) => ({
        issues: $issues,
        selectedId: $selId,
        hoveredId: $hovId,
        showAll: $viewer.showAllOverlays,
      })
    ).subscribe((val) => {
      issues = val.issues;
      selectedId = val.selectedId;
      hoveredId = val.hoveredId;
      showAll = val.showAll;
    });

    return unsub;
  });

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  }
</script>

<svg
  class="pointer-events-none absolute left-0 top-0"
  {width}
  {height}
  viewBox="0 0 {width} {height}"
>
  {#each issues as issue (issue.id)}
    {@const px = bboxToPixels(issue.bbox, width, height)}
    {@const isSelected = issue.id === selectedId}
    {@const isHovered = issue.id === hoveredId}
    {@const visible = showAll || isSelected}

    {#if visible}
      <rect
        x={px.x}
        y={px.y}
        width={px.width}
        height={px.height}
        fill={isSelected ? `${getSeverityColor(issue.severity)}20` : isHovered ? `${getSeverityColor(issue.severity)}15` : 'transparent'}
        stroke={getSeverityColor(issue.severity)}
        stroke-width={isSelected ? 3 : isHovered ? 2 : 1.5}
        stroke-dasharray={isSelected ? 'none' : '6 3'}
        rx="2"
        class:animate-pulse={isHovered && !isSelected}
        opacity={isSelected || isHovered ? 1 : 0.5}
      />

      {#if isSelected}
        <!-- Label above selected bbox -->
        <foreignObject
          x={px.x}
          y={px.y - 24}
          width={Math.max(px.width, 120)}
          height="22"
        >
          <div class="pointer-events-none rounded bg-gray-900/80 px-1.5 py-0.5 text-xs font-medium text-white truncate">
            {issue.id}: {issue.title}
          </div>
        </foreignObject>
      {/if}
    {/if}
  {/each}
</svg>
```

**Step 2: Commit**

```bash
git add src/lib/components/BboxOverlay.svelte
git commit -m "feat: add SVG bounding box overlay with severity colors"
```

---

### Task 8: Build the IssuesPanel component

**Files:**
- Create: `src/lib/components/IssuesPanel.svelte`

**Step 1: Write the IssuesPanel**

Create `src/lib/components/IssuesPanel.svelte`:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import type { Issue } from '$lib/types';

  let filteredIssues: Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let currentPage = $state(1);
  let totalPages = $state(0);

  const unsubFiltered = issuesStore.filtered.subscribe((v) => (filteredIssues = v));
  const unsubSelected = issuesStore.selectedId.subscribe((v) => (selectedId = v));
  const unsubViewer = viewerStore.subscribe((v) => {
    currentPage = v.currentPage;
    totalPages = v.totalPages;
  });

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubFiltered();
    unsubSelected();
    unsubViewer();
  });

  function handleSelect(issue: Issue) {
    issuesStore.select(issue.id);
    viewerStore.goToPage(issue.page);
  }

  function handleHover(id: string | null) {
    issuesStore.hover(id);
  }

  function getSeverityDot(severity: string): string {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  }

  function groupByPage(issues: Issue[]): Map<number, Issue[]> {
    const groups = new Map<number, Issue[]>();
    for (const issue of issues) {
      if (!groups.has(issue.page)) groups.set(issue.page, []);
      groups.get(issue.page)!.push(issue);
    }
    return groups;
  }

  let grouped = $derived(groupByPage(filteredIssues));
  let pages = $derived([...grouped.keys()].sort((a, b) => a - b));
</script>

<aside class="flex h-full w-72 flex-col border-r border-gray-200 bg-white">
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">Issues</h2>
    <p class="text-xs text-gray-500">{filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}</p>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5">
          <span class="text-xs font-medium text-gray-500">Page {page}</span>
        </div>
        {#each grouped.get(page) ?? [] as issue (issue.id)}
          <button
            class="w-full px-4 py-2.5 text-left transition-colors hover:bg-blue-50 {issue.id === selectedId ? 'bg-blue-100 border-l-2 border-blue-600' : 'border-l-2 border-transparent'}"
            onclick={() => handleSelect(issue)}
            onmouseenter={() => handleHover(issue.id)}
            onmouseleave={() => handleHover(null)}
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full {getSeverityDot(issue.severity)}"></span>
              <span class="truncate text-sm font-medium text-gray-800">{issue.title}</span>
            </div>
            <div class="mt-0.5 flex items-center gap-2 pl-4">
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase">{issue.category}</span>
              {#if issue.status === 'resolved'}
                <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Resolved</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/each}

    {#if filteredIssues.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        No issues match filters
      </div>
    {/if}
  </div>
</aside>
```

**Step 2: Commit**

```bash
git add src/lib/components/IssuesPanel.svelte
git commit -m "feat: add IssuesPanel with grouped list and hover/select"
```

---

### Task 9: Build the IssueDetail component

**Files:**
- Create: `src/lib/components/IssueDetail.svelte`

**Step 1: Write the IssueDetail**

Create `src/lib/components/IssueDetail.svelte`:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import type { Issue } from '$lib/types';
  import { onDestroy } from 'svelte';

  let selected: Issue | null = $state(null);

  const unsub = issuesStore.selected.subscribe((v) => (selected = v));
  onDestroy(unsub);

  function getSeverityLabel(severity: string) {
    const labels: Record<string, { text: string; classes: string }> = {
      high: { text: 'High', classes: 'bg-red-100 text-red-800' },
      medium: { text: 'Medium', classes: 'bg-amber-100 text-amber-800' },
      low: { text: 'Low', classes: 'bg-blue-100 text-blue-800' },
    };
    return labels[severity] ?? { text: severity, classes: 'bg-gray-100 text-gray-800' };
  }

  function handlePrev() {
    const issue = issuesStore.selectPrev();
    if (issue) viewerStore.goToPage(issue.page);
  }

  function handleNext() {
    const issue = issuesStore.selectNext();
    if (issue) viewerStore.goToPage(issue.page);
  }
</script>

<aside class="flex h-full w-64 flex-col border-l border-gray-200 bg-white">
  {#if selected}
    <div class="flex-1 overflow-y-auto p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs font-mono text-gray-400">{selected.id}</span>
        <span class="rounded px-1.5 py-0.5 text-xs font-medium {getSeverityLabel(selected.severity).classes}">
          {getSeverityLabel(selected.severity).text}
        </span>
      </div>

      <h3 class="mb-2 text-sm font-semibold text-gray-900">{selected.title}</h3>

      <div class="mb-3 flex items-center gap-2">
        <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 uppercase">{selected.category}</span>
        <span class="text-xs text-gray-400">Page {selected.page}</span>
      </div>

      <p class="mb-4 text-sm leading-relaxed text-gray-600">{selected.description}</p>

      <button
        class="w-full rounded-md px-3 py-2 text-sm font-medium transition-colors {selected.status === 'open' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
        onclick={() => issuesStore.toggleStatus(selected!.id)}
      >
        {selected.status === 'open' ? 'Mark as Resolved' : 'Reopen Issue'}
      </button>
    </div>

    <div class="flex border-t border-gray-200">
      <button
        class="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        onclick={handlePrev}
      >
        &larr; Prev
      </button>
      <div class="w-px bg-gray-200"></div>
      <button
        class="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        onclick={handleNext}
      >
        Next &rarr;
      </button>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center p-4">
      <p class="text-center text-sm text-gray-400">Select an issue to view details</p>
    </div>
  {/if}
</aside>
```

**Step 2: Commit**

```bash
git add src/lib/components/IssueDetail.svelte
git commit -m "feat: add IssueDetail panel with status toggle and navigation"
```

---

### Task 10: Build the AppToolbar component

**Files:**
- Create: `src/lib/components/AppToolbar.svelte`

**Step 1: Write the AppToolbar**

Create `src/lib/components/AppToolbar.svelte`:

```svelte
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

  let fileInput: HTMLInputElement;

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
```

**Step 2: Commit**

```bash
git add src/lib/components/AppToolbar.svelte
git commit -m "feat: add AppToolbar with zoom, filters, upload, and overlay toggle"
```

---

### Task 11: Build the PageThumbnails component

**Files:**
- Create: `src/lib/components/PageThumbnails.svelte`

**Step 1: Write the PageThumbnails**

Create `src/lib/components/PageThumbnails.svelte`:

```svelte
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
```

**Step 2: Commit**

```bash
git add src/lib/components/PageThumbnails.svelte
git commit -m "feat: add PageThumbnails with lazy low-res rendering"
```

---

### Task 12: Assemble the main page layout

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Write the main page**

Replace `src/routes/+page.svelte`:

```svelte
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
    <div class="flex flex-col">
      <div class="flex-1 overflow-hidden">
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
```

**Step 2: Verify it compiles**

Run: `npm run dev`
Expected: App loads with the three-column layout. PDF will fail to load (no sample PDF yet) but layout should be visible.

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: assemble main page with three-column layout and keyboard shortcuts"
```

---

### Task 13: Generate mock blueprint PDF

**Files:**
- Create: `scripts/generate-blueprint.ts`
- Create: `static/sample-blueprint.pdf`

**Step 1: Install PDF generation dependency**

Run:
```bash
npm install -D jspdf
```

**Step 2: Write the generation script**

Create `scripts/generate-blueprint.ts`:

```ts
/**
 * Generate a mock multi-page architectural blueprint PDF.
 * Run: npx tsx scripts/generate-blueprint.ts
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();

function drawGrid(doc: jsPDF) {
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.3);
  // Column gridlines
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colSpacing = (W - 120) / (cols.length - 1);
  cols.forEach((label, i) => {
    const x = 60 + i * colSpacing;
    doc.line(x, 40, x, H - 40);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 170);
    doc.text(label, x - 3, 35);
  });
  // Row gridlines
  const rows = ['1', '2', '3', '4', '5'];
  const rowSpacing = (H - 100) / (rows.length - 1);
  rows.forEach((label, i) => {
    const y = 50 + i * rowSpacing;
    doc.line(60, y, W - 60, y);
    doc.text(label, 48, y + 3);
  });
}

function drawTitleBlock(doc: jsPDF, title: string, sheetNum: number) {
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(1.5);
  doc.rect(30, 20, W - 60, H - 40);
  // Title block bottom-right
  const tbW = 280;
  const tbH = 60;
  const tbX = W - 30 - tbW;
  const tbY = H - 20 - tbH;
  doc.setLineWidth(0.8);
  doc.rect(tbX, tbY, tbW, tbH);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text('ACME Construction Corp.', tbX + 10, tbY + 15);
  doc.setFontSize(8);
  doc.text(`Sheet ${sheetNum} of 4`, tbX + 10, tbY + 28);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, tbX + 10, tbY + 48);
  doc.setFont('helvetica', 'normal');
}

function drawRoom(doc: jsPDF, x: number, y: number, w: number, h: number, label: string) {
  doc.setDrawColor(60, 60, 80);
  doc.setLineWidth(1);
  doc.rect(x, y, w, h);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);
  doc.text(label, x + w / 2, y + h / 2, { align: 'center' });
}

function drawDoor(doc: jsPDF, x: number, y: number, vertical: boolean) {
  doc.setDrawColor(60, 60, 80);
  doc.setLineWidth(0.8);
  const size = 24;
  if (vertical) {
    doc.line(x, y, x, y + size);
    // Arc to indicate swing
    doc.setDrawColor(150, 150, 170);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x, y, x + size * 0.7, y + size * 0.5);
    doc.setLineDashPattern([], 0);
  } else {
    doc.line(x, y, x + size, y);
    doc.setDrawColor(150, 150, 170);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x, y, x + size * 0.5, y + size * 0.7);
    doc.setLineDashPattern([], 0);
  }
}

function drawWindow(doc: jsPDF, x: number, y: number, length: number, vertical: boolean) {
  doc.setDrawColor(100, 140, 200);
  doc.setLineWidth(1.5);
  if (vertical) {
    doc.line(x, y, x, y + length);
    doc.line(x - 3, y, x - 3, y + length);
  } else {
    doc.line(x, y, x + length, y);
    doc.line(x, y - 3, x + length, y - 3);
  }
}

// === PAGE 1: Ground Floor Plan ===
drawGrid(doc);
drawTitleBlock(doc, 'GROUND FLOOR PLAN - A1.01', 1);

// Rooms
drawRoom(doc, 100, 80, 250, 180, 'LOBBY\n101');
drawRoom(doc, 100, 260, 120, 150, 'STORAGE\n102');
drawRoom(doc, 220, 260, 130, 150, 'OFFICE\n103');
drawRoom(doc, 380, 80, 200, 180, 'CONFERENCE\n104');
drawRoom(doc, 380, 260, 200, 150, 'BREAK ROOM\n105');
drawRoom(doc, 610, 80, 180, 330, 'OPEN OFFICE\n106');
drawRoom(doc, 820, 80, 120, 160, 'STAIRWELL\nS-1');
drawRoom(doc, 820, 240, 120, 170, 'RESTROOM\n107');

// Doors
drawDoor(doc, 340, 160, true);
drawDoor(doc, 200, 260, false);
drawDoor(doc, 330, 330, true);
drawDoor(doc, 575, 200, true);

// Windows
drawWindow(doc, 100, 80, 80, false);
drawWindow(doc, 790, 80, 80, true);
drawWindow(doc, 610, 410, 100, false);

// Dimension line example
doc.setDrawColor(80, 80, 100);
doc.setLineWidth(0.3);
doc.line(100, 440, 350, 440);
doc.setFontSize(7);
doc.setTextColor(80, 80, 100);
doc.text("25'-0\"", 200, 435);

// === PAGE 2: First Floor Plan ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'FIRST FLOOR PLAN - A1.02', 2);

drawRoom(doc, 100, 80, 200, 200, 'OFFICE\n201');
drawRoom(doc, 300, 80, 140, 200, 'CORRIDOR');
drawRoom(doc, 440, 80, 180, 200, 'OFFICE\n202');
drawRoom(doc, 100, 280, 200, 130, 'MEETING\n203');
drawRoom(doc, 440, 280, 180, 130, 'BATHROOM\n204');
drawRoom(doc, 650, 80, 200, 330, 'OPEN OFFICE\n205');
drawRoom(doc, 880, 80, 100, 160, 'STAIRWELL\nS-1');
drawRoom(doc, 880, 240, 100, 170, 'STORAGE\n206');

drawDoor(doc, 295, 170, true);
drawDoor(doc, 430, 170, true);
drawDoor(doc, 200, 280, false);
drawDoor(doc, 530, 280, false);

drawWindow(doc, 100, 80, 60, false);
drawWindow(doc, 440, 80, 60, false);

// === PAGE 3: MEP (Mechanical/Electrical/Plumbing) ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'MEP OVERLAY - M1.01', 3);

// Ducts (rectangles with fill)
doc.setDrawColor(220, 100, 100);
doc.setFillColor(255, 230, 230);
doc.setLineWidth(1);
// Main supply duct
doc.rect(80, 160, 700, 30, 'FD');
doc.setFontSize(7);
doc.setTextColor(180, 60, 60);
doc.text('24" SUPPLY DUCT', 350, 180);

// Branch ducts
doc.rect(200, 190, 20, 100, 'FD');
doc.rect(450, 190, 20, 100, 'FD');
doc.rect(650, 190, 20, 100, 'FD');

// Return duct
doc.setDrawColor(100, 100, 220);
doc.setFillColor(230, 230, 255);
doc.rect(80, 350, 500, 25, 'FD');
doc.setTextColor(60, 60, 180);
doc.text('18x12 RETURN AIR DUCT', 250, 367);

// Pipes
doc.setDrawColor(60, 180, 60);
doc.setLineWidth(2);
doc.setLineDashPattern([8, 4], 0);
doc.line(100, 250, 800, 250);
doc.setFontSize(6);
doc.setTextColor(40, 140, 40);
doc.text('4" WASTE PIPE', 400, 245);
doc.setLineDashPattern([], 0);

// Electrical conduit
doc.setDrawColor(200, 150, 50);
doc.setLineWidth(1);
doc.setLineDashPattern([3, 3], 0);
doc.line(120, 260, 780, 260);
doc.setTextColor(180, 130, 30);
doc.text('2" ELEC CONDUIT', 400, 275);
doc.setLineDashPattern([], 0);

// Sprinkler heads
doc.setDrawColor(200, 50, 50);
doc.setFillColor(255, 100, 100);
[150, 300, 450, 600, 750].forEach((x) => {
  doc.circle(x, 130, 4, 'FD');
  doc.setFontSize(5);
  doc.text('SH', x - 4, 125);
});

// Fire damper symbols (triangles)
doc.setFillColor(255, 0, 0);
const fdX = 390;
doc.triangle(fdX, 155, fdX - 6, 168, fdX + 6, 168, 'FD');
doc.setFontSize(5);
doc.setTextColor(200, 0, 0);
doc.text('FD', fdX - 4, 150);

// Beams crossing ducts
doc.setDrawColor(100, 100, 100);
doc.setLineWidth(2);
doc.setFillColor(220, 220, 220);
doc.rect(250, 140, 12, 80, 'FD');
doc.setFontSize(5);
doc.setTextColor(80, 80, 80);
doc.text('W12x26', 230, 138);

// === PAGE 4: Structural ===
doc.addPage();
drawGrid(doc);
drawTitleBlock(doc, 'STRUCTURAL PLAN - S1.01', 4);

// Columns (filled squares)
doc.setDrawColor(80, 80, 80);
doc.setFillColor(180, 180, 180);
const colPositions = [
  [120, 100], [320, 100], [520, 100], [720, 100],
  [120, 260], [320, 260], [520, 260], [720, 260],
  [120, 420], [320, 420], [520, 420], [720, 420],
];
colPositions.forEach(([cx, cy], i) => {
  doc.rect(cx - 8, cy - 8, 16, 16, 'FD');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(`C-${i + 1}`, cx - 6, cy - 12);
});

// Beams (thick lines between columns)
doc.setLineWidth(3);
doc.setDrawColor(120, 120, 120);
// Horizontal beams
for (let row = 0; row < 3; row++) {
  const y = 100 + row * 160;
  for (let col = 0; col < 3; col++) {
    const x1 = 120 + col * 200;
    doc.line(x1, y, x1 + 200, y);
  }
}
// Vertical beams
for (let col = 0; col < 4; col++) {
  const x = 120 + col * 200;
  for (let row = 0; row < 2; row++) {
    const y1 = 100 + row * 160;
    doc.line(x, y1, x, y1 + 160);
  }
}

// Footings (dashed rectangles)
doc.setDrawColor(140, 100, 60);
doc.setLineWidth(1);
doc.setLineDashPattern([4, 4], 0);
colPositions.forEach(([cx, cy], i) => {
  const fw = i === 8 ? 36 : 48; // F-4 at index 8 intentionally undersized
  doc.rect(cx - fw / 2, cy - fw / 2, fw, fw);
  doc.setFontSize(5);
  doc.setTextColor(140, 100, 60);
  doc.text(`F-${i + 1}`, cx - 6, cy + fw / 2 + 8);
});
doc.setLineDashPattern([], 0);

// Grade beams (thick dashed lines)
doc.setDrawColor(160, 120, 80);
doc.setLineWidth(2);
doc.setLineDashPattern([6, 3], 0);
doc.line(120, 420, 720, 420);
doc.setFontSize(6);
doc.text('GB-2', 400, 435);
doc.setLineDashPattern([], 0);

// Rebar callout (intentionally missing for GB-2 as per issue)
doc.setFontSize(6);
doc.setTextColor(160, 120, 80);
doc.text('#5 @ 12" O.C. (TYP)', 130, 115);

// Save
const pdfOutput = doc.output('arraybuffer');
writeFileSync('static/sample-blueprint.pdf', Buffer.from(pdfOutput));
console.log('Generated static/sample-blueprint.pdf (4 pages)');
```

**Step 3: Install tsx and generate the PDF**

Run:
```bash
npm install -D tsx
npx tsx scripts/generate-blueprint.ts
```

Expected: `Generated static/sample-blueprint.pdf (4 pages)` printed to console, file created in `static/`.

**Step 4: Verify the app loads the PDF**

Run: `npm run dev`
Expected: App shows the ground floor plan in the viewer with bounding boxes.

**Step 5: Commit**

```bash
git add scripts/generate-blueprint.ts static/sample-blueprint.pdf package.json package-lock.json
git commit -m "feat: add mock blueprint PDF generator (4-page construction set)"
```

---

### Task 14: Integration testing and bug fixes

**Step 1: Run the app and verify core interactions**

Run: `npm run dev`

Test manually:
1. PDF loads and renders page 1
2. Page navigation (arrows, `n`/`p` keys) works
3. Issue list shows 18 issues grouped by page
4. Clicking an issue selects it and navigates to the correct page
5. Bounding boxes appear on the canvas
6. Selected issue has bold border, others are faded
7. Hover on issue list highlights bbox
8. Zoom in/out works (mouse wheel and toolbar buttons)
9. Pan works (click-drag on viewer)
10. Severity and status filter chips work
11. "Mark as Resolved" / "Reopen" works in detail panel
12. `j`/`k` keys cycle through issues
13. Page thumbnails render and are clickable
14. "Show All Boxes" / "Selected Only" toggle works
15. Upload PDF button loads a new file

**Step 2: Fix any bugs found**

Address issues as they come up. Common ones to watch for:
- pdf.js worker path not resolving (may need Vite config for worker)
- Canvas/SVG overlay size mismatch
- Store subscription cleanup
- Reactive updates not triggering re-render

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: integration fixes from manual testing"
```

---

### Task 15: Add README and deploy configuration

**Files:**
- Create: `README.md`
- Create: `vercel.json` (if needed)

**Step 1: Write the README**

Create `README.md`:

```markdown
# Blueprint Issue Review Viewer

A construction blueprint QA/QC issue viewer built as a front-end prototype for AI-driven drawing review workflows.

## What This Demonstrates

- **PDF viewer** with pan/zoom and lazy page rendering via pdf.js
- **AI issue overlay** with normalized bounding boxes on an SVG layer
- **Issue management** panel with severity/status filtering and keyboard navigation
- **Performance-aware rendering** with CSS transform zoom and resolution-threshold re-rendering

## How It Works

The viewer loads a multi-page construction blueprint and displays AI-detected issues as interactive bounding box overlays. Issues are currently mocked but follow a structured data model designed for AI agent output:

```json
{
  "id": "ISS-001",
  "page": 1,
  "title": "Missing door swing annotation",
  "description": "...",
  "severity": "high",
  "category": "clash",
  "bbox": { "x": 0.35, "y": 0.42, "width": 0.08, "height": 0.06 }
}
```

Bounding boxes use normalized coordinates (0–1) so AI models can provide results independent of rendering resolution.

## Tech Stack

- **SvelteKit** + TypeScript
- **pdf.js** (pdfjs-dist) for PDF rendering
- **Tailwind CSS** for styling

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous issue |
| `n` / `p` | Next / previous page |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |

## Development

```bash
npm install
npm run dev
```

## Extending

- **AI integration:** Replace `src/lib/data/issues.json` with API calls to an AI agent backend
- **Multi-reviewer:** Add user identity and per-user issue assignments
- **Export:** Annotate PDF with resolved/open status using pdf-lib
- **Real-time:** WebSocket updates when AI agents detect new issues

## Generate New Mock Blueprint

```bash
npx tsx scripts/generate-blueprint.ts
```
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage, shortcuts, and extension notes"
```

---

### Task 16: Deploy to Vercel

**Step 1: Install Vercel adapter**

Run:
```bash
npm install -D @sveltejs/adapter-vercel
```

**Step 2: Update svelte.config.js**

Replace the adapter import in `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

**Step 3: Deploy**

Run:
```bash
npx vercel
```

Follow prompts to link/create project and deploy.

Expected: Deployment URL printed to console.

**Step 4: Commit**

```bash
git add svelte.config.js package.json package-lock.json
git commit -m "chore: add Vercel adapter for deployment"
```

---

## Summary

| Task | Description | Estimated Effort |
|------|-------------|-----------------|
| 1 | Scaffold SvelteKit + Tailwind + pdf.js | 15 min |
| 2 | Types and mock issue data | 10 min |
| 3 | Svelte stores (viewer + issues) | 15 min |
| 4 | PDF renderer utility | 10 min |
| 5 | Coordinate utility | 5 min |
| 6 | DocumentViewer component | 25 min |
| 7 | BboxOverlay component | 15 min |
| 8 | IssuesPanel component | 15 min |
| 9 | IssueDetail component | 10 min |
| 10 | AppToolbar component | 15 min |
| 11 | PageThumbnails component | 10 min |
| 12 | Main page layout + keyboard shortcuts | 10 min |
| 13 | Mock blueprint PDF generation | 20 min |
| 14 | Integration testing + bug fixes | 30 min |
| 15 | README | 10 min |
| 16 | Deploy to Vercel | 10 min |

## 2026-02-21 Remediation Status

Implemented:
- Node runtime pinned to 22 (`.nvmrc`, `package.json` engines, adapter runtime config).
- pdf.js render typing fix (RenderParameters contract now satisfied).
- Canonical document source/token flow for upload synchronization.
- Thumbnail reset/re-render on document changes.
- Center-on-bbox behavior for issue selection flows.
- Neighbor page prefetch/cache for viewer rendering.
- CI pipeline with check/test/e2e/build gates.
- Expanded test suite:
  - unit/store/component tests (Vitest)
  - e2e tests (Playwright)
- README and docs updated to reflect current behavior and runtime requirements.
