# Architecture Overview

## Runtime Flow

1. User uploads a PDF in `src/routes/+page.svelte`.
2. Client loads the PDF with `pdfjs-dist` and renders pages to images (`src/lib/utils/page-to-image.ts`).
3. Client sends per-page requests to `POST /api/analyze` with a base64 data URL payload.
4. API route validates request payloads, selects an analysis provider, validates provider output, and maps results into UI types.
5. Client streams criteria/issues into Svelte stores and updates progress/UI incrementally.

## Main Client Responsibilities

- `src/routes/+page.svelte`: upload flow, analysis orchestration, progress/error UI, keyboard shortcuts.
- `src/lib/stores/issues.ts`: issue/criteria state, filters, selection, analysis status.
- `src/lib/stores/viewer.ts`: page, zoom, pan, overlay visibility.
- `src/lib/components/DocumentViewer.svelte`: PDF page rendering, pan/zoom, overlay alignment.

## Main Server Responsibilities

- `src/routes/api/analyze/+server.ts`: request orchestration, per-page error handling, response metadata.
- `src/lib/server/analysis/providers/*`: provider-specific AI calls (Gemini + mock).
- `src/lib/server/analysis/schemas.ts`: runtime validation for request and provider responses.
- `src/lib/server/analysis/mappers.ts`: convert provider output into app-facing `Issue`/`QACriterion` models.

## Reliability Notes

- E2E tests mock `/api/analyze` and should not depend on real Gemini credentials.
- Report preview/export escapes dynamic content and uses a sandboxed iframe preview.
- API route degrades malformed AI responses to page-level errors when possible.
