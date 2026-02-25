import { MAX_PAGES } from '$lib/config/constants';
import { z } from 'zod';

export const sheetTypeValues = [
  'architectural',
  'electrical',
  'mechanical',
  'structural',
  'plumbing',
  'civil',
  'cover',
  'schedule',
  'unknown',
] as const;

export const issueSeverityValues = ['high', 'medium', 'low'] as const;
export const issueCategoryValues = ['clash', 'missing-label', 'code-violation', 'clearance'] as const;
export const criterionResultValues = ['pass', 'fail', 'not-applicable'] as const;

const bboxSchema = z
  .tuple([
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
  ])
  .refine(([ymin, xmin, ymax, xmax]) => ymax >= ymin && xmax >= xmin, {
    message: 'Invalid box_2d bounds ordering',
  });

export const analyzeRequestSchema = z.object({
  pages: z
    .array(
      z.object({
        pageNumber: z.number().int().positive(),
        image: z.string().min(1),
      })
    )
    .min(1)
    .max(MAX_PAGES),
});

export const providerCriterionSchema = z.object({
  id: z.string().min(1).optional(),
  criterionKey: z.string().min(1),
  name: z.string().min(1),
  result: z.enum(criterionResultValues),
  summary: z.string(),
  confidence: z.number().min(0).max(100).optional(),
});

const categoryFallback = z
  .string()
  .transform((val): (typeof issueCategoryValues)[number] => {
    const lower = val.toLowerCase().replace(/[\s_]/g, '-');
    if ((issueCategoryValues as readonly string[]).includes(lower)) {
      return lower as (typeof issueCategoryValues)[number];
    }
    // Best-effort mapping for common AI-generated variants
    if (lower.includes('label') || lower.includes('missing') || lower.includes('annotation'))
      return 'missing-label';
    if (lower.includes('code') || lower.includes('violation') || lower.includes('safety'))
      return 'code-violation';
    if (lower.includes('clear') || lower.includes('spacing') || lower.includes('access'))
      return 'clearance';
    return 'clash';
  });

export const providerIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(issueSeverityValues),
  category: categoryFallback,
  criterionKey: z.string().min(1),
  box_2d: bboxSchema,
  confidence: z.number().min(0).max(100).optional(),
});

export const providerPageResultSchema = z.object({
  sheetType: z.enum(sheetTypeValues).optional(),
  criteria: z.array(providerCriterionSchema),
  issues: z.array(providerIssueSchema),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ProviderPageResult = z.infer<typeof providerPageResultSchema>;
