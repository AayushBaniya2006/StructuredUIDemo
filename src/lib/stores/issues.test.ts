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
