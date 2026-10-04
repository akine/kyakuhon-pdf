import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { LoaderCircle, ZoomIn, ZoomOut } from "lucide-react";

export default function PdfPreview({
  pdf,
  pageNumber,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(200, entries[0].contentRect.width - 64)),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let disposed = false;
    let task: RenderTask | undefined;
    setBusy(true);
    setError(false);
    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (disposed || !canvas.current) return;
      const scale =
        (Math.min(width, 660) / page.getViewport({ scale: 1 }).width) * zoom;
      const viewport = page.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.floor(viewport.width * ratio);
      element.height = Math.floor(viewport.height * ratio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      task = page.render({
        canvas: element,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      });
      await task.promise;
      if (!disposed) setBusy(false);
    })().catch((error) => {
      if (!disposed && error?.name !== "RenderingCancelledException") {
        setBusy(false);
        setError(true);
      }
    });
    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, width, zoom]);
  return (
    <div className="preview-content" ref={host}>
      <div className="zoom-controls">
        <button
          aria-label="縮小"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((z) => z - 0.25)}
        >
          <ZoomOut size={15} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="拡大"
          disabled={zoom >= 2}
          onClick={() => setZoom((z) => z + 0.25)}
        >
          <ZoomIn size={15} />
        </button>
      </div>
      <div className="paper-wrap">
        <canvas
          role="img"
          ref={canvas}
          aria-label={`原稿 ${pageNumber}ページ`}
        />
        {busy && (
          <div className="canvas-loading">
            <LoaderCircle className="spin" size={22} />
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="preview-error">
          このページのプレビューを表示できませんでした。
        </p>
      )}
    </div>
  );
}
