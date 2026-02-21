import type { PDFPageProxy } from 'pdfjs-dist';

/**
 * Render a PDF page to a base64-encoded PNG data URL.
 * Targets ~1500px on the long edge for a quality/cost balance with Gemini.
 */
export async function pageToBase64(page: PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const maxDim = Math.max(viewport.width, viewport.height);
  const targetPx = 1500;
  const scale = targetPx / maxDim;

  const scaledViewport = page.getViewport({ scale });
  const width = Math.floor(scaledViewport.width);
  const height = Math.floor(scaledViewport.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for page-to-image');

  await page.render({
    canvas,
    canvasContext: ctx,
    viewport: scaledViewport,
  }).promise;

  // Return as data URL (base64 PNG)
  return canvas.toDataURL('image/png');
}
