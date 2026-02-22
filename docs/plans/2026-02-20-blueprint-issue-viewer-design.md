# Blueprint Issue Review Viewer — Design Document

**Date:** 2026-02-20
**Target:** Structured AI (YC) — Software Engineering Intern cold-email demo
**Goal:** Prototype the "AI found issues → human reviews in a viewer" workflow for construction blueprint QA/QC

## 2026-02-21 Remediation Update

- Runtime is now pinned to Node 22 for local/CI/deploy parity.
- Issue selection now recenters the viewport on the selected bbox.
- Viewer now prefetches/caches current page ±1 for faster page navigation.
- Upload flow now uses a canonical document token so viewer and thumbnails stay synchronized.
- Automated validation now includes:
  - `npm run check`
  - `npm run test` (unit/store/component)
  - `npm run test:e2e` (Playwright)
  - `npm run build`

## User Story

An engineer opens the viewer, sees a multi-page architectural blueprint rendered with pan/zoom. A side panel lists AI-detected issues (clashes, missing labels, code violations). Clicking an issue jumps to the correct page, highlights the region with a bounding box, and shows issue metadata. The engineer can filter by severity/status, toggle overlay visibility, and cycle through issues with keyboard shortcuts.

## Tech Stack

- **Framework:** SvelteKit + Vite + TypeScript
- **PDF Rendering:** pdf.js (direct, no wrapper)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Toolbar  [Upload] [Zoom +/-] [Filters] [Toggle All] │
├────────────┬─────────────────────────┬───────────────┤
│            │                         │               │
│  Issues    │   PDF Viewer Canvas     │  Issue Detail │
│  Panel     │   + SVG Overlay Layer   │  (selected)   │
│            │                         │               │
│  - Issue 1 │   ┌─────────┐          │  Title        │
│  > Issue 2 │   │ bbox    │          │  Severity     │
│  - Issue 3 │   └─────────┘          │  Description  │
│            │                         │  [Resolve]    │
│            │                         │               │
├────────────┼─────────────────────────┤  [Prev][Next] │
│  Page      │  Page 2 of 4   [< >]   │               │
│  Thumbs    │                         │               │
└────────────┴─────────────────────────┴───────────────┘
```

## Components

### AppToolbar
Top bar with: project title, upload button, zoom in/out/reset, filter chips (severity + status), "show all overlays" toggle.

### IssuesPanel (left sidebar)
- Lists issues grouped by page
- Each row: severity color dot, title, page badge
- Hover: soft highlight on canvas bbox
- Click: select issue, navigate to page, center on bbox
- Active issue row highlighted

### DocumentViewer (center)
- Renders current PDF page to `<canvas>` via pdf.js
- SVG overlay layer positioned absolutely on top for bounding boxes
- Zoom: CSS `transform: scale(level)` on wrapper, re-render canvas at resolution thresholds (0.5x, 1x, 1.5x, 2x)
- Pan: pointer drag → `translate(dx, dy)` on wrapper
- Lazy rendering: current page only, cache ±1 neighbor
- Page navigation: prev/next buttons, page counter

### BboxOverlay (SVG layer)
- Same dimensions as canvas
- `<rect>` elements for each issue on current page
- Coordinates: `issue.bbox * canvasDimensions` (bbox is normalized 0–1)
- Selected: bold yellow border with shadow
- Others (when show-all is on): faded gray
- Hover from panel: subtle pulse animation

### IssueDetail (right sidebar)
- Title, category, severity badge, status
- Description text
- "Mark as Resolved" / "Reopen" button
- Prev/Next issue navigation

### PageThumbnails (bottom of left panel)
- Low-res page previews
- Click to navigate
- Current page highlighted

## Data Model

```ts
type IssueSeverity = 'low' | 'medium' | 'high';
type IssueStatus = 'open' | 'resolved';

type Issue = {
  id: string;
  page: number;           // 1-indexed
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  category: string;       // "clash" | "missing-label" | "code-violation" | "clearance"
  bbox: {
    x: number;            // normalized 0–1
    y: number;
    width: number;
    height: number;
  };
};
```

~15–20 hardcoded issues across 3–4 pages covering realistic construction QA scenarios.

## Key Interactions

| Action | Result |
|--------|--------|
| Click issue row | Select, navigate to page, center viewport on bbox |
| Hover issue row | Soft highlight on corresponding bbox |
| Mouse wheel on viewer | Zoom in/out (clamped 0.25x–4x) |
| Click-drag on viewer | Pan |
| Severity filter chips | Show/hide issues by severity |
| Status filter | All / Open / Resolved |
| Toggle overlays | Show all bboxes vs selected only |
| `j` / `k` keys | Next / prev issue |
| `n` / `p` keys | Next / prev page |
| Upload button | Load new PDF (fallback to sample) |

## Performance Strategy

1. **Lazy page rendering:** Only render the active page canvas; cache ±1 neighbors
2. **CSS transform zoom:** Avoid re-rendering PDF on every zoom increment; re-render at thresholds
3. **SVG overlay separation:** Bounding boxes on separate layer, no PDF re-draw on highlight changes
4. **Low-res thumbnails:** Render thumbnails at reduced scale factor
5. **Web worker note:** pdf.js supports worker-based parsing (mention in README even if not fully utilized)

## Mock Blueprint

Node script generates 3–4 SVG floor plan pages and converts to multi-page PDF:
- Page 1: Ground floor (rooms, doors, windows, dimensions)
- Page 2: First floor (different room layout)
- Page 3: MEP overlay (ducts, pipes, electrical)
- Page 4: Structural (beams, columns, foundations)

## File Structure

```
src/
  routes/
    +page.svelte
    +layout.svelte
  lib/
    components/
      AppToolbar.svelte
      IssuesPanel.svelte
      DocumentViewer.svelte
      IssueDetail.svelte
      PageThumbnails.svelte
      BboxOverlay.svelte
    stores/
      viewer.ts
      issues.ts
    types/
      index.ts
    data/
      issues.json
    utils/
      pdf-renderer.ts
      coordinates.ts
static/
  sample-blueprint.pdf
scripts/
  generate-blueprint.ts
```

## Presentation Framing

Position as: "Front-end for AI QA/QC results on construction blueprints"

Emphasize:
- User-centered design modeled after drawing review tools (Revit/Bluebeam)
- Performance-aware rendering for large multi-page construction sets
- Pluggable data model — issues assume AI agent output
- Svelte + TypeScript matching Structured AI's stack
- Normalized bounding boxes for resolution-independent AI coordinates









