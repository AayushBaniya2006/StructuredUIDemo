import { writable, derived } from 'svelte/store';
import type { ViewerState } from '$lib/types';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_RENDER_THRESHOLDS = [0.5, 1, 1.5, 2, 3, 4];

function createViewerStore() {
  const { subscribe, update, set } = writable<ViewerState>({
    currentPage: 1,
    totalPages: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    showAllOverlays: true,
  });

  return {
    subscribe,
    set,
    setTotalPages: (total: number) =>
      update((s) => ({ ...s, totalPages: total })),
    goToPage: (page: number) =>
      update((s) => ({
        ...s,
        currentPage: Math.max(1, Math.min(page, s.totalPages)),
        panX: 0,
        panY: 0,
      })),
    nextPage: () =>
      update((s) => ({
        ...s,
        currentPage: Math.min(s.currentPage + 1, s.totalPages),
        panX: 0,
        panY: 0,
      })),
    prevPage: () =>
      update((s) => ({
        ...s,
        currentPage: Math.max(s.currentPage - 1, 1),
        panX: 0,
        panY: 0,
      })),
    zoomIn: () =>
      update((s) => ({
        ...s,
        zoom: Math.min(s.zoom + ZOOM_STEP, ZOOM_MAX),
      })),
    zoomOut: () =>
      update((s) => ({
        ...s,
        zoom: Math.max(s.zoom - ZOOM_STEP, ZOOM_MIN),
      })),
    zoomTo: (level: number) =>
      update((s) => ({
        ...s,
        zoom: Math.max(ZOOM_MIN, Math.min(level, ZOOM_MAX)),
      })),
    resetZoom: () =>
      update((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 })),
    pan: (dx: number, dy: number) =>
      update((s) => ({ ...s, panX: s.panX + dx, panY: s.panY + dy })),
    setPan: (x: number, y: number) =>
      update((s) => ({ ...s, panX: x, panY: y })),
    toggleOverlays: () =>
      update((s) => ({ ...s, showAllOverlays: !s.showAllOverlays })),
  };
}

export const viewerStore = createViewerStore();

// Derived store: the render scale (snaps to thresholds for canvas re-render)
export const renderScale = derived(viewerStore, ($viewer) => {
  const zoom = $viewer.zoom;
  let best = ZOOM_RENDER_THRESHOLDS[0];
  for (const t of ZOOM_RENDER_THRESHOLDS) {
    if (t <= zoom) best = t;
    else break;
  }
  return best;
});
