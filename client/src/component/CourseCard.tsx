import { BookOpen } from "lucide-react";

type CourseCardProps = {
  code: string;
  count: number;
  selected: boolean;
  onClick: () => void;
};

export default function CourseCard({
  code,
  count,
  selected,
  onClick,
}: CourseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-linear-to-br p-4 text-left transition ${
        selected
          ? "border-blue-600 from-blue-500 to-blue-600 text-white shadow-md"
          : "border-blue-100 from-white to-blue-100 text-blue-950 shadow-sm hover:border-blue-300"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-white/20 text-white"
            : "bg-white text-blue-600 shadow-sm"
        }`}
      >
        <BookOpen size={20} />
      </span>

      <span className="min-w-0">
        <span className="block font-bold">{code}</span>
        <span
          className={`block text-sm ${
            selected ? "text-blue-100" : "text-gray-900"
          }`}
        >
          {count} {count === 1 ? "material" : "materials"}
        </span>
      </span>
    </button>
  );
}
