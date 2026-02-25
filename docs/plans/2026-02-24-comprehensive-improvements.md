# Comprehensive Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the blueprint QA demo into a production-quality "hire me" showcase for Structured AI — with live streaming results, domain-aware AI, polished UI matching their product, and clean code.

**Architecture:** Each PDF page is analyzed independently via a per-page POST to `/api/analyze`, results stream into the store incrementally using new `appendIssues`/`appendCriteria` methods, and the UI updates live. Sheet type detection (electrical/structural/architectural/etc.) is added to the Gemini prompt and surfaces as badges throughout the UI.

**Tech Stack:** SvelteKit 2, Svelte 5 Runes, TypeScript 5 (strict), Tailwind CSS 4, Google Gemini API (gemini-2.5-flash), pdf.js 5, Vitest, Playwright

---

## Task 1: Code Quality Foundations

**Files:**
- Delete: `src/lib/config/brand-colors.ts`
- Create: `src/lib/config/constants.ts`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Modify: `package.json`

### Step 1: Delete unused dead code

```bash
rm /Volumes/CS_Stuff/StructuredUIDemo/src/lib/config/brand-colors.ts
```

Verify nothing imports it:
```bash
grep -r "brand-colors" src/
# Expected: no output
```

### Step 2: Create `src/lib/config/constants.ts`

```typescript
// src/lib/config/constants.ts

/** Maximum pages sent to Gemini per analysis run */
export const MAX_PAGES = 20;

/** Gemini image target: long-edge px for quality/cost balance */
export const TARGET_IMAGE_PX = 1500;

/** Confidence threshold for "high confidence only" filter */
export const HIGH_CONFIDENCE_THRESHOLD = 80;

/** Ratio of not-applicable criteria above which we flag unrecognized content */
export const UNRECOGNIZED_CONTENT_THRESHOLD = 0.7;

/** DocumentViewer: pages to keep in memory around current page */
export const PAGE_CACHE_RADIUS = 1;

/** DocumentViewer: maximum zoom level */
export const ZOOM_MAX = 4;

/** DocumentViewer: minimum zoom level */
export const ZOOM_MIN = 0.1;

/** Number of concurrent page-to-image workers */
export const PAGE_RENDER_CONCURRENCY = 5;
```

### Step 3: Update `src/routes/+page.svelte` to use constant

Replace:
```typescript
const MAX_PAGES = 20;
```
With:
```typescript
import { MAX_PAGES, PAGE_RENDER_CONCURRENCY } from '$lib/config/constants';
```

Replace all `5` in the worker pool with `PAGE_RENDER_CONCURRENCY`:
```typescript
await Promise.all(Array.from({ length: PAGE_RENDER_CONCURRENCY }, worker));
```

### Step 4: Update `src/lib/utils/page-to-image.ts` to use constant

```typescript
import { TARGET_IMAGE_PX } from '$lib/config/constants';

export async function pageToBase64(page: PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const maxDim = Math.max(viewport.width, viewport.height);
  const scale = TARGET_IMAGE_PX / maxDim;
  // ... rest unchanged
}
```

### Step 5: Update `src/lib/components/DocumentViewer.svelte` to use constants

Replace hardcoded:
```typescript
const ZOOM_MAX = 4;
const PAGE_CACHE_RADIUS = 1;
```
With:
```typescript
import { ZOOM_MAX, PAGE_CACHE_RADIUS } from '$lib/config/constants';
```

### Step 6: Update viewer store to use constants

In `src/lib/stores/viewer.ts`, replace hardcoded zoom values with imports:
```typescript
import { ZOOM_MIN, ZOOM_MAX } from '$lib/config/constants';
```

### Step 7: Add ESLint + Prettier

Install:
```bash
cd /Volumes/CS_Stuff/StructuredUIDemo && npm install -D eslint eslint-plugin-svelte @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier prettier-plugin-svelte
```

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte'],
  },
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: { parser: '@typescript-eslint/parser' },
    },
  ],
  env: { browser: true, es2017: true, node: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

Create `.prettierrc`:
```json
{
  "useTabs": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

Add to `package.json` scripts:
```json
"lint": "eslint src --ext .ts,.svelte",
"format": "prettier --write src"
```

### Step 8: Commit

```bash
cd /Volumes/CS_Stuff/StructuredUIDemo
git add -A
git commit -m "chore: extract constants, add ESLint+Prettier, remove dead code"
```

---

## Task 2: Type System — Sheet Type + Confidence Filter

**Files:**
- Modify: `src/lib/types/index.ts`

### Step 1: Add `SheetType` and update `Issue` + `QACriterion`

Replace contents of `src/lib/types/index.ts`:

```typescript
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';
export type IssueCategory = 'clash' | 'missing-label' | 'code-violation' | 'clearance';

/** Sheet type detected from title block / drawing content */
export type SheetType =
  | 'architectural'
  | 'electrical'
  | 'mechanical'
  | 'structural'
  | 'plumbing'
  | 'civil'
  | 'cover'
  | 'schedule'
  | 'unknown';

/** Short abbreviation badge shown in UI (e.g. "E", "A", "M") */
export const SHEET_TYPE_ABBREV: Record<SheetType, string> = {
  architectural: 'A',
  electrical: 'E',
  mechanical: 'M',
  structural: 'S',
  plumbing: 'P',
  civil: 'C',
  cover: 'CV',
  schedule: 'SCH',
  unknown: '?',
};

export const SHEET_TYPE_LABEL: Record<SheetType, string> = {
  architectural: 'Architectural',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  structural: 'Structural',
  plumbing: 'Plumbing',
  civil: 'Civil',
  cover: 'Cover Sheet',
  schedule: 'Schedule',
  unknown: 'Unknown',
};

export type BoundingBox = {
  x: number;      // normalized 0–1 from left
  y: number;      // normalized 0–1 from top
  width: number;  // normalized 0–1
  height: number; // normalized 0–1
};

export type Issue = {
  id: string;
  page: number;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
  criterionId?: string;
  confidence?: number;
  sheetType?: SheetType;
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

export type CriterionResult = 'pass' | 'fail' | 'not-applicable';

export type QACriterion = {
  id: string;
  name: string;
  description: string;
  result: CriterionResult;
  summary: string;
  page: number;
  confidence?: number;
  sheetType?: SheetType;
};

export type AnalysisResponse = {
  criteria: QACriterion[];
  issues: Issue[];
  metadata?: {
    totalPages: number;
    analyzedPages: number;
    failedPages: number;
    emptyIssues: boolean;
  };
};
```

### Step 2: Run type check

```bash
cd /Volumes/CS_Stuff/StructuredUIDemo && npm run check
# Expected: 0 errors (new optional fields are backwards-compatible)
```

### Step 3: Commit

```bash
git add src/lib/types/index.ts
git commit -m "feat(types): add SheetType, sheet abbrev/label maps"
```

---

## Task 3: Store Updates — Append Methods + Confidence Filter

**Files:**
- Modify: `src/lib/stores/issues.ts`
- Test: `src/lib/stores/issues.test.ts`

### Step 1: Write failing tests first

Add to `src/lib/stores/issues.test.ts`:

```typescript
import { get } from 'svelte/store';
import { issuesStore } from './issues';
import { mockIssue, mockCriterion } from '$lib/test-utils/mock-data';

describe('appendIssues', () => {
  beforeEach(() => issuesStore.loadIssues([]));

  it('accumulates issues across multiple appends', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-001', page: 1 })]);
    issuesStore.appendIssues([mockIssue({ id: 'ISS-002', page: 2 })]);
    expect(get(issuesStore.issues)).toHaveLength(2);
  });

  it('does not reset selectedId on append', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-001' })]);
    issuesStore.select('ISS-001');
    issuesStore.appendIssues([mockIssue({ id: 'ISS-002' })]);
    expect(get(issuesStore.selectedId)).toBe('ISS-001');
  });
});

describe('appendCriteria', () => {
  beforeEach(() => issuesStore.loadIssues([]));

  it('accumulates criteria across appends', () => {
    issuesStore.appendCriteria([mockCriterion({ id: 'EQ-1', page: 1 })]);
    issuesStore.appendCriteria([mockCriterion({ id: 'EQ-2', page: 2 })]);
    expect(get(issuesStore.criteria)).toHaveLength(2);
  });
});

describe('confidence filter', () => {
  beforeEach(() => {
    issuesStore.loadIssues([]);
    issuesStore.appendIssues([
      mockIssue({ id: 'ISS-001', confidence: 90 }),
      mockIssue({ id: 'ISS-002', confidence: 60 }),
      mockIssue({ id: 'ISS-003', confidence: 30 }),
    ]);
  });

  it('shows all issues when threshold is 0', () => {
    issuesStore.setConfidenceFilter(0);
    expect(get(issuesStore.filtered)).toHaveLength(3);
  });

  it('filters below threshold', () => {
    issuesStore.setConfidenceFilter(80);
    expect(get(issuesStore.filtered)).toHaveLength(1);
    expect(get(issuesStore.filtered)[0].id).toBe('ISS-001');
  });

  it('issues without confidence score pass through any filter', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-004', confidence: undefined })]);
    issuesStore.setConfidenceFilter(80);
    const result = get(issuesStore.filtered);
    expect(result.some(i => i.id === 'ISS-004')).toBe(true);
  });
});
```

### Step 2: Run tests to see them fail

```bash
cd /Volumes/CS_Stuff/StructuredUIDemo && npm run test -- --reporter=verbose
# Expected: appendIssues, appendCriteria, confidence filter tests FAIL
```

### Step 3: Update `src/lib/test-utils/mock-data.ts` to support new fields

```typescript
import type { Issue, QACriterion } from '$lib/types';

export function mockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'ISS-001',
    page: 1,
    title: 'Missing Label',
    description: 'An equipment label is missing.',
    severity: 'medium',
    status: 'open',
    category: 'missing-label',
    bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
    confidence: 85,
    ...overrides,
  };
}

export function mockCriterion(overrides: Partial<QACriterion> = {}): QACriterion {
  return {
    id: 'EQ-1',
    name: 'Equipment Labels',
    description: 'All equipment labeled',
    result: 'fail',
    summary: 'Missing labels found',
    page: 1,
    confidence: 90,
    ...overrides,
  };
}
```

### Step 4: Implement the store changes in `src/lib/stores/issues.ts`

Replace `src/lib/stores/issues.ts` entirely:

```typescript
import { writable, derived, get } from 'svelte/store';
import type { Issue, IssueStatus, SeverityFilter, StatusFilter, QACriterion } from '$lib/types';

function createIssuesStore() {
  const issues = writable<Issue[]>([]);
  const selectedId = writable<string | null>(null);
  const hoveredId = writable<string | null>(null);
  const severityFilter = writable<SeverityFilter>('all');
  const statusFilter = writable<StatusFilter>('all');
  const confidenceFilter = writable<number>(0); // 0 = show all
  const criteria = writable<QACriterion[]>([]);
  const analysisState = writable<{
    status: 'idle' | 'analyzing' | 'done' | 'error';
    currentPage: number;
    totalPages: number;
    analyzedPages: number;
    error: string | null;
    emptyIssues: boolean;
  }>({ status: 'idle', currentPage: 0, totalPages: 0, analyzedPages: 0, error: null, emptyIssues: false });

  const complianceScore = derived(criteria, ($criteria) => {
    if ($criteria.length === 0) return 0;
    return Math.round(($criteria.filter((c) => c.result === 'pass').length / $criteria.length) * 100);
  });

  const criteriaForPage = (page: number) =>
    derived(criteria, ($criteria) => $criteria.filter((c) => c.page === page));

  const filtered = derived(
    [issues, severityFilter, statusFilter, confidenceFilter],
    ([$issues, $severity, $status, $confidence]) => {
      return $issues.filter((issue) => {
        if ($severity !== 'all' && issue.severity !== $severity) return false;
        if ($status !== 'all' && issue.status !== $status) return false;
        if ($confidence > 0 && issue.confidence !== undefined && issue.confidence < $confidence) return false;
        return true;
      });
    }
  );

  const selected = derived(
    [issues, selectedId],
    ([$issues, $id]) => $issues.find((i) => i.id === $id) ?? null
  );

  const issuesForPage = (page: number) =>
    derived(filtered, ($filtered) => $filtered.filter((i) => i.page === page));

  return {
    issues,
    selectedId,
    hoveredId,
    severityFilter,
    statusFilter,
    confidenceFilter,
    filtered,
    selected,
    issuesForPage,
    criteria,
    analysisState,
    criteriaForPage,
    complianceScore,

    select: (id: string | null) => selectedId.set(id),
    reselect: (id: string) => {
      selectedId.set(null);
      selectedId.set(id);
    },
    hover: (id: string | null) => hoveredId.set(id),

    toggleStatus: (id: string) =>
      issues.update(($issues) =>
        $issues.map((i) =>
          i.id === id
            ? { ...i, status: i.status === 'open' ? 'resolved' : ('open' as IssueStatus) }
            : i
        )
      ),

    selectNext: () => {
      const currentFiltered = get(filtered);
      const currentId = get(selectedId);
      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const next = currentFiltered[(idx + 1) % currentFiltered.length];
      selectedId.set(next.id);
      return next;
    },

    selectPrev: () => {
      const currentFiltered = get(filtered);
      const currentId = get(selectedId);
      if (currentFiltered.length === 0) return null;
      const idx = currentFiltered.findIndex((i) => i.id === currentId);
      const prev = currentFiltered[(idx - 1 + currentFiltered.length) % currentFiltered.length];
      selectedId.set(prev.id);
      return prev;
    },

    loadCriteria: (data: QACriterion[]) => criteria.set(data),

    /** Append new issues without resetting selection or filters (used by streaming) */
    appendIssues: (newIssues: Issue[]) =>
      issues.update(($issues) => [...$issues, ...newIssues]),

    /** Append new criteria without resetting (used by streaming) */
    appendCriteria: (newCriteria: QACriterion[]) =>
      criteria.update(($criteria) => [...$criteria, ...newCriteria]),

    setAnalysisState: (state: Partial<{
      status: 'idle' | 'analyzing' | 'done' | 'error';
      currentPage: number;
      totalPages: number;
      analyzedPages: number;
      error: string | null;
      emptyIssues: boolean;
    }>) => analysisState.update((s) => ({ ...s, ...state })),

    loadIssues: (data: Issue[]) => {
      issues.set(data);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      confidenceFilter.set(0);
      criteria.set([]);
      analysisState.set({ status: 'idle', currentPage: 0, totalPages: 0, analyzedPages: 0, error: null, emptyIssues: false });
    },

    loadAnalysisResult: (result: { criteria: QACriterion[]; issues: Issue[]; metadata?: { emptyIssues: boolean } }) => {
      issues.set(result.issues);
      criteria.set(result.criteria);
      selectedId.set(null);
      hoveredId.set(null);
      severityFilter.set('all');
      statusFilter.set('all');
      confidenceFilter.set(0);
      analysisState.set({
        status: 'done',
        currentPage: 0,
        totalPages: 0,
        analyzedPages: 0,
        error: null,
        emptyIssues: result.metadata?.emptyIssues ?? false,
      });
    },

    setSeverityFilter: (f: SeverityFilter) => severityFilter.set(f),
    setStatusFilter: (f: StatusFilter) => statusFilter.set(f),
    setConfidenceFilter: (threshold: number) => confidenceFilter.set(threshold),

    getSelectedIssue: (): Issue | null => get(selected),
  };
}

export const issuesStore = createIssuesStore();
```

### Step 5: Run tests to confirm they pass

```bash
npm run test -- --reporter=verbose
# Expected: all tests including new appendIssues, appendCriteria, confidence filter PASS
```

### Step 6: Run type check

```bash
npm run check
# Expected: 0 errors
```

### Step 7: Commit

```bash
git add src/lib/stores/issues.ts src/lib/stores/issues.test.ts src/lib/test-utils/mock-data.ts
git commit -m "feat(store): add appendIssues, appendCriteria, confidence filter; fix get() subscriptions"
```

---

## Task 4: API — Sheet Type Detection + Improved Prompt + Server Validation

**Files:**
- Modify: `src/routes/api/analyze/+server.ts`

### Step 1: Rewrite `+server.ts` with all improvements

Replace the entire file:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QACriterion, Issue, IssueSeverity, IssueCategory, AnalysisResponse, SheetType } from '$lib/types';
import { env } from '$env/dynamic/private';
import { qaCriteria } from '$lib/config/qa-criteria';
import { MAX_PAGES, UNRECOGNIZED_CONTENT_THRESHOLD } from '$lib/config/constants';

const GEMINI_MODEL = env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALID_SHEET_TYPES = new Set<SheetType>([
  'architectural', 'electrical', 'mechanical', 'structural',
  'plumbing', 'civil', 'cover', 'schedule', 'unknown',
]);

function buildPrompt(pageNumber: number): string {
  const criteriaList = qaCriteria
    .map((c) => `- ${c.id}: ${c.name} — ${c.description}`)
    .join('\n');

  return `You are a senior construction QA/QC engineer reviewing a blueprint sheet.

STEP 1 — Identify the sheet:
Determine the sheet type from the title block or drawing content. Sheet types: architectural, electrical, mechanical, structural, plumbing, civil, cover, schedule, unknown.

STEP 2 — Evaluate each criterion (page ${pageNumber}):
${criteriaList}

For each criterion, determine:
- "pass" if the requirement is met
- "fail" if there is a clear deficiency (ONLY flag genuine problems, not hypotheticals)
- "not-applicable" if the criterion doesn't apply to this sheet type

STEP 3 — For each FAILED criterion, identify specific issues with TIGHT bounding boxes.
Bounding box rules:
- Wrap the SMALLEST box around the exact problematic element or region
- Do NOT draw a box around the entire page or entire drawing area
- box_2d format: [ymin, xmin, ymax, xmax] on a 0–1000 scale (0=top-left)

Return ONLY valid JSON matching this exact schema:
{
  "sheetType": "electrical",
  "criteria": [
    {
      "id": "EQ-${pageNumber}",
      "criterionKey": "EQ",
      "name": "Equipment/Element Labels",
      "result": "pass" | "fail" | "not-applicable",
      "summary": "One sentence finding. Be specific (e.g., 'CRAC unit at grid B-3 has no circuit label').",
      "confidence": 0-100
    }
  ],
  "issues": [
    {
      "title": "Max 6 words describing the problem",
      "description": "2-3 sentence explanation of exactly what is wrong and why it matters for construction.",
      "severity": "high" | "medium" | "low",
      "category": "clash" | "missing-label" | "code-violation" | "clearance",
      "criterionKey": "EQ",
      "box_2d": [ymin, xmin, ymax, xmax],
      "confidence": 0-100
    }
  ]
}

Severity guide:
- high = safety risk or building code violation
- medium = missing information that would cause RFI or rework
- low = minor annotation gap or cosmetic issue

Confidence guide:
- 80-100 = clearly visible in the drawing
- 50-79 = visible but some ambiguity
- 0-49 = inferred or unclear

IMPORTANT:
- Only flag issues for FAILED criteria
- Issue titles must be 6 words or fewer
- box_2d MUST be a tight box around the specific problem element, not a large area
- If no issues, return "issues": []`;
}

type GeminiIssue = {
  title: string;
  description: string;
  severity: string;
  category: string;
  criterionKey: string;
  box_2d: [number, number, number, number];
  confidence?: number;
};

type GeminiCriterion = {
  id: string;
  criterionKey: string;
  name: string;
  result: string;
  summary: string;
  confidence?: number;
};

type GeminiPageResult = {
  sheetType?: string;
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
const VALID_RESULTS = new Set(['pass', 'fail', 'not-applicable']);

async function analyzePage(
  pageNumber: number,
  imageBase64: string,
  apiKey: string
): Promise<GeminiPageResult> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(pageNumber) },
          { inline_data: { mime_type: 'image/png', data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
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
    throw error(500, 'GEMINI_API_KEY is not configured. Set it in your .env file.');
  }

  const { pages } = (await request.json()) as {
    pages: { pageNumber: number; image: string }[];
  };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    throw error(400, 'Request must include a non-empty "pages" array.');
  }

  // Server-side enforcement of page cap
  if (pages.length > MAX_PAGES) {
    throw error(400, `Too many pages. Maximum is ${MAX_PAGES} per request.`);
  }

  const allCriteria: QACriterion[] = [];
  const allIssues: Issue[] = [];
  let issueCounter = 1;
  let failedPageCount = 0;
  const totalPages = pages.length;

  // Analyze all pages in parallel
  const pageResults = await Promise.allSettled(
    pages.map((page) => analyzePage(page.pageNumber, page.image, apiKey))
  );

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const settled = pageResults[i];

    if (settled.status === 'rejected') {
      const err = settled.reason;
      console.error(`Analysis failed for page ${page.pageNumber}:`, err);
      allCriteria.push({
        id: `ERR-${page.pageNumber}`,
        name: 'Analysis Error',
        description: 'Failed to analyze this page',
        result: 'not-applicable',
        summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        page: page.pageNumber,
      });
      failedPageCount++;
      continue;
    }

    const result = settled.value;
    const sheetType = VALID_SHEET_TYPES.has(result.sheetType as SheetType)
      ? (result.sheetType as SheetType)
      : 'unknown';

    // Check if content was recognized as a blueprint
    const notApplicableCount = result.criteria.filter((c) => c.result === 'not-applicable').length;
    const totalCriteria = result.criteria.length;
    const notApplicableRatio = totalCriteria > 0 ? notApplicableCount / totalCriteria : 0;

    if (notApplicableRatio > UNRECOGNIZED_CONTENT_THRESHOLD) {
      allCriteria.push({
        id: `WARN-${page.pageNumber}`,
        name: 'Content Recognition Warning',
        description: 'Unable to recognize this as a construction blueprint',
        result: 'not-applicable',
        summary:
          'The AI was unable to reliably identify this page as a construction blueprint. ' +
          'Possible causes: not a blueprint, low image quality, or unsupported drawing type.',
        page: page.pageNumber,
        sheetType,
      });
      failedPageCount++;
      continue;
    }

    for (const c of result.criteria) {
      const validResult = VALID_RESULTS.has(c.result)
        ? (c.result as QACriterion['result'])
        : 'not-applicable';

      allCriteria.push({
        id: c.id || `${c.criterionKey}-${page.pageNumber}`,
        name: c.name,
        description: qaCriteria.find((q) => q.id === c.criterionKey)?.description ?? '',
        result: validResult,
        summary: c.summary ?? '',
        page: page.pageNumber,
        confidence: c.confidence,
        sheetType,
      });
    }

    for (const issue of result.issues) {
      const severity: IssueSeverity = VALID_SEVERITIES.has(issue.severity)
        ? (issue.severity as IssueSeverity)
        : 'medium';
      const category: IssueCategory = VALID_CATEGORIES.has(issue.category)
        ? (issue.category as IssueCategory)
        : 'missing-label';

      if (!issue.confidence) {
        console.warn(`Issue "${issue.title}" on page ${page.pageNumber} has no confidence score`);
      }

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
        confidence: issue.confidence,
        sheetType,
      });
    }
  }

  if (failedPageCount === totalPages) {
    throw error(
      400,
      'Unable to analyze this document. Please upload a valid construction blueprint PDF.'
    );
  }

  return json({
    criteria: allCriteria,
    issues: allIssues,
    metadata: {
      totalPages,
      analyzedPages: totalPages - failedPageCount,
      failedPages: failedPageCount,
      emptyIssues: allIssues.length === 0,
    },
  } satisfies AnalysisResponse);
};
```

### Step 2: Run type check

```bash
npm run check
# Expected: 0 errors
```

### Step 3: Commit

```bash
git add src/routes/api/analyze/+server.ts
git commit -m "feat(api): add sheet type detection, improved prompt, server-side page cap"
```

---

## Task 5: Streaming Analysis — Per-Page Fetches

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/AnalysisProgress.svelte`

### Step 1: Rewrite `runAnalysis()` in `+page.svelte`

Replace the entire `runAnalysis` function:

```typescript
async function runAnalysis() {
  if (!pdfSource) return;

  // Reset state for fresh analysis
  issuesStore.loadIssues([]);
  pageCapWarning = null;
  rightTab = 'criteria';

  const abortController = new AbortController();
  analysisAbortController = abortController;

  try {
    const doc = await loadDocument(pdfSource);
    const totalPages = doc.numPages;
    const pagesToAnalyze = Math.min(totalPages, MAX_PAGES);

    if (totalPages > MAX_PAGES) {
      pageCapWarning = `Large PDF (${totalPages} pages). Analyzing first ${MAX_PAGES} pages only.`;
    }

    issuesStore.setAnalysisState({
      status: 'analyzing',
      totalPages: pagesToAnalyze,
      analyzedPages: 0,
      currentPage: 0,
    });

    // Issue counter shared across pages for consistent IDs
    let issueCounter = 1;

    // Process each page: render → analyze → append results, all with concurrency limit
    const tasks = Array.from({ length: pagesToAnalyze }, (_, idx) => async () => {
      const pageNum = idx + 1;
      if (abortController.signal.aborted) return;

      // Render page to base64
      const page = await doc.getPage(pageNum);
      const base64 = await pageToBase64(page);

      if (abortController.signal.aborted) return;

      // Send single page to API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: [{ pageNumber: pageNum, image: base64 }] }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Page ${pageNum} analysis failed: ${errText}`);
        return;
      }

      const data: AnalysisResponse = await res.json();

      // Re-number issues to maintain global sequence (ISS-001, ISS-002, ...)
      const renumberedIssues = data.issues.map((issue) => ({
        ...issue,
        id: `ISS-${String(issueCounter++).padStart(3, '0')}`,
      }));

      // Append results immediately — UI updates live
      issuesStore.appendCriteria(data.criteria);
      issuesStore.appendIssues(renumberedIssues);
      issuesStore.setAnalysisState((s: { analyzedPages: number }) => ({
        analyzedPages: s.analyzedPages + 1,
        currentPage: pageNum,
      }));
    });

    // Run with concurrency limit of PAGE_RENDER_CONCURRENCY (5)
    let taskIndex = 0;
    async function worker() {
      while (taskIndex < tasks.length) {
        const i = taskIndex++;
        await tasks[i]();
      }
    }
    await Promise.all(Array.from({ length: PAGE_RENDER_CONCURRENCY }, worker));

    if (!abortController.signal.aborted) {
      const currentIssues = issuesStore.getSelectedIssue();
      issuesStore.setAnalysisState({
        status: 'done',
        emptyIssues: (await (async () => {
          let count = 0;
          issuesStore.issues.subscribe(v => count = v.length)();
          return count;
        })()) === 0,
      });
    }
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
```

**Note:** The `setAnalysisState` with a callback needs a small store change. Update the store's `setAnalysisState` to accept either an object OR a function:

In `src/lib/stores/issues.ts`, update `setAnalysisState`:

```typescript
setAnalysisState: (
  state:
    | Partial<AnalysisStateType>
    | ((prev: AnalysisStateType) => Partial<AnalysisStateType>)
) => analysisState.update((s) => ({
  ...s,
  ...(typeof state === 'function' ? state(s) : state),
})),
```

Where `AnalysisStateType` is the type of the analysisState writable. Add this type alias at the top of the store:

```typescript
type AnalysisStateType = {
  status: 'idle' | 'analyzing' | 'done' | 'error';
  currentPage: number;
  totalPages: number;
  analyzedPages: number;
  error: string | null;
  emptyIssues: boolean;
};
```

**Simplify the `emptyIssues` detection** — replace the convoluted IIFE with:

```typescript
issuesStore.setAnalysisState({
  status: 'done',
  emptyIssues: issuesStore.getIssueCount() === 0,
});
```

Add `getIssueCount()` to the store:
```typescript
getIssueCount: (): number => get(issues).length,
```

### Step 2: Update `AnalysisProgress.svelte` to show per-page streaming progress

Replace the entire component:

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import { t } from '$lib/config/app-config';

  let { onCancel }: { onCancel?: () => void } = $props();

  let status = $state<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  let analyzedPages = $state(0);
  let totalPages = $state(0);
  let errorMsg = $state<string | null>(null);
  let elapsedTime = $state(0);

  const unsub = issuesStore.analysisState.subscribe((s) => {
    status = s.status;
    analyzedPages = s.analyzedPages;
    totalPages = s.totalPages;
    errorMsg = s.error;
  });
  onDestroy(unsub);

  let progress = $derived(totalPages > 0 ? (analyzedPages / totalPages) * 100 : 0);

  let interval: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    if (status === 'analyzing') {
      elapsedTime = 0;
      interval = setInterval(() => { elapsedTime += 1; }, 1000);
    } else {
      if (interval) clearInterval(interval);
      interval = null;
      elapsedTime = 0;
    }
    return () => { if (interval) clearInterval(interval); };
  });

  let elapsedStr = $derived(
    `${Math.floor(elapsedTime / 60)}:${String(elapsedTime % 60).padStart(2, '0')}`
  );
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
          <h3 class="text-sm font-semibold text-gray-900">{t.analysis.title}</h3>
          <p class="text-xs text-gray-500">
            {#if analyzedPages > 0}
              {analyzedPages} of {totalPages} pages complete
            {:else}
              Preparing…
            {/if}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full bg-blue-600 transition-all duration-500"
          style="width: {progress}%"
        ></div>
      </div>

      <!-- Page dots -->
      {#if totalPages > 0 && totalPages <= 20}
        <div class="mb-3 flex flex-wrap gap-1 justify-center">
          {#each Array(totalPages) as _, i}
            <div class="h-2 w-2 rounded-full transition-colors duration-300 {i < analyzedPages ? 'bg-blue-500' : 'bg-gray-200'}"></div>
          {/each}
        </div>
      {/if}

      <div class="mb-4 text-center text-xs text-gray-400">
        Elapsed: {elapsedStr}
      </div>

      <button
        class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onclick={() => onCancel?.()}
        data-testid="cancel-analysis"
      >
        {t.analysis.cancel}
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
          <h3 class="text-sm font-semibold text-gray-900">{t.analysis.failed}</h3>
          <p class="text-xs text-red-600">{errorMsg ?? 'Unknown error'}</p>
        </div>
      </div>
      <button
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        onclick={() => issuesStore.setAnalysisState({ status: 'idle', error: null })}
        data-testid="dismiss-error"
      >
        {t.analysis.dismiss}
      </button>
    </div>
  </div>
{/if}
```

### Step 3: Run type check + tests

```bash
npm run check && npm run test
# Expected: 0 errors, all tests pass
```

### Step 4: Commit

```bash
git add src/routes/+page.svelte src/lib/components/AnalysisProgress.svelte src/lib/stores/issues.ts
git commit -m "feat: streaming per-page analysis with live UI updates and page progress dots"
```

---

## Task 6: UI — Confidence Filter in Toolbar

**Files:**
- Modify: `src/lib/components/AppToolbar.svelte`

### Step 1: Add confidence filter toggle to `AppToolbar.svelte`

Add state + subscription after existing filter subscriptions:

```typescript
import { HIGH_CONFIDENCE_THRESHOLD } from '$lib/config/constants';

let confidenceFilter = $state(0);
const unsubConf = issuesStore.confidenceFilter.subscribe((v) => (confidenceFilter = v));
// add unsubConf() to onDestroy
```

Add the button to the toolbar HTML, after the status filter group:

```svelte
<!-- Confidence filter -->
<button
  class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors {confidenceFilter > 0 ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}"
  onclick={() => issuesStore.setConfidenceFilter(confidenceFilter > 0 ? 0 : HIGH_CONFIDENCE_THRESHOLD)}
  title="Toggle high-confidence issues only (≥80%)"
  data-testid="confidence-filter"
>
  {confidenceFilter > 0 ? `≥${HIGH_CONFIDENCE_THRESHOLD}% conf.` : 'All conf.'}
</button>
```

### Step 2: Run type check

```bash
npm run check
```

### Step 3: Commit

```bash
git add src/lib/components/AppToolbar.svelte
git commit -m "feat(ui): add confidence filter toggle to toolbar"
```

---

## Task 7: UI — Redesigned Criteria Cards

**Files:**
- Modify: `src/lib/components/CriteriaPanel.svelte`

### Step 1: Replace `CriteriaPanel.svelte`

```svelte
<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { onDestroy } from 'svelte';
  import type { QACriterion } from '$lib/types';
  import { SHEET_TYPE_ABBREV } from '$lib/types';
  import { t } from '$lib/config/app-config';

  let criteria: QACriterion[] = $state([]);
  const unsub = issuesStore.criteria.subscribe((v) => (criteria = v));
  onDestroy(unsub);

  function getBorderColor(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'border-l-green-500';
      case 'fail': return 'border-l-red-500';
      case 'not-applicable': return 'border-l-gray-200';
    }
  }

  function getBadgeStyle(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'not-applicable': return 'bg-gray-100 text-gray-500';
    }
  }

  function getIconPath(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'fail': return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'not-applicable': return 'M18 12H6';
    }
  }

  function getIconColor(result: QACriterion['result']) {
    switch (result) {
      case 'pass': return 'text-green-500';
      case 'fail': return 'text-red-500';
      case 'not-applicable': return 'text-gray-300';
    }
  }

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
    <h2 class="text-sm font-semibold text-gray-900">{t.panels.criteria.title}</h2>
    <div class="mt-1 flex items-center gap-2 text-xs">
      <span class="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700">{stats.pass} {t.panels.criteria.pass}</span>
      <span class="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">{stats.fail} {t.panels.criteria.fail}</span>
      <span class="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">{stats.na} {t.panels.criteria.na}</span>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#each pages as page (page)}
      {@const pageCriteria = grouped.get(page) ?? []}
      {@const sheetType = pageCriteria[0]?.sheetType}
      <div class="border-b border-gray-100">
        <div class="sticky top-0 bg-gray-50 px-4 py-1.5 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500">{t.panels.criteria.pageLabel} {page}</span>
          {#if sheetType && sheetType !== 'unknown'}
            <span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
              {SHEET_TYPE_ABBREV[sheetType]}
            </span>
          {/if}
        </div>
        {#each pageCriteria as criterion (criterion.id)}
          <div
            class="border-l-4 px-4 py-3 {getBorderColor(criterion.result)} bg-white"
            data-testid={`criterion-${criterion.id}`}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="h-4 w-4 shrink-0 {getIconColor(criterion.result)}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d={getIconPath(criterion.result)} />
                </svg>
                <span class="text-xs font-semibold text-gray-800 truncate">{criterion.name}</span>
              </div>
              <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold {getBadgeStyle(criterion.result)}">
                {criterion.result === 'not-applicable' ? 'N/A' : criterion.result.toUpperCase()}
              </span>
            </div>

            {#if criterion.result !== 'not-applicable'}
              <!-- AI Summary inset box -->
              <div class="mt-2 rounded bg-gray-50 px-3 py-2 border border-gray-100">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">AI Summary</p>
                <p class="text-xs leading-relaxed text-gray-600">{criterion.summary}</p>
              </div>
            {/if}

            {#if criterion.confidence !== undefined}
              <div class="mt-1.5 flex items-center gap-1">
                <span class="text-[10px] text-gray-400">Confidence:</span>
                <span class="text-[10px] font-medium {criterion.confidence >= 80 ? 'text-green-600' : criterion.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                  {Math.round(criterion.confidence)}%
                </span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/each}

    {#if criteria.length === 0}
      <div class="flex items-center justify-center p-8 text-sm text-gray-400">
        {t.panels.criteria.empty}
      </div>
    {/if}
  </div>
</div>
```

### Step 2: Commit

```bash
git add src/lib/components/CriteriaPanel.svelte
git commit -m "feat(ui): redesign criteria cards with colored borders, AI summary inset, sheet type badge"
```

---

## Task 8: UI — Issue Cards with Sheet Type Badge

**Files:**
- Modify: `src/lib/components/IssuesPanel.svelte`

### Step 1: Update `IssuesPanel.svelte` to show sheet type + confidence pill

In the issue row markup, replace the category/status row:

```svelte
<div class="mt-0.5 flex flex-wrap items-center gap-1.5 pl-4">
  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase">{issue.category.replace('-', ' ')}</span>
  {#if issue.sheetType && issue.sheetType !== 'unknown'}
    <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{SHEET_TYPE_ABBREV[issue.sheetType]}</span>
  {/if}
  {#if issue.confidence !== undefined}
    <span class="rounded px-1.5 py-0.5 text-[10px] font-medium
      {issue.confidence >= 80 ? 'bg-green-50 text-green-700' : issue.confidence >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}">
      {Math.round(issue.confidence)}%
    </span>
  {/if}
  {#if issue.status === 'resolved'}
    <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Resolved</span>
  {/if}
</div>
```

Add import at top of `<script>`:
```typescript
import { SHEET_TYPE_ABBREV } from '$lib/types';
```

Remove the old confidence bar (the `h-1 w-8 rounded` div block) since the pill replaces it.

### Step 2: Commit

```bash
git add src/lib/components/IssuesPanel.svelte
git commit -m "feat(ui): add sheet type badge and confidence pill to issue cards"
```

---

## Task 9: UI — Sheet Type Label in Thumbnails

**Files:**
- Modify: `src/lib/components/PageThumbnails.svelte`
- Modify: `src/lib/stores/issues.ts` (add `sheetTypeForPage` helper)

### Step 1: Add `sheetTypeForPage` to issues store

In `src/lib/stores/issues.ts`, add:

```typescript
/** Returns the detected sheet type for a given page (from criteria) */
sheetTypeForPage: (page: number): SheetType => {
  const pageCriteria = get(criteria).filter((c) => c.page === page);
  return pageCriteria[0]?.sheetType ?? 'unknown';
},
```

Add `SheetType` to the import at the top of the store file.

### Step 2: Update `PageThumbnails.svelte`

Add reactive sheet type lookup per page. In the `<script>`:

```typescript
import { SHEET_TYPE_ABBREV } from '$lib/types';
import { get } from 'svelte/store';

// Derive sheet types from criteria store
let criteriaList = $state<import('$lib/types').QACriterion[]>([]);
const unsubCriteria = issuesStore.criteria.subscribe((v) => (criteriaList = v));
onDestroy(unsubCriteria);

function getSheetAbbrev(pageNum: number): string | null {
  const c = criteriaList.find((crit) => crit.page === pageNum && crit.sheetType && crit.sheetType !== 'unknown');
  return c?.sheetType ? SHEET_TYPE_ABBREV[c.sheetType] : null;
}
```

In the template, update each thumbnail button to show the badge:

```svelte
<button ...>
  <canvas class="block h-10 w-14 rounded-sm bg-gray-100" use:lazyThumb={pageNum}></canvas>
  <div class="flex items-center justify-center gap-1">
    <span class="block text-center text-[9px] text-gray-500">{pageNum}</span>
    {#if getSheetAbbrev(pageNum)}
      <span class="text-[8px] font-bold text-blue-600">{getSheetAbbrev(pageNum)}</span>
    {/if}
  </div>
</button>
```

### Step 3: Commit

```bash
git add src/lib/components/PageThumbnails.svelte src/lib/stores/issues.ts
git commit -m "feat(ui): show sheet type abbreviation badge on page thumbnails"
```

---

## Task 10: UI — Keyboard Shortcut Help Overlay (`?` key)

**Files:**
- Create: `src/lib/components/KeyboardHelp.svelte`
- Modify: `src/routes/+page.svelte`

### Step 1: Create `src/lib/components/KeyboardHelp.svelte`

```svelte
<script lang="ts">
  let { onClose }: { onClose: () => void } = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  onclick={onClose}
  role="dialog"
  aria-modal="true"
  aria-label="Keyboard shortcuts"
>
  <div
    class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h2>
      <button class="text-gray-400 hover:text-gray-600" onclick={onClose} aria-label="Close">✕</button>
    </div>

    <div class="space-y-1 text-xs">
      {#each [
        { keys: ['j', 'k'], desc: 'Next / prev issue' },
        { keys: ['n', 'p'], desc: 'Next / prev page' },
        { keys: ['+', '−'], desc: 'Zoom in / out' },
        { keys: ['0'], desc: 'Fit page to window' },
        { keys: ['?'], desc: 'Show this help' },
      ] as shortcut}
        <div class="flex items-center justify-between py-1.5 border-b border-gray-50">
          <span class="text-gray-600">{shortcut.desc}</span>
          <div class="flex gap-1">
            {#each shortcut.keys as key}
              <kbd class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-700">{key}</kbd>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
```

### Step 2: Wire it into `+page.svelte`

Add import:
```typescript
import KeyboardHelp from '$lib/components/KeyboardHelp.svelte';
```

Add state:
```typescript
let showKeyboardHelp = $state(false);
```

Add `?` case to `handleKeydown`:
```typescript
case '?':
  showKeyboardHelp = !showKeyboardHelp;
  break;
```

Add `Escape` case to close all modals:
```typescript
case 'Escape':
  showKeyboardHelp = false;
  showMetrics = false;
  showReport = false;
  break;
```

Add to template (alongside other modals):
```svelte
{#if showKeyboardHelp}
  <KeyboardHelp onClose={() => showKeyboardHelp = false} />
{/if}
```

### Step 3: Commit

```bash
git add src/lib/components/KeyboardHelp.svelte src/routes/+page.svelte
git commit -m "feat(ui): add keyboard shortcut overlay (press ?), Escape closes all modals"
```

---

## Task 11: API Endpoint Test

**Files:**
- Create: `src/routes/api/analyze/analyze.test.ts`

### Step 1: Write the test

```typescript
// src/routes/api/analyze/analyze.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module
vi.mock('$env/dynamic/private', () => ({
  env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-2.5-flash' },
}));

// Mock fetch
const mockGeminiResponse = (sheetType: string, issues: object[] = []) => ({
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          sheetType,
          criteria: [
            { id: 'EQ-1', criterionKey: 'EQ', name: 'Equipment Labels', result: 'fail', summary: 'Missing labels', confidence: 85 },
            { id: 'DIM-1', criterionKey: 'DIM', name: 'Dimensions', result: 'pass', summary: 'Dimensions present', confidence: 90 },
          ],
          issues,
        }),
      }],
    },
  }],
});

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when pages array is empty', async () => {
    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [] }),
    });
    await expect(POST({ request } as any)).rejects.toMatchObject({ status: 400 });
  });

  it('returns 400 when pages exceed MAX_PAGES', async () => {
    const { POST } = await import('./+server');
    const pages = Array.from({ length: 25 }, (_, i) => ({ pageNumber: i + 1, image: 'data:image/png;base64,abc' }));
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    });
    await expect(POST({ request } as any)).rejects.toMatchObject({ status: 400 });
  });

  it('parses Gemini response and returns issues with sheetType', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse('electrical', [{
        title: 'Missing circuit label',
        description: 'Panel circuit not identified',
        severity: 'high',
        category: 'missing-label',
        criterionKey: 'EQ',
        box_2d: [100, 200, 300, 400],
        confidence: 90,
      }]),
    } as Response);

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [{ pageNumber: 1, image: 'data:image/png;base64,abc' }] }),
    });

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].sheetType).toBe('electrical');
    expect(data.issues[0].severity).toBe('high');
    expect(data.criteria[0].sheetType).toBe('electrical');
  });

  it('continues analysis when one page fails (Promise.allSettled)', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error');
      return {
        ok: true,
        json: async () => mockGeminiResponse('architectural'),
      } as Response;
    });

    const { POST } = await import('./+server');
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: [
          { pageNumber: 1, image: 'data:image/png;base64,abc' },
          { pageNumber: 2, image: 'data:image/png;base64,def' },
        ],
      }),
    });

    const response = await POST({ request } as any);
    const data = await response.json();
    expect(data.metadata.failedPages).toBe(1);
    expect(data.metadata.analyzedPages).toBe(1);
  });
});
```

### Step 2: Run the test

```bash
npm run test -- analyze --reporter=verbose
# Expected: all 4 tests PASS
```

### Step 3: Commit

```bash
git add src/routes/api/analyze/analyze.test.ts
git commit -m "test(api): add analyze endpoint tests for validation, sheet type, and partial failure"
```

---

## Task 12: Final Polish — Remove Share Button + Run Full Check

**Files:**
- Modify: `src/lib/components/AppToolbar.svelte`
- Modify: `src/routes/+page.svelte`

### Step 1: Remove Share button from AppToolbar

In `AppToolbar.svelte`:
- Remove `handleShare()` function
- Remove `showShareToast` state
- Remove the `<div class="hidden sm:block...">` separator before Share
- Remove the Share `<button>` block
- Remove the toast `{#if showShareToast}` block
- Remove `onShare` from props destructure

### Step 2: Run all checks

```bash
npm run check && npm run test && npm run lint
# Expected: 0 errors, all tests pass
```

### Step 3: Final commit

```bash
git add -A
git commit -m "feat: complete comprehensive improvements — streaming, sheet type, UI polish, tests"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] Upload a multi-page PDF — issues appear live one page at a time
- [ ] Progress dots advance as each page completes
- [ ] Sheet type badge (E, A, M, etc.) appears on thumbnails and issue cards
- [ ] Criteria cards have green/red left border matching pass/fail
- [ ] AI Summary shows in inset box on each criterion
- [ ] Confidence filter toggle in toolbar works — hides low-confidence issues
- [ ] Press `?` shows keyboard shortcut overlay
- [ ] Press `Escape` closes all modals
- [ ] 90-page PDF shows page cap warning, analyzes only first 20
- [ ] All 14 tests pass (`npm run test`)
- [ ] Type check clean (`npm run check`)
