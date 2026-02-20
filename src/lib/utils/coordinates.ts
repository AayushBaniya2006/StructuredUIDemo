import type { BoundingBox } from '$lib/types';

/**
 * Convert normalized bbox (0–1) to pixel coordinates for a given canvas size.
 */
export function bboxToPixels(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: bbox.x * canvasWidth,
    y: bbox.y * canvasHeight,
    width: bbox.width * canvasWidth,
    height: bbox.height * canvasHeight,
  };
}

/**
 * Calculate the pan offset to center a bbox in the viewport.
 */
export function centerOnBbox(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): { panX: number; panY: number } {
  const centerX = (bbox.x + bbox.width / 2) * canvasWidth * zoom;
  const centerY = (bbox.y + bbox.height / 2) * canvasHeight * zoom;
  return {
    panX: viewportWidth / 2 - centerX,
    panY: viewportHeight / 2 - centerY,
  };
}
