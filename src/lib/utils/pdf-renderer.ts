import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Configure worker — uses the bundled worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export type PDFDocument = PDFDocumentProxy;
export type PDFPage = PDFPageProxy;

export async function loadDocument(source: string | ArrayBuffer): Promise<PDFDocument> {
  const loadingTask = pdfjsLib.getDocument(source);
  return loadingTask.promise;
}

export interface RenderOptions {
  page: PDFPage;
  canvas: HTMLCanvasElement;
  scale: number;
}

export async function renderPage({ page, canvas, scale }: RenderOptions): Promise<void> {
  const viewport = page.getViewport({ scale });
  const outputScale = window.devicePixelRatio || 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context');

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  const transform =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  const renderContext = {
    canvas: null as unknown as HTMLCanvasElement,
    canvasContext: context,
    transform,
    viewport,
  };

  await page.render(renderContext).promise;
}

export function getDocumentKey(source: string | ArrayBuffer): string {
  if (typeof source === 'string') return `url:${source}`;
  return `buffer:${source.byteLength}`;
}

export function getPageDimensions(page: PDFPage, scale: number) {
  const viewport = page.getViewport({ scale });
  return {
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height),
  };
}

export async function renderThumbnail(
  page: PDFPage,
  canvas: HTMLCanvasElement,
  maxWidth: number = 120
): Promise<void> {
  const viewport = page.getViewport({ scale: 1 });
  const thumbnailScale = maxWidth / viewport.width;
  await renderPage({ page, canvas, scale: thumbnailScale });
}
