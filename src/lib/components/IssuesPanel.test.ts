import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import IssuesPanel from './IssuesPanel.svelte';
import { issuesStore } from '$lib/stores/issues';
import { viewerStore } from '$lib/stores/viewer';
import { createMockIssues } from '$lib/test-utils/mock-data';

beforeEach(() => {
  issuesStore.loadIssues(createMockIssues(12));
  issuesStore.selectedId.set(null);
  issuesStore.hoveredId.set(null);
  issuesStore.severityFilter.set('all');
  issuesStore.statusFilter.set('all');

  viewerStore.set({
    currentPage: 1,
    totalPages: 4,
    zoom: 1,
    panX: 0,
    panY: 0,
    showAllOverlays: true,
  });
});

describe('IssuesPanel', () => {
  it('selects issue and navigates to its page on click', async () => {
    render(IssuesPanel);

    const target = screen.getByTestId('issue-row-ISS-010');
    await fireEvent.click(target);

    expect(get(issuesStore.selectedId)).toBe('ISS-010');
    expect(get(viewerStore).currentPage).toBe(2);
  });

  it('updates hovered issue on mouse enter/leave', async () => {
    render(IssuesPanel);

    const target = screen.getByTestId('issue-row-ISS-001');
    await fireEvent.mouseEnter(target);
    expect(get(issuesStore.hoveredId)).toBe('ISS-001');

    await fireEvent.mouseLeave(target);
    expect(get(issuesStore.hoveredId)).toBeNull();
  });
});
