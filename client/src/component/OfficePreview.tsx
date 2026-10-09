import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import Spinner from "./Spinner";
import type { Material } from "../types";

type OfficePreviewProps = {
  material: Material;
  onClose: () => void;
};

export default function OfficePreview({
  material,
  onClose,
}: OfficePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const previewUrl = `/api/materials/${material.id}/preview`;
  const downloadUrl = `/api/materials/${material.id}/file?download=1`;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-blue-100 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="shrink-0 text-blue-600" size={20} />
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-gray-900">
              {material.title}
            </h2>
            <p className="truncate text-xs text-gray-500">
              {material.originalName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download original</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <iframe
          key={material.id}
          src={previewUrl}
          title={`Preview of ${material.title}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          className="h-full w-full border-0 bg-slate-200"
        />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 text-blue-700">
            <Spinner size={32} />
            <p>Preparing document preview...</p>
          </div>
        )}
        {failed && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6"
          >
            <p className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load this document preview. You can still download the
              original file.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
