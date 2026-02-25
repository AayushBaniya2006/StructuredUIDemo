import { qaCriteria } from '$lib/config/qa-criteria';

export function buildBlueprintAnalysisPrompt(pageNumber: number): string {
  const criteriaList = qaCriteria
    .map((c) => `- ${c.id}: ${c.name} — ${c.description}`)
    .join('\n');

  return `You are a senior construction QA/QC engineer reviewing a blueprint sheet.

STEP 1 — Identify the sheet:
Determine the sheet type from the title block or drawing content.
Sheet types: architectural, electrical, mechanical, structural, plumbing, civil, cover, schedule, unknown.

STEP 2 — Evaluate each criterion (page ${pageNumber}):
${criteriaList}

For each criterion, determine:
- "pass" if the requirement is met
- "fail" if there is a clear, visible deficiency (only flag genuine problems, not hypotheticals)
- "not-applicable" if the criterion does not apply to this sheet type

STEP 3 — For each FAILED criterion, identify specific issues with TIGHT bounding boxes.
Bounding box rules:
- Draw the SMALLEST box that wraps the exact problematic element or missing region
- Do NOT box the entire page, entire drawing area, or large blank regions
- box_2d format: [ymin, xmin, ymax, xmax] on a 0–1000 scale (0=top-left, 1000=bottom-right)

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "sheetType": "electrical",
  "criteria": [
    {
      "id": "EQ-${pageNumber}",
      "criterionKey": "EQ",
      "name": "Equipment/Element Labels",
      "result": "pass",
      "summary": "One specific sentence. Name the exact element or location (e.g. 'CRAC unit at grid B-3 has no circuit label').",
      "confidence": 85
    }
  ],
  "issues": [
    {
      "title": "Max 6 words describing the problem",
      "description": "2-3 sentences: what is wrong, where it is, why it matters for construction.",
      "severity": "high",
      "category": "missing-label",
      "criterionKey": "EQ",
      "box_2d": [100, 200, 300, 400],
      "confidence": 90
    }
  ]
}

Category (MUST be one of these exact strings):
- "clash" = spatial conflict or interference between elements
- "missing-label" = label, tag, or annotation is absent
- "code-violation" = violates building code, fire safety, or ADA requirements
- "clearance" = insufficient clearance, spacing, or access

Severity guide:
- high = safety risk or building code violation
- medium = missing info that would trigger an RFI or cause rework
- low = minor annotation gap or cosmetic issue

Confidence guide:
- 80-100 = clearly visible in the drawing
- 50-79 = visible but some ambiguity
- 0-49 = inferred or unclear

RULES:
- Only include issues for FAILED criteria
- Issue titles must be 6 words or fewer
- box_2d MUST tightly wrap the specific problem element
- If no issues found, return "issues": []
- Every criterion and issue MUST include a confidence score`;
}
