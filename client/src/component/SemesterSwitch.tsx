import { CloudRain, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SEMESTERS } from "../lib/semesters";
import type { Semester } from "../types";

type SemesterSwitchProps = {
  value: Semester;
  counts: Record<Semester, number>;
  onChange: (semester: Semester) => void;
};

const icons: Record<Semester, LucideIcon> = {
  harmattan: Wind,
  rain: CloudRain,
};

export default function SemesterSwitch({
  value,
  counts,
  onChange,
}: SemesterSwitchProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SEMESTERS.map((s) => {
        const selected = value === s.value;
        const isRain = s.value === "rain";
        const Icon = icons[s.value];
        const count = counts[s.value];

        const selectedClass = isRain
          ? "border-emerald-600 from-emerald-500 to-emerald-600"
          : "border-blue-600 from-blue-500 to-blue-600";
        const idleClass = isRain
          ? "border-emerald-100 from-white to-emerald-100 hover:border-emerald-300"
          : "border-blue-100 from-white to-blue-100 hover:border-blue-300";
        const chipClass = selected
          ? "bg-white/20 text-white"
          : isRain
            ? "bg-white text-emerald-600 shadow-sm"
            : "bg-white text-blue-600 shadow-sm";
        const subClass = selected
          ? isRain
            ? "text-emerald-100"
            : "text-blue-100"
          : "text-blue-900/60";

        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            aria-pressed={selected}
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border bg-linear-to-br p-5 text-left shadow-sm transition ${
              selected
                ? `${selectedClass} text-white shadow-md`
                : `${idleClass} text-blue-950`
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${chipClass}`}
            >
              <Icon size={24} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{s.label}</span>
              <span className={`block text-sm ${subClass}`}>
                {s.sub} · {count} {count === 1 ? "material" : "materials"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
