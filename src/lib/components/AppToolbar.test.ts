import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AppToolbar from './AppToolbar.svelte';
import { viewerStore } from '$lib/stores/viewer';
import { issuesStore } from '$lib/stores/issues';
import { createMockIssues } from '$lib/test-utils/mock-data';

beforeEach(() => {
  viewerStore.set({
    currentPage: 1,
    totalPages: 4,
    zoom: 1,
    panX: 0,
    panY: 0,
    showAllOverlays: true,
  });
  issuesStore.loadIssues(createMockIssues(12));
  issuesStore.severityFilter.set('all');
  issuesStore.statusFilter.set('all');
});

describe('AppToolbar', () => {
  it('updates zoom controls via store', async () => {
    render(AppToolbar);

    await fireEvent.click(screen.getByTestId('zoom-in'));
    expect(get(viewerStore).zoom).toBe(1.1);

    await fireEvent.click(screen.getByTestId('zoom-out'));
    expect(get(viewerStore).zoom).toBe(1);
  });

  it('updates severity and status filters', async () => {
    render(AppToolbar);

    await fireEvent.click(screen.getByTestId('severity-high'));
    expect(get(issuesStore.severityFilter)).toBe('high');

    await fireEvent.click(screen.getByTestId('status-open'));
    expect(get(issuesStore.statusFilter)).toBe('open');
  });

  it('toggles overlay mode', async () => {
    render(AppToolbar);

    await fireEvent.click(screen.getByTestId('overlay-toggle'));
    expect(get(viewerStore).showAllOverlays).toBe(false);
  });
});
