import { qaCriteria } from '$lib/config/qa-criteria';
import { UNRECOGNIZED_CONTENT_THRESHOLD } from '$lib/config/constants';
import type {
  AnalysisPageResultSummary,
  Issue,
  IssueCategory,
  IssueSeverity,
  QACriterion,
  SheetType,
} from '$lib/types';
import type { ProviderPageResult } from '$lib/server/analysis/schemas';

function convertBbox(box: [number, number, number, number]) {
  const [ymin, xmin, ymax, xmax] = box;
  return {
    x: Math.max(0, Math.min(1, xmin / 1000)),
    y: Math.max(0, Math.min(1, ymin / 1000)),
    width: Math.max(0, Math.min(1, (xmax - xmin) / 1000)),
    height: Math.max(0, Math.min(1, (ymax - ymin) / 1000)),
  };
}

function toSheetType(value?: string): SheetType {
  switch (value) {
    case 'architectural':
    case 'electrical':
    case 'mechanical':
    case 'structural':
    case 'plumbing':
    case 'civil':
    case 'cover':
    case 'schedule':
    case 'unknown':
      return value;
    default:
      return 'unknown';
  }
}

export function makePageErrorCriterion(pageNumber: number, message: string): QACriterion {
  return {
    id: `ERR-${pageNumber}`,
    name: 'Analysis Error',
    description: 'Failed to analyze this page',
    result: 'not-applicable',
    summary: message,
    page: pageNumber,
  };
}

export function mapProviderPageResult(
  pageNumber: number,
  result: ProviderPageResult,
  issueCounterRef: { value: number },
  durationMs?: number
): {
  criteria: QACriterion[];
  issues: Issue[];
  pageSummary: AnalysisPageResultSummary;
  unrecognized: boolean;
} {
  const sheetType = toSheetType(result.sheetType);
  const notApplicableCount = result.criteria.filter((c) => c.result === 'not-applicable').length;
  const notApplicableRatio = result.criteria.length > 0 ? notApplicableCount / result.criteria.length : 0;
  const unrecognized = notApplicableRatio > UNRECOGNIZED_CONTENT_THRESHOLD;

  if (unrecognized) {
    return {
      criteria: [
        {
          id: `WARN-${pageNumber}`,
          name: 'Content Recognition Warning',
          description: 'Unable to recognize this as a construction blueprint',
          result: 'not-applicable',
          summary:
            'The AI was unable to reliably identify this page as a construction blueprint. ' +
            'Possible causes: not a blueprint, low image quality, or unsupported drawing type.',
          page: pageNumber,
          sheetType,
        },
      ],
      issues: [],
      pageSummary: {
        pageNumber,
        status: 'unrecognized',
        issueCount: 0,
        criterionCount: 1,
        durationMs,
      },
      unrecognized: true,
    };
  }

  const criteria: QACriterion[] = result.criteria.map((c) => ({
    id: c.id || `${c.criterionKey}-${pageNumber}`,
    name: c.name,
    description: qaCriteria.find((q) => q.id === c.criterionKey)?.description ?? '',
    result: c.result,
    summary: c.summary ?? '',
    page: pageNumber,
    confidence: c.confidence ?? 50,
    sheetType,
  }));

  const issues: Issue[] = result.issues.map((issue) => ({
    id: `ISS-${String(issueCounterRef.value++).padStart(3, '0')}`,
    page: pageNumber,
    title: issue.title,
    description: issue.description,
    severity: issue.severity as IssueSeverity,
    status: 'open',
    category: issue.category as IssueCategory,
    bbox: convertBbox(issue.box_2d),
    criterionId: `${issue.criterionKey}-${pageNumber}`,
    confidence: issue.confidence ?? 50,
    sheetType,
  }));

  return {
    criteria,
    issues,
    pageSummary: {
      pageNumber,
      status: 'ok',
      issueCount: issues.length,
      criterionCount: criteria.length,
      durationMs,
    },
    unrecognized: false,
  };
}
