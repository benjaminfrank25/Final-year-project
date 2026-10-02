import { BookOpen } from "lucide-react";
import type { Material } from "../types";

type ContinueCardProps = {
  material: Material;
  page: number;
  total: number;
  onContinue: () => void;
};

export default function ContinueCard({
  material,
  page,
  total,
  onContinue,
}: ContinueCardProps) {
  const percent = Math.min(100, Math.round((page / total) * 100));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-linear-to-r from-white to-emerald-100 p-5 shadow-sm sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
        <BookOpen size={24} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Continue reading
        </p>
        <h3 className="truncate text-lg font-bold text-gray-900">
          {material.title}
        </h3>
        <p className="text-sm text-gray-900">
          <span className="font-semibold text-blue-700">
            {material.courseCode}
          </span>
          {" · "}Page {page} of {total}
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  );
}
