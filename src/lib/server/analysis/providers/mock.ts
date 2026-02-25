import type { AnalysisProvider, AnalyzePageInput } from '$lib/server/analysis/providers/types';

export class MockAnalysisProvider implements AnalysisProvider {
  readonly name = 'mock';

  async analyzePage(input: AnalyzePageInput): Promise<unknown> {
    const page = input.pageNumber;
    const hasIssue = page % 2 === 1;

    return {
      sheetType: hasIssue ? 'electrical' : 'architectural',
      criteria: [
        {
          id: `EQ-${page}`,
          criterionKey: 'EQ',
          name: 'Equipment/Element Labels',
          result: hasIssue ? 'fail' : 'pass',
          summary: hasIssue ? `Mock missing label on page ${page}` : `Mock pass on page ${page}`,
          confidence: 88,
        },
      ],
      issues: hasIssue
        ? [
            {
              title: 'Mock missing label',
              description: `Mocked issue for page ${page}`,
              severity: 'medium',
              category: 'missing-label',
              criterionKey: 'EQ',
              box_2d: [120, 220, 220, 360],
              confidence: 86,
            },
          ]
        : [],
    };
  }
}
