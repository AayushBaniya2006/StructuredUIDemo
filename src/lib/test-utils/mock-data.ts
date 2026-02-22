import type { Issue, QACriterion } from '$lib/types';

export function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: `ISS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    page: 1,
    title: 'Sample issue title',
    description: 'Sample issue description',
    severity: 'medium',
    status: 'open',
    category: 'missing-label',
    bbox: { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
    ...overrides
  };
}

export function createMockIssues(count: number): Issue[] {
  return Array.from({ length: count }, (_, i) =>
    createMockIssue({
      id: `ISS-${String(i + 1).padStart(3, '0')}`,
      page: Math.floor(i / 5) + 1,
      severity: ['high', 'medium', 'low'][i % 3] as any,
      status: 'open',
      category: ['clash', 'missing-label', 'code-violation'][i % 3] as any
    })
  );
}

export function createMockCriterion(page: number, result: 'pass' | 'fail' | 'not-applicable'): QACriterion {
  const criteria = [
    { id: 'EQ', name: 'Equipment/Element Labels', description: 'All major equipment, rooms, and elements are labeled' },
    { id: 'DIM', name: 'Dimension Strings', description: 'Dimension lines are present and complete' },
    { id: 'TB', name: 'Title Block & Scale', description: 'Title block present with sheet number, scale indicated' },
    { id: 'FS', name: 'Fire Safety Markings', description: 'Fire exits, fire-rated assemblies, extinguishers marked' },
    { id: 'SYM', name: 'Symbol Consistency', description: 'Symbols match legend, no undefined symbols' },
    { id: 'ANN', name: 'Annotations & Notes', description: 'General notes, callouts, and references present' },
    { id: 'CRD', name: 'Coordination Markers', description: 'Grid lines, column markers, reference bubbles present' },
    { id: 'CLR', name: 'Clearance & Accessibility', description: 'ADA clearances, door swings, egress paths shown' }
  ];
  const criterion = criteria[Math.floor(Math.random() * criteria.length)];
  return {
    ...criterion,
    page,
    result,
    summary: 'Sample summary for testing purposes'
  };
}
