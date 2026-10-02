import type { Semester } from "../types";

export const SEMESTERS: { value: Semester; label: string; sub: string }[] = [
  { value: "harmattan", label: "Harmattan Semester", sub: "First semester" },
  { value: "rain", label: "Rain Semester", sub: "Second semester" },
];

export function isSemester(value: string | null): value is Semester {
  return value === "harmattan" || value === "rain";
}

export function semesterLabel(value: Semester): string {
  return SEMESTERS.find((s) => s.value === value)?.label ?? "Semester";
}

export function currentSemester(now: number): Semester {
  const month = new Date(now).getMonth();
  return month >= 8 || month <= 1 ? "harmattan" : "rain";
}
