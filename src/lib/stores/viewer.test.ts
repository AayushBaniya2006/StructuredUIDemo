import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { viewerStore } from './viewer';

function resetViewer() {
  viewerStore.set({
    currentPage: 1,
    totalPages: 4,
    zoom: 1,
    panX: 0,
    panY: 0,
    showAllOverlays: true,
  });
}

describe('viewerStore', () => {
  it('clamps page navigation to valid bounds', () => {
    resetViewer();

    viewerStore.goToPage(999);
    expect(get(viewerStore).currentPage).toBe(4);

    viewerStore.goToPage(0);
    expect(get(viewerStore).currentPage).toBe(1);
  });

  it('clamps zoom values', () => {
    resetViewer();

    for (let i = 0; i < 50; i++) viewerStore.zoomIn();
    expect(get(viewerStore).zoom).toBe(4);

    for (let i = 0; i < 100; i++) viewerStore.zoomOut();
    expect(get(viewerStore).zoom).toBe(0.1);
  });

  it('toggles overlays and updates pan', () => {
    resetViewer();

    viewerStore.toggleOverlays();
    expect(get(viewerStore).showAllOverlays).toBe(false);

    viewerStore.setPan(10, 20);
    expect(get(viewerStore).panX).toBe(10);
    expect(get(viewerStore).panY).toBe(20);
  });

  it('centers bbox using current zoom and render scale ratio', () => {
    resetViewer();
    viewerStore.zoomTo(1);

    viewerStore.centerOnBbox({ x: 0.25, y: 0.25, width: 0.1, height: 0.1 }, 1000, 1000, 500, 500);

    const state = get(viewerStore);
    expect(state.panX).toBe(-50);
    expect(state.panY).toBe(-50);
  });
});
