// src/lib/config/constants.ts

/** Maximum pages sent to Gemini per analysis run */
export const MAX_PAGES = 20;

/** Gemini image target: long-edge px for quality/cost balance */
export const TARGET_IMAGE_PX = 1500;

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

/** Number of concurrent page-to-image workers */
export const PAGE_RENDER_CONCURRENCY = 5;

/** Absolute maximum number of PDF pages to keep in the viewer cache */
export const PAGE_CACHE_MAX = 10;
