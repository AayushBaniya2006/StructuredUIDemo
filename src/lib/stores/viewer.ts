import { writable, derived } from 'svelte/store';
import type { ViewerState } from '$lib/types';
import type { BoundingBox } from '$lib/types';
import { centerOnBbox } from '$lib/utils/coordinates';
import { ZOOM_MIN, ZOOM_MAX } from '$lib/config/constants';

const ZOOM_STEP = 0.1;
const ZOOM_RENDER_THRESHOLDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

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
      update((s) => {
        const clamped = Math.max(1, Math.min(page, s.totalPages));
        if (clamped === s.currentPage) return s;
        return { ...s, currentPage: clamped, panX: 0, panY: 0 };
      }),
    nextPage: () =>
      update((s) => {
        const total = Math.max(s.totalPages, 1);
        return {
          ...s,
          currentPage: Math.min(s.currentPage + 1, total),
          panX: 0,
          panY: 0,
        };
      }),
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
        zoom: roundZoom(Math.min(s.zoom + ZOOM_STEP, ZOOM_MAX)),
      })),
    zoomOut: () =>
      update((s) => ({
        ...s,
        zoom: roundZoom(Math.max(s.zoom - ZOOM_STEP, ZOOM_MIN)),
      })),
    zoomTo: (level: number) =>
      update((s) => ({
        ...s,
        zoom: roundZoom(Math.max(ZOOM_MIN, Math.min(level, ZOOM_MAX))),
      })),
    resetZoom: () =>
      update((s) => ({ ...s, zoom: 1, panX: 0, panY: 0 })),
    pan: (dx: number, dy: number) =>
      update((s) => ({ ...s, panX: s.panX + dx, panY: s.panY + dy })),
    setPan: (x: number, y: number) =>
      update((s) => ({ ...s, panX: x, panY: y })),
    centerOnBbox: (
      bbox: BoundingBox,
      canvasWidth: number,
      canvasHeight: number,
      viewportWidth: number,
      viewportHeight: number
    ) =>
      update((s) => {
        const pan = centerOnBbox(
          bbox,
          canvasWidth,
          canvasHeight,
          viewportWidth,
          viewportHeight,
          s.zoom / renderScaleForZoom(s.zoom)
        );
        return { ...s, panX: pan.panX, panY: pan.panY };
      }),
    toggleOverlays: () =>
      update((s) => ({ ...s, showAllOverlays: !s.showAllOverlays })),
  };
}

export const viewerStore = createViewerStore();

// Derived store: the render scale (snaps to thresholds for canvas re-render)
export const renderScale = derived(viewerStore, ($viewer) => {
  return renderScaleForZoom($viewer.zoom);
});

function roundZoom(z: number): number {
  return Math.round(z * 100) / 100;
}

function renderScaleForZoom(zoom: number): number {
  let best = ZOOM_RENDER_THRESHOLDS[0];
  for (const t of ZOOM_RENDER_THRESHOLDS) {
    if (t <= zoom) best = t;
    else break;
  }
  return best;
}
