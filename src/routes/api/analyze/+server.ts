import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AnalysisPageResultSummary, AnalysisResponse, QACriterion, Issue } from '$lib/types';
import { ZodError } from 'zod';
import { getServerEnv } from '$lib/server/env';
import { createAnalysisProvider } from '$lib/server/analysis/provider-factory';
import {
  analyzeRequestSchema,
  providerPageResultSchema,
  type AnalyzeRequest,
} from '$lib/server/analysis/schemas';
import { logger } from '$lib/server/logging';
import {
  makePageErrorCriterion,
  mapProviderPageResult,
} from '$lib/server/analysis/mappers';

const API_MESSAGES = {
  missingApiKey: 'GEMINI_API_KEY is not configured. Set it in your .env file.',
  invalidRequest: 'Invalid analysis request payload.',
  invalidDocument: 'Unable to analyze this document. Please upload a valid construction blueprint PDF.',
  malformedModelResponse: 'Analysis failed: malformed AI response for this page.',
  upstreamFailure: 'Analysis failed due to an upstream AI service error.',
} as const;

function createRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function roundMs(ms: number): number {
  return Math.round(ms);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return API_MESSAGES.malformedModelResponse;
  }
  if (err instanceof Error) {
    if (err.message.includes('Gemini API error')) return API_MESSAGES.upstreamFailure;
    return `Analysis failed: ${err.message}`;
  }
  return 'Analysis failed: Unknown error';
}

async function parseAnalyzeRequest(request: Request): Promise<AnalyzeRequest> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, API_MESSAGES.invalidRequest);
  }

  try {
    return analyzeRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw error(400, API_MESSAGES.invalidRequest);
    }
    throw err;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const requestId = createRequestId();
  const startedAt = performance.now();
  const { pages } = await parseAnalyzeRequest(request);

  const envConfig = getServerEnv();
  let provider;
  try {
    provider = createAnalysisProvider(envConfig);
  } catch (err) {
    const message = err instanceof Error ? err.message : API_MESSAGES.missingApiKey;
    logger.error('analysis.provider_init_failed', { requestId, message });
    throw error(500, message);
  }

  logger.info('analysis.request_received', {
    requestId,
    provider: provider.name,
    pageCount: pages.length,
  });

  const settledPageResults = await Promise.allSettled(
    pages.map(async (page) => {
      const pageStarted = performance.now();
      const raw = await provider.analyzePage({
        pageNumber: page.pageNumber,
        image: page.image,
        requestId,
      });
      const parsed = providerPageResultSchema.parse(raw);
      return {
        pageNumber: page.pageNumber,
        parsed,
        durationMs: roundMs(performance.now() - pageStarted),
      };
    })
  );

  const allCriteria: QACriterion[] = [];
  const allIssues: Issue[] = [];
  const pageResults: AnalysisPageResultSummary[] = [];
  const issueCounterRef = { value: 1 };
  let failedPageCount = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const settled = settledPageResults[i];

    if (settled.status === 'rejected') {
      const userMessage = toErrorMessage(settled.reason);
      logger.error('analysis.page_failed', {
        requestId,
        pageNumber: page.pageNumber,
        reason: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
      });
      allCriteria.push(makePageErrorCriterion(page.pageNumber, userMessage));
      pageResults.push({
        pageNumber: page.pageNumber,
        status: 'error',
        issueCount: 0,
        criterionCount: 1,
        error: userMessage,
      });
      failedPageCount++;
      continue;
    }

    const mapped = mapProviderPageResult(
      page.pageNumber,
      settled.value.parsed,
      issueCounterRef,
      settled.value.durationMs
    );
    allCriteria.push(...mapped.criteria);
    allIssues.push(...mapped.issues);
    pageResults.push(mapped.pageSummary);
    if (mapped.unrecognized) failedPageCount++;
  }

  if (failedPageCount === pages.length) {
    logger.warn('analysis.all_pages_failed', {
      requestId,
      pageCount: pages.length,
      provider: provider.name,
    });
    throw error(400, API_MESSAGES.invalidDocument);
  }

  const totalMs = roundMs(performance.now() - startedAt);
  const avgPageMs =
    pageResults.length > 0
      ? roundMs(
          pageResults.reduce((sum, p) => sum + (p.durationMs ?? 0), 0) / pageResults.length
        )
      : 0;

  logger.info('analysis.completed', {
    requestId,
    provider: provider.name,
    totalPages: pages.length,
    failedPages: failedPageCount,
    issueCount: allIssues.length,
    durationMs: totalMs,
  });

  return json({
    criteria: allCriteria,
    issues: allIssues,
    pageResults,
    metadata: {
      requestId,
      totalPages: pages.length,
      analyzedPages: pages.length - failedPageCount,
      failedPages: failedPageCount,
      emptyIssues: allIssues.length === 0,
      timings: {
        totalMs,
        avgPageMs,
      },
    },
  } satisfies AnalysisResponse);
};
