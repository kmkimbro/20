import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGES = 20;

/** Page images live in memory only; they are too large for localStorage. */
export const pageImages = new Map();

/**
 * Renders every page of a PDF as an image, as is. Nothing is read out of the
 * pages: AI workflow 6 imports the whole document and makes one operation per page.
 */
export async function renderPdfPages(file, onPage) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const count = Math.min(pdf.numPages, MAX_PAGES);
  const images = [];
  for (let n = 1; n <= count; n += 1) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 900 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.82));
    onPage?.(n, count);
  }
  return { images, total: pdf.numPages };
}
