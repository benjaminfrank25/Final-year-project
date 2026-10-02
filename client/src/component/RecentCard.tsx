import { FileText } from "lucide-react";
import { timeAgo } from "../lib/format";
import type { Material } from "../types";

type RecentCardProps = {
  material: Material;
  openedAt: string;
  now: number;
  onOpen: () => void;
};

export default function RecentCard({
  material,
  openedAt,
  now,
  onOpen,
}: RecentCardProps) {
  const isOfficeDocument = /\.(docx|pptx)$/i.test(material.originalName);

  return (
    <a
      href={`/api/materials/${material.id}/file${isOfficeDocument ? "?download=1" : ""}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-linear-to-br from-white to-blue-100 p-4 shadow-sm transition hover:border-blue-300"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
        <FileText size={20} />
      </span>

      <span className="min-w-0">
        <span className="block truncate font-semibold text-gray-900">
          {material.title}
        </span>
        <span className="block text-xs text-gray-900">
          <span className="font-semibold text-blue-700">
            {material.courseCode}
          </span>
          {" · "}
          {timeAgo(openedAt, now)}
        </span>
      </span>
    </a>
  );
}
