# Baseline Triage (2026-02-25)

## Summary

- Repository checks were green for `check`, `lint`, `test`, and `build`.
- `npm run test:e2e` failed due to an outdated smoke test assumption.

## Confirmed E2E Mismatch

- `e2e/app.spec.ts` smoke test expected the full viewer (`app-toolbar`, `issues-panel`, `document-viewer`) on initial load.
- The current app now opens in a welcome/upload state first (`src/routes/+page.svelte`).
- Captured artifact `test-results/app-app-smoke-loads-core-panels-chromium/error-context.md` shows the welcome screen snapshot, confirming the test drift.

## Impact

- The E2E suite is non-deterministic and currently blocks trust in CI feedback.
- Upload/analysis flow tests also implicitly depend on external API behavior unless `/api/analyze` is mocked.

## Next Actions Implemented in This Remediation Pass

- Update E2E specs to assert the welcome state first.
- Mock `/api/analyze` responses in Playwright for deterministic offline tests.
- Add `npm run validate` and split CI into `validate` and `e2e` jobs.
