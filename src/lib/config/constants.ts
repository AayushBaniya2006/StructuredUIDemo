// src/lib/config/constants.ts

/** Maximum pages sent to Gemini per analysis run */
export const MAX_PAGES = 20;

/** Gemini image target: long-edge px for quality/cost balance */
export const TARGET_IMAGE_PX = 1280;

/** Analysis image encoding format */
export const ANALYSIS_IMAGE_MIME_TYPE = 'image/jpeg';

/** JPEG quality (0-1) for analysis image generation */
export const ANALYSIS_IMAGE_QUALITY = 0.82;

/** Confidence threshold for "high confidence only" filter */
export const HIGH_CONFIDENCE_THRESHOLD = 80;

/** Ratio of not-applicable criteria above which we flag unrecognized content */
export const UNRECOGNIZED_CONTENT_THRESHOLD = 0.7;

/** DocumentViewer: pages to keep in memory around current page */
export const PAGE_CACHE_RADIUS = 1;

/** DocumentViewer: maximum zoom level */
export const ZOOM_MAX = 4;

/** DocumentViewer: minimum zoom level */
export const ZOOM_MIN = 0.1;

export function computeAnalysisConcurrency(pageCount: number): number {
  const cores =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 4;
  const preferred = Math.max(2, Math.min(4, Math.floor(cores / 2)));
  return Math.max(1, Math.min(preferred, pageCount));
}

/** Absolute maximum number of PDF pages to keep in the viewer cache */
export const PAGE_CACHE_MAX = 10;
