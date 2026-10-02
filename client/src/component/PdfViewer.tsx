import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Document, Page } from "../lib/pdf";
import Spinner from "./Spinner";
import type { Material } from "../types";

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2; // 100%

const iconButton =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";

type PdfViewerProps = {
  material: Material;
  startPage: number;
  onProgress: (materialId: string, page: number, totalPages: number) => void;
  onClose: () => void;
};

export default function PdfViewer({
  material,
  startPage,
  onProgress,
  onClose,
}: PdfViewerProps) {
  const fileUrl = `/api/materials/${material.id}/file`;

  // Must be memoized, otherwise the PDF reloads on every render
  const file = useMemo(
    () => ({ url: fileUrl, withCredentials: true }),
    [fileUrl],
  );

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, startPage));
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [failed, setFailed] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOMS[zoomIndex] ?? 1;
  const pageWidth = Math.max(0, Math.min(boxWidth - 32, 1000)) * zoom;

  const clamp = useCallback(
    (n: number) => Math.min(Math.max(1, n), numPages || 1),
    [numPages],
  );

  function handleLoadSuccess({ numPages: total }: { numPages: number }) {
    setNumPages(total);
    setPage((p) => Math.min(Math.max(1, p), total));
  }

  // Measure the reading area so pages fit its width
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lock the page behind the viewer from scrolling
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // New page -> back to the top of the reading area
  useEffect(() => {
    boxRef.current?.scrollTo({ top: 0 });
  }, [page]);

  // Save progress shortly after the reader settles on a page
  // (so flipping quickly doesn't spam the server)
  useEffect(() => {
    if (numPages === 0) return;
    const timer = setTimeout(
      () => onProgress(material.id, page, numPages),
      700,
    );
    return () => clearTimeout(timer);
  }, [page, numPages, material.id, onProgress]);

  const requestClose = useCallback(() => {
    if (numPages > 0) onProgress(material.id, page, numPages);
    onClose();
  }, [numPages, page, material.id, onProgress, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        requestClose();
        return;
      }

      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT") return;

      if (e.key === "ArrowRight") {
        setPage((p) => Math.min(p + 1, numPages || 1));
      } else if (e.key === "ArrowLeft") {
        setPage((p) => Math.max(p - 1, 1));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages, requestClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={material.title}
      style={{ colorScheme: "light" }}
      className="fixed inset-0 z-50 flex flex-col bg-blue-100"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-blue-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-gray-900">
            {material.title}
          </h2>
          <p className="truncate text-xs text-gray-900">
            <span className="font-semibold text-blue-700">
              {material.courseCode}
            </span>
            {" · "}
            {material.originalName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Page controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className={iconButton}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1.5 text-sm text-gray-900">
              <input
                key={page}
                type="text"
                inputMode="numeric"
                defaultValue={page}
                aria-label="Page number"
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  const target = Number.isFinite(n) ? clamp(n) : page;
                  e.target.value = String(target);
                  setPage(target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="h-9 w-12 rounded-lg border border-blue-200 bg-white text-center text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2"
              />
              <span>/ {numPages || "–"}</span>
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, numPages || 1))}
              disabled={numPages === 0 || page >= numPages}
              aria-label="Next page"
              className={iconButton}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <span className="hidden h-6 w-px bg-blue-200 sm:block" />

          {/* Zoom */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoomIndex((i) => Math.max(i - 1, 0))}
              disabled={zoomIndex === 0}
              aria-label="Zoom out"
              className={iconButton}
            >
              <ZoomOut size={18} />
            </button>
            <span className="w-11 text-center text-sm text-gray-900">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoomIndex((i) => Math.min(i + 1, ZOOMS.length - 1))
              }
              disabled={zoomIndex === ZOOMS.length - 1}
              aria-label="Zoom in"
              className={iconButton}
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <span className="hidden h-6 w-px bg-blue-200 sm:block" />

          {/* Actions */}

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in a new tab"
            title="Open in a new tab"
            className={iconButton}
          >
            <ExternalLink size={18} />
          </a>

          <a
            href={`${fileUrl}?download=1`}
            aria-label="Download"
            title="Download"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
          >
            <Download size={18} />
          </a>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close viewer"
            title="Close (Esc)"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Reading area */}
      <div ref={boxRef} className="flex-1 overflow-auto p-4">
        {failed ? (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-700">Couldn't load this PDF.</p>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Try opening it in a new tab
            </a>
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={() => setFailed(true)}
            loading={
              <div className="flex justify-center py-24 text-blue-600">
                <Spinner size={36} />
              </div>
            }
          >
            {boxWidth > 0 && numPages > 0 && (
              <div className="mx-auto w-fit shadow-md">
                <Page
                  pageNumber={page}
                  width={pageWidth}
                  loading={
                    <div className="flex h-96 w-full items-center justify-center bg-white text-blue-600">
                      <Spinner size={28} />
                    </div>
                  }
                />
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
