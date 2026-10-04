import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractPage } from "./extract";
import type { ExtractionOptions, PageText, TextAtom } from "./types";

GlobalWorkerOptions.workerSrc = workerUrl;

export function openPdf(data: ArrayBuffer) {
  const base = new URL(`${import.meta.env.BASE_URL}pdfjs/`, document.baseURI)
    .href;
  return getDocument({
    data,
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
  });
}

export async function extractPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  options: ExtractionOptions,
): Promise<PageText> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const atoms: TextAtom[] = content.items.flatMap((item) => {
    if (!("str" in item)) return [];
    const [x, y] = viewport.convertToViewportPoint(
      item.transform[4],
      item.transform[5],
    );
    return [
      {
        text: item.str,
        x,
        y,
        width: item.width,
        height: item.height,
        fontSize:
          Math.hypot(item.transform[2], item.transform[3]) || item.height || 12,
        vertical:
          item.dir === "ttb" || !!content.styles[item.fontName]?.vertical,
      },
    ];
  });
  return {
    pageNumber,
    ...extractPage(atoms, viewport.width, viewport.height, options),
  };
}
