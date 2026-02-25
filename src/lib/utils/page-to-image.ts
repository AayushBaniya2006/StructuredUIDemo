import {
  ANALYSIS_IMAGE_MIME_TYPE,
  ANALYSIS_IMAGE_QUALITY,
  TARGET_IMAGE_PX,
} from '$lib/config/constants';
import type { PDFPageProxy } from 'pdfjs-dist';

/**
 * Render a PDF page to a base64-encoded PNG data URL.
 * Targets ~1500px on the long edge for a quality/cost balance with Gemini.
 */
export async function pageToBase64(page: PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const maxDim = Math.max(viewport.width, viewport.height);
  const scale = TARGET_IMAGE_PX / maxDim;

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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Failed to encode canvas image'));
          return;
        }
        resolve(result);
      },
      ANALYSIS_IMAGE_MIME_TYPE,
      ANALYSIS_IMAGE_QUALITY
    );
  });

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read encoded image blob'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
