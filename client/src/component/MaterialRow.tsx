import { Bookmark, Download, Eye, FileText } from "lucide-react";
import { categoryName } from "../lib/catergories";
import { formatBytes, formatDate } from "../lib/format";
import type { Material } from "../types";

type MaterialRowProps = {
  material: Material;
  isNew: boolean;
  bookmarked: boolean;
  progress: { page: number; total: number } | null;
  onToggleBookmark: () => void;
  onView: () => void;
};

export default function MaterialRow({
  material,
  isNew,
  bookmarked,
  progress,
  onToggleBookmark,
  onView,
}: MaterialRowProps) {
  const fileUrl = `/api/materials/${material.id}/file`;
  const fileExtension = material.originalName.split(".").pop()?.toLowerCase();
  const isPastQuestion = material.category === "past-question";
  const resumable = progress !== null && progress.page > 1;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-linear-to-r from-white via-white to-blue-100 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileText size={22} />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="wrap-break-word font-semibold text-gray-900">
              {material.title}
            </h3>

            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isPastQuestion
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {categoryName(material.category)}
            </span>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {fileExtension === "docx"
                ? "DOCX"
                : fileExtension === "pptx"
                  ? "PPTX"
                  : "PDF"}
            </span>

            {isNew && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                New
              </span>
            )}
          </div>

          {material.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-gray-900">
              {material.description}
            </p>
          )}

          <p className="mt-1 text-xs text-gray-900">
            <span className="font-semibold text-blue-700">
              {material.courseCode}
            </span>
            {" · "}
            {formatBytes(material.size)}
            {" · "}
            {formatDate(material.createdAt)}
            {resumable && progress && (
              <>
                {" · "}
                <span className="font-semibold text-emerald-700">
                  Page {progress.page} of {progress.total}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Remove from saved" : "Save for later"}
          title={bookmarked ? "Remove from saved" : "Save for later"}
          className={`cursor-pointer rounded-lg border p-2 transition ${
            bookmarked
              ? "border-blue-300 bg-blue-50 text-blue-600"
              : "border-blue-200 bg-white text-blue-400 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          <Bookmark size={18} className={bookmarked ? "fill-blue-600" : ""} />
        </button>

        <button
          type="button"
          onClick={onView}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Eye size={16} />
          {resumable ? "Continue" : "View"}
        </button>

        <a
          href={`${fileUrl}?download=1`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <Download size={16} />
          Download
        </a>
      </div>
    </li>
  );
}
