# Comprehensive Improvements Design
**Date:** 2026-02-24
**Context:** "Hire me" demo pitch to Structured AI (YC company)
**Goal:** Match Structured AI's product quality — streaming results, domain intelligence, UI polish, production-grade code

---

## Section 1: Streaming Analysis

**Problem:** Single batched POST → long spinner → all results dump at once.

**Solution:** Fire one fetch per page as soon as its base64 is ready. Results populate the UI live.

- Client renders pages with concurrency limit (5 workers), fires individual POSTs per page as each finishes
- Store gains `appendIssues(issues)` and `appendCriteria(criteria)` methods for incremental updates
- Progress bar advances as each page's response arrives
- Issues panel populates live while other pages still analyzing

**API change:** `/api/analyze` continues to accept `{ pages: [single page] }` — no new endpoint needed. The batch path still works as a fallback.

---

## Section 2: Domain Intelligence

**Problem:** Generic prompt, no sheet type awareness, imprecise bboxes, no confidence filtering.

**Solutions:**

1. **Sheet type detection** — Gemini identifies each page as `electrical | mechanical | structural | architectural | plumbing | civil | cover | schedule | unknown`. Stored on QACriterion and Issue. Shown as badge in issues panel and thumbnails.

2. **Improved prompt** — Explicit instructions for tight bboxes, concise titles (&lt;6 words), sheet number extraction, chain-of-thought reasoning before JSON output.

3. **Confidence threshold filter** — Toggle in toolbar: "High confidence only (≥80%)". Hides noisy low-confidence issues.

4. **Criteria relevance by sheet type** — Skip irrelevant criteria automatically in prompt based on detected type. Fire safety N/A on cover sheets; clearance N/A on electrical sheets.

---

## Section 3: UI Polish

**Criteria cards redesign:**
- Color-coded left border: green=pass, red=fail, gray=n/a
- AI Summary in subtle inset box
- Checklist bullets for each criterion's sub-requirements
- Matches Structured AI's actual UI

**Issue cards:**
- Sheet type badge (E, A, M, S, P)
- Confidence pill (green ≥80%, amber 50-79%, red &lt;50%)
- Truncated description preview (2 lines)

**New UX elements:**
- `?` key opens keyboard shortcut overlay
- Page type label under each thumbnail ("E1", "A2")
- Better empty states (green checkmark for pass, setup guide for missing API key)
- Toolbar: remove Share button, tighten layout

---

## Section 4: Code Quality

- Add ESLint + Prettier configuration
- Delete unused `src/lib/config/brand-colors.ts`
- Extract all magic numbers to `src/lib/config/constants.ts`
- Replace 15+ inline temp-subscription pattern with `get()` from `svelte/store`
- Add server-side page cap validation (400 if > MAX_PAGES)
- Add Vitest test for `/api/analyze` with mocked Gemini response
- Fix 3 silent-default type coercions to log warnings

---

## Implementation Order

1. Code quality foundations (ESLint, constants, dead code removal)
2. Store changes (append methods, sheet type field)
3. API improvements (prompt, sheet type, server-side validation)
4. Streaming client (per-page fetches, live UI updates)
5. UI polish (criteria cards, confidence filter, sheet badges, shortcuts overlay)
6. Tests
