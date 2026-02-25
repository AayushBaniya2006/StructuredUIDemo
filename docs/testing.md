# Testing Guide

## Commands

```bash
npm run validate
npm run test
npm run test:e2e
```

## What Runs Where

- `npm run test`: Vitest unit/component/API-route tests.
- `npm run test:e2e`: Playwright end-to-end tests (Chromium).

## E2E Mocking Strategy

Playwright tests intercept `POST /api/analyze` and return mocked JSON payloads. This keeps E2E runs:

- deterministic,
- offline-capable,
- independent of Gemini API keys,
- faster than live-provider tests.

## Local Requirements

- Node.js `22.x` recommended (repo engines target).
- For Playwright local setup:

```bash
npx playwright install chromium
```

## Common Failure Modes

- Smoke test drift after UX changes:
  update test expectations for the current initial route state (welcome vs viewer).
- API route tests failing after schema changes:
  update mocked provider payloads to match `src/lib/server/analysis/schemas.ts`.
