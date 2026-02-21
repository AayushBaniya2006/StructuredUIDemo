# Gemini AI Integration — Design Document

**Date:** 2026-02-21
**Goal:** Replace hardcoded mock issues with real AI-powered blueprint analysis using Google Gemini, modeled after Structured AI's criteria-based QA/QC workflow.

## Architecture

```
User uploads PDF (or clicks "Try Demo")
  |
  v
Client: pdf.js renders each page to PNG (canvas.toBlob)
  |
  v
Client: POST /api/analyze with page images as base64
  |
  v
Server: SvelteKit API route (+server.ts)
  |  Reads GEMINI_API_KEY from environment
  |  For each page:
  |    → Sends image to Gemini 2.5 Flash
  |    → Structured prompt with QA criteria
  |    → Gemini returns JSON with criteria results + bounding boxes
  |
  v
Server: assembles results, returns to client
  |
  v
Client: loads criteria + issues into stores
  → Criteria panel shows PASS/FAIL cards
  → Issues with bounding boxes appear on the drawing
```

## Data Model

### New: QA Criterion

```ts
type CriterionResult = 'pass' | 'fail' | 'not-applicable';

type QACriterion = {
  id: string;           // "EQ-1", "DIM-1"
  name: string;         // "Equipment Labels Present"
  description: string;  // what this criterion checks
  result: CriterionResult;
  summary: string;      // AI-generated explanation
  page: number;         // which page this was evaluated on
};
```

### Extended Issue Type

```ts
type Issue = {
  id: string;
  page: number;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: IssueCategory;
  bbox: BoundingBox;
  criterionId?: string;  // optional link to parent criterion
};
```

### Analysis Response

```ts
type AnalysisResponse = {
  criteria: QACriterion[];
  issues: Issue[];
};
```

## QA Criteria

6-8 construction-specific criteria evaluated per page:

1. **EQ — Equipment/Element Labels** — All major equipment, rooms, and elements are labeled
2. **DIM — Dimension Strings** — Dimension lines are present and complete
3. **TB — Title Block & Scale** — Title block present with sheet number, scale indicated
4. **FS — Fire Safety Markings** — Fire exits, fire-rated assemblies, extinguishers marked
5. **SYM — Symbol Consistency** — Symbols match legend, no undefined symbols
6. **ANN — Annotations & Notes** — General notes, callouts, and references present
7. **CRD — Coordination Markers** — Grid lines, column markers, reference bubbles present
8. **CLR — Clearance & Accessibility** — ADA clearances, door swings, egress paths shown

Not all criteria apply to every page type (MEP vs structural vs architectural). Gemini determines applicability and returns "not-applicable" when a criterion doesn't apply to the page content.

## Gemini API Details

- **Model:** gemini-2.5-flash (fast, cheap, has native bounding box output)
- **Input:** base64-encoded PNG of each rendered page (~1500px on long edge for quality/cost balance)
- **Output format:** Structured JSON via Gemini's JSON mode
- **Bounding boxes:** Gemini returns `box_2d` in [ymin, xmin, ymax, xmax] format, normalized 0-1000. We convert to our 0-1 format: `{ x: xmin/1000, y: ymin/1000, width: (xmax-xmin)/1000, height: (ymax-ymin)/1000 }`
- **Cost:** ~$0.01-0.03 per page on free tier
- **Rate limit:** Free tier allows 15 RPM, which is fine for sequential page analysis

## API Route

`POST /api/analyze`

Request body:
```json
{
  "pages": [
    { "pageNumber": 1, "image": "data:image/png;base64,..." },
    { "pageNumber": 2, "image": "data:image/png;base64,..." }
  ]
}
```

Response:
```json
{
  "criteria": [...],
  "issues": [...]
}
```

## UX Changes

### Analysis Progress
After upload, show a modal/overlay:
- "Analyzing blueprint..."
- Per-page progress: "Checking page 1 of 4..."
- Animated progress bar
- Cancel button

### Criteria Panel (replaces or supplements IssueDetail right sidebar)
- List of criteria cards, each with:
  - Green border + checkmark for PASS
  - Red border + X for FAIL
  - Gray for NOT APPLICABLE
  - AI summary text
- Clicking a failed criterion filters the issues panel to show only related issues

### Re-analyze Button
- Add "Re-run Check" button to toolbar (matching Structured AI's UI)
- Re-sends all pages to Gemini

### Updated Welcome Screen
- "Try Demo" still loads sample PDF but NOW runs real Gemini analysis instead of loading mock JSON
- "Upload PDF" runs analysis on the uploaded document

## File Structure (new/modified)

```
src/
  routes/
    api/
      analyze/
        +server.ts        # NEW — Gemini API route
    +page.svelte           # MODIFIED — analysis flow, progress UI
  lib/
    types/
      index.ts             # MODIFIED — add QACriterion, CriterionResult
    stores/
      issues.ts            # MODIFIED — add criteria store
    components/
      AnalysisProgress.svelte  # NEW — progress overlay
      CriteriaPanel.svelte     # NEW — replaces static IssueDetail when viewing criteria
      AppToolbar.svelte        # MODIFIED — add Re-run Check button
    utils/
      page-to-image.ts     # NEW — render PDF page to base64 PNG
.env                        # NEW — GEMINI_API_KEY (gitignored)
.env.example                # NEW — template with placeholder
```

## Environment & Deployment

- `GEMINI_API_KEY` set in `.env` locally, in Vercel environment variables for production
- `.env` added to `.gitignore`
- `.env.example` committed with `GEMINI_API_KEY=your_key_here`

## Error Handling

- No API key configured → show message: "Set GEMINI_API_KEY to enable AI analysis"
- Gemini rate limit hit → retry with backoff, show "Rate limited, retrying..."
- Gemini returns malformed JSON → fall back gracefully, show "Analysis incomplete for page X"
- Network error → show retry option
- User cancels during analysis → abort pending requests
