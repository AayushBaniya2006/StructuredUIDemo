import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QACriterion, Issue, IssueSeverity, IssueCategory, AnalysisResponse } from '$lib/types';
import { env } from '$env/dynamic/private';
import { qaCriteria } from '$lib/config/qa-criteria';

const GEMINI_MODEL = env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt(pageNumber: number): string {
	const criteriaList = qaCriteria.map(
		(c) => `- ${c.id}: ${c.name} — ${c.description}`
	).join('\n');

	return `You are a construction QA/QC reviewer analyzing a blueprint page.

Evaluate this construction drawing (page ${pageNumber}) against these criteria:
${criteriaList}

For each criterion, determine:
- "pass" if the requirement is met
- "fail" if the requirement is NOT met (there's a deficiency)
- "not-applicable" if the criterion doesn't apply to this page type

For each FAILED criterion, identify specific issues with bounding boxes showing where the problem is on the drawing.

Return ONLY valid JSON in this exact format:
{
  "criteria": [
    {
      "id": "EQ-${pageNumber}",
      "criterionKey": "EQ",
      "name": "Equipment/Element Labels",
      "result": "pass" | "fail" | "not-applicable",
      "summary": "Brief explanation of finding",
      "confidence": 0-100
    }
  ],
  "issues": [
    {
      "title": "Short issue title",
      "description": "Detailed description of the issue",
      "severity": "high" | "medium" | "low",
      "category": "clash" | "missing-label" | "code-violation" | "clearance",
      "criterionKey": "EQ",
      "box_2d": [ymin, xmin, ymax, xmax],
      "confidence": 0-100
    }
  ]
}

IMPORTANT:
- Include a "confidence" score (0-100) for each criterion and issue indicating your certainty
- Higher confidence (80-100) means you're very certain
- Medium confidence (50-79) means reasonably certain but possible ambiguity
- Low confidence (0-49) means uncertain, low-quality data, or unclear situation
- box_2d coordinates are normalized 0-1000 (0=top-left, 1000=bottom-right)
- box_2d coordinates are normalized 0-1000 (0=top-left, 1000=bottom-right)
- Only include issues for FAILED criteria
- Be specific about what's missing or wrong
- Severity: high=safety/code violation, medium=missing info, low=minor annotation gap`;
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

async function analyzePage(
	pageNumber: number,
	imageBase64: string,
	apiKey: string
): Promise<GeminiPageResult> {
	// Strip data URL prefix if present
	const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

	const body = {
		contents: [
			{
				parts: [
					{ text: buildPrompt(pageNumber) },
					{
						inline_data: {
							mime_type: 'image/png',
							data: base64Data,
						},
					},
				],
			},
		],
		generationConfig: {
			response_mime_type: 'application/json',
			temperature: 0.2,
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

		const allCriteria: QACriterion[] = [];
	const allIssues: Issue[] = [];
	let issueCounter = 1;
	let failedPageCount = 0;
	const totalPages = pages.length;

	for (const page of pages) {
		try {
			const result = await analyzePage(page.pageNumber, page.image, apiKey);

			// Check if Gemini recognized this as a blueprint
			// If most criteria are not-applicable, the content wasn't recognized
			const notApplicableCount = result.criteria.filter((c) => c.result === 'not-applicable').length;
			const totalCriteria = result.criteria.length;
			const notApplicableRatio = totalCriteria > 0 ? notApplicableCount / totalCriteria : 0;

			if (notApplicableRatio > 0.7) {
				// More than 70% not-applicable - likely unrecognized content
				allCriteria.push({
					id: `WARN-${page.pageNumber}`,
					name: 'Content Recognition Warning',
					description: 'Unable to recognize this as a construction blueprint',
					result: 'not-applicable',
					summary: 'The AI was unable to reliably identify this page as a construction blueprint. This may be because: 1) The file is not a blueprint, 2) The image quality is too low, 3) The blueprint type is not supported. Please try uploading a clearer construction drawing.',
					page: page.pageNumber,
				});

				failedPageCount++;
				continue;
			}

			// Convert criteria
			for (const c of result.criteria) {
				const validResult = ['pass', 'fail', 'not-applicable'].includes(c.result)
					? (c.result as QACriterion['result'])
					: 'not-applicable';

				allCriteria.push({
					id: c.id || `${c.criterionKey}-${page.pageNumber}`,
					name: c.name,
					description: qaCriteria.find((q) => q.id === c.criterionKey)?.description ?? '',
					result: validResult,
					summary: c.summary ?? '',
					page: page.pageNumber,
					confidence: c.confidence,
				});
			}

			// Convert issues
			for (const issue of result.issues) {
				const severity: IssueSeverity = VALID_SEVERITIES.has(issue.severity)
					? (issue.severity as IssueSeverity)
					: 'medium';
				const category: IssueCategory = VALID_CATEGORIES.has(issue.category)
					? (issue.category as IssueCategory)
					: 'missing-label';

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
				});
			}
		} catch (err) {
			// If a single page fails, add a note but continue
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
		}
	}

	// If all pages failed, return an error instead of a successful response
	if (failedPageCount === totalPages) {
		throw error(400, 'Unable to analyze this document. This may be because: 1) The file is not a valid PDF blueprint, 2) The image quality is too low for AI analysis, 3) The blueprint format is not supported. Please try uploading a clearer construction drawing.');
	}

	return json({
		criteria: allCriteria,
		issues: allIssues,
		metadata: {
			totalPages,
			analyzedPages: totalPages - failedPageCount,
			failedPages: failedPageCount,
			emptyIssues: allIssues.length === 0,
		}
	} satisfies AnalysisResponse);
};
