import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { formatExport, parsePageRange } from "../lib/extract";
import { pdfError } from "../lib/errors";
import {
  defaultOptions,
  type ExtractionOptions,
  type PageText,
} from "../lib/types";

type Source = { name: string; size: number; total: number; sample: boolean };

export function useWorkspace(onConverted: () => void) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const loadingRef = useRef<PDFDocumentLoadingTask | null>(null);
  const job = useRef(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [pages, setPages] = useState<PageText[]>([]);
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<ExtractionOptions>(defaultOptions);
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("1");
  const [applied, setApplied] = useState("");
  const [markers, setMarkers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [edited, setEdited] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const current = pages[index];
  const output = formatExport(pages, markers);
  const hasText = pages.some((p) => p.text.trim());
  const charCount = pages.reduce(
    (sum, p) => sum + [...p.text.replace(/\s/g, "")].length,
    0,
  );
  const settingsChanged =
    !!pdf && applied !== JSON.stringify({ options, start, end });

  useEffect(
    () => () => {
      job.current++;
      void loadingRef.current?.destroy();
      void pdfRef.current?.loadingTask.destroy();
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  async function convert(
    document: PDFDocumentProxy,
    selected: number[],
    id: number,
  ): Promise<PageText[] | null> {
    const { extractPdfPage } = await import("../lib/pdf");
    const result: PageText[] = [];
    setProgress({ done: 0, total: selected.length });
    for (const pageNumber of selected) {
      if (job.current !== id) return null;
      result.push(await extractPdfPage(document, pageNumber, options));
      if (job.current !== id) return null;
      setProgress({ done: result.length, total: selected.length });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    return result;
  }

  async function loadFile(file: File, sample = false) {
    if (busy) return;
    setError("");
    if (!/\.pdf$/i.test(file.name)) {
      setError("PDFファイルを選んでください。");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("ファイルが大きすぎます。50 MB以下のPDFを選んでください。");
      return;
    }
    const id = ++job.current;
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    let document: PDFDocumentProxy | undefined;
    let task: PDFDocumentLoadingTask | undefined;
    try {
      const bytes = await file.arrayBuffer();
      if (job.current !== id) return;
      if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes("%PDF-"))
        throw new Error("Invalid PDF");
      const { openPdf } = await import("../lib/pdf");
      if (job.current !== id) return;
      task = openPdf(bytes);
      loadingRef.current = task;
      document = await task.promise;
      if (document.numPages > 500) {
        setError(
          "500ページ以下のPDFを選んでください。大きな脚本は分割して読み込めます。",
        );
        return;
      }
      const selected = Array.from(
        { length: document.numPages },
        (_, i) => i + 1,
      );
      const result = await convert(document, selected, id);
      if (!result || job.current !== id) return;
      const previous = pdfRef.current;
      pdfRef.current = document;
      setPdf(document);
      setSource({
        name: file.name,
        size: file.size,
        total: document.numPages,
        sample,
      });
      setPages(result);
      setIndex(0);
      setStart("1");
      setEnd(String(document.numPages));
      setApplied(
        JSON.stringify({ options, start: "1", end: String(document.numPages) }),
      );
      setEdited(false);
      setUnsaved(false);
      onConverted();
      if (previous)
        window.setTimeout(() => void previous.loadingTask.destroy(), 100);
    } catch (error) {
      if (job.current === id) setError(pdfError(error));
    } finally {
      if (document && document !== pdfRef.current)
        void document.loadingTask.destroy();
      else if (!document && task) void task.destroy();
      if (job.current === id) {
        setBusy(false);
        loadingRef.current = null;
      }
    }
  }

  async function loadSample() {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}sample.pdf`);
      if (!response.ok) throw new Error("Sample unavailable");
      await loadFile(
        new File([await response.blob()], "雨あがりの待ち合わせ.pdf", {
          type: "application/pdf",
        }),
        true,
      );
    } catch {
      setError("サンプルを読み込めませんでした。もう一度お試しください。");
    }
  }

  async function reconvert() {
    if (!pdf || busy) return;
    let selected: number[];
    try {
      selected = parsePageRange(start, end, pdf.numPages);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    const id = ++job.current;
    setBusy(true);
    setError("");
    try {
      const result = await convert(pdf, selected, id);
      if (result && job.current === id) {
        setPages(result);
        setIndex(0);
        setEdited(false);
        setUnsaved(false);
        setApplied(JSON.stringify({ options, start, end }));
        onConverted();
        setToast(`${result.length}ページを変換しました`);
      }
    } catch {
      if (job.current === id)
        setError(
          "変換中にエラーが発生しました。ページ範囲を小さくしてお試しください。",
        );
    } finally {
      if (job.current === id) setBusy(false);
    }
  }

  function cancel() {
    job.current++;
    void loadingRef.current?.destroy();
    loadingRef.current = null;
    setBusy(false);
    setToast("変換を中止しました");
  }
  function editText(text: string) {
    setPages((previous) =>
      previous.map((p, i) => (i === index ? { ...p, text } : p)),
    );
    setEdited(true);
    setUnsaved(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setToast(`${pages.length}ページ分のテキストをコピーしました`);
    } catch {
      setError(
        "コピーできませんでした。テキストを選択してコピーするか、TXTで保存してください。",
      );
    }
  }
  function save() {
    if (!source) return;
    const url = URL.createObjectURL(
      new Blob(["\ufeff", output], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${source.name.replace(/\.pdf$/i, "")}_${pages[0].pageNumber}-${pages.at(-1)!.pageNumber}.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    setUnsaved(false);
    setToast("テキストを保存しました");
  }

  function reset() {
    job.current++;
    const previous = pdfRef.current;
    pdfRef.current = null;
    setPdf(null);
    setSource(null);
    setPages([]);
    setIndex(0);
    setStart("1");
    setEnd("1");
    setEdited(false);
    setUnsaved(false);
    setError("");
    if (previous)
      window.setTimeout(() => void previous.loadingTask.destroy(), 100);
  }

  return {
    pdf,
    source,
    pages,
    index,
    setIndex,
    options,
    setOptions,
    start,
    setStart,
    end,
    setEnd,
    markers,
    setMarkers,
    busy,
    progress,
    error,
    setError,
    toast,
    edited,
    current,
    hasText,
    charCount,
    settingsChanged,
    loadFile,
    loadSample,
    reconvert,
    cancel,
    editText,
    copy,
    save,
    reset,
  };
}
