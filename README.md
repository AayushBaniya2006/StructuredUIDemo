# Blueprint Issue Review Viewer

A construction blueprint QA/QC issue viewer built as a front-end prototype for AI-driven drawing review workflows.

## What This Demonstrates

- PDF viewer with pan/zoom and page rendering via pdf.js
- AI issue overlay with normalized bounding boxes on an SVG layer
- Issue management with severity/status filtering and keyboard navigation
- Center-on-selection behavior for issue review workflows
- Performance-aware rendering with CSS transform zoom and neighbor-page prefetching

## Runtime Requirements

- Node.js `22.x` (pinned for local + CI + Vercel runtime compatibility)
- npm `10+`

## Setup

1. Get a free Gemini API key at https://aistudio.google.com/apikey
2. Create a `.env` file with your API key:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

3. Install dependencies:

```bash
npm install
```

4. Start development server:

```bash
npm run dev
```

Then open http://localhost:5173 and upload a PDF blueprint to begin analysis.

## Development

## Validation Commands

```bash
npm run check
npm run test
npm run test:e2e
npm run build
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous issue |
| `n` / `p` | Next / previous page |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |

## Architecture Notes

- Bounding boxes are normalized (0-1) and mapped to canvas dimensions at render time.
- The app tracks a canonical `documentId` token so uploaded PDFs stay synchronized across:
  - main document viewer,
  - page thumbnails,
  - page navigation state.
- Selecting an issue recenters the viewport on the selected issue's bbox.
- The viewer caches current page ±1 to reduce navigation latency.

## Generate New E2E Test Fixture

```bash
npx tsx e2e/fixtures/generate-fixture.ts
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY` — Your Google Gemini API key (required for AI analysis)
- `GEMINI_MODEL` — The Gemini model to use (default: `gemini-2.5-flash`)

### App Configuration

UI text and labels are centralized in `src/lib/config/app-config.ts`. Modify this file to customize:
- Application name and branding
- Button labels and status text
- Filter options
- Empty state messages
- And more...

QA criteria definitions are in `src/lib/config/qa-criteria.ts`. Modify this file to change which construction standards are checked during analysis.

## Troubleshooting

- `Unsupported Node.js version` during build:
  - switch to Node `22.x` (`nvm use 22`) and retry.
- PDF upload fails:
  - ensure the uploaded file is a valid `.pdf` with MIME `application/pdf`.
- If tests fail locally:
  - install browser deps for Playwright:
  ```bash
  npx playwright install chromium
  ```
