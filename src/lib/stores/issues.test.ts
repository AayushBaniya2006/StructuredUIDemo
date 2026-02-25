import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { issuesStore } from './issues';
import { createMockIssues } from '$lib/test-utils/mock-data';

beforeEach(() => {
  issuesStore.issues.set(createMockIssues(18));
  issuesStore.selectedId.set(null);
  issuesStore.hoveredId.set(null);
  issuesStore.severityFilter.set('all');
  issuesStore.statusFilter.set('all');
});

describe('issuesStore', () => {
  it('filters by severity and status', () => {
    issuesStore.setSeverityFilter('high');
    expect(get(issuesStore.filtered).every((i) => i.severity === 'high')).toBe(true);

    issuesStore.setStatusFilter('resolved');
    const resolved = get(issuesStore.filtered);
    expect(resolved.length).toBe(0);
  });

  it('cycles next/prev through filtered issues', () => {
    issuesStore.setSeverityFilter('low');
    const low = get(issuesStore.filtered);
    expect(low.length).toBeGreaterThan(0);

    const first = issuesStore.selectNext();
    expect(first?.id).toBe(low[0].id);

    const second = issuesStore.selectNext();
    expect(second?.id).toBe(low[1]?.id ?? low[0].id);

    const prev = issuesStore.selectPrev();
    expect(prev?.id).toBe(first?.id);
  });

  it('toggles status idempotently', () => {
    const issue = get(issuesStore.issues)[0];
    if (!issue) throw new Error('Missing seed issue');
    expect(issue.status).toBe('open');

    issuesStore.toggleStatus(issue.id);
    let updated = get(issuesStore.issues).find((i) => i.id === issue.id);
    expect(updated?.status).toBe('resolved');

    issuesStore.toggleStatus(issue.id);
    updated = get(issuesStore.issues).find((i) => i.id === issue.id);
    expect(updated?.status).toBe('open');
  });

  it('returns selected issue helper', () => {
    const issue = get(issuesStore.issues)[2];
    if (!issue) throw new Error('Missing seed issue');
    issuesStore.select(issue.id);
    expect(issuesStore.getSelectedIssue()?.id).toBe(issue.id);
  });
});

import { mockIssue, mockCriterion } from '$lib/test-utils/mock-data';

describe('appendIssues', () => {
  beforeEach(() => issuesStore.loadIssues([]));

  it('accumulates issues across multiple appends', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-001', page: 1 })]);
    issuesStore.appendIssues([mockIssue({ id: 'ISS-002', page: 2 })]);
    expect(get(issuesStore.issues)).toHaveLength(2);
  });

  it('does not reset selectedId on append', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-001' })]);
    issuesStore.select('ISS-001');
    issuesStore.appendIssues([mockIssue({ id: 'ISS-002' })]);
    expect(get(issuesStore.selectedId)).toBe('ISS-001');
  });
});

describe('appendCriteria', () => {
  beforeEach(() => issuesStore.loadIssues([]));

  it('accumulates criteria across appends', () => {
    issuesStore.appendCriteria([mockCriterion({ id: 'EQ-1', page: 1 })]);
    issuesStore.appendCriteria([mockCriterion({ id: 'EQ-2', page: 2 })]);
    expect(get(issuesStore.criteria)).toHaveLength(2);
  });
});

describe('confidence filter', () => {
  beforeEach(() => {
    issuesStore.loadIssues([]);
    issuesStore.appendIssues([
      mockIssue({ id: 'ISS-001', confidence: 90 }),
      mockIssue({ id: 'ISS-002', confidence: 60 }),
      mockIssue({ id: 'ISS-003', confidence: 30 }),
    ]);
  });

  it('shows all issues when threshold is 0', () => {
    issuesStore.setConfidenceFilter(0);
    expect(get(issuesStore.filtered)).toHaveLength(3);
  });

  it('filters issues below threshold', () => {
    issuesStore.setConfidenceFilter(80);
    const result = get(issuesStore.filtered);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ISS-001');
  });

  it('issues without confidence score always pass through filter', () => {
    issuesStore.appendIssues([mockIssue({ id: 'ISS-004', confidence: undefined })]);
    issuesStore.setConfidenceFilter(80);
    const result = get(issuesStore.filtered);
    expect(result.some((i) => i.id === 'ISS-004')).toBe(true);
  });
});
