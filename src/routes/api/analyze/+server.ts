import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
  QACriterion,
  Issue,
  IssueSeverity,
  IssueCategory,
  AnalysisResponse,
  SheetType,
} from '$lib/types';
import { env } from '$env/dynamic/private';
import { qaCriteria } from '$lib/config/qa-criteria';
import { MAX_PAGES, UNRECOGNIZED_CONTENT_THRESHOLD } from '$lib/config/constants';

const GEMINI_MODEL = env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALID_SHEET_TYPES = new Set<SheetType>([
  'architectural',
  'electrical',
  'mechanical',
  'structural',
  'plumbing',
  'civil',
  'cover',
  'schedule',
  'unknown',
]);

function buildPrompt(pageNumber: number): string {
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
      thinkingConfig: { thinkingBudget: 0 },
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
    const sheetType: SheetType = VALID_SHEET_TYPES.has(result.sheetType as SheetType)
      ? (result.sheetType as SheetType)
      : 'unknown';

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

      if (!c.confidence) {
        console.warn(`Criterion "${c.criterionKey}" on page ${page.pageNumber} has no confidence score`);
      }

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
