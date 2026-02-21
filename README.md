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

Bounding boxes use normalized coordinates (0-1) so AI models can provide results independent of rendering resolution.

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
