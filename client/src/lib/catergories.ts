import type { MaterialCategory } from "../types";

export const CATEGORIES: {
  value: MaterialCategory;
  label: string;
  singular: string;
}[] = [
  { value: "lecture-note", label: "Lecture Notes", singular: "Lecture Note" },
  {
    value: "past-question",
    label: "Past Questions",
    singular: "Past Question",
  },
  { value: "assignment", label: "Assignments", singular: "Assignment" },
  { value: "textbook", label: "Textbooks", singular: "Textbook" },
  { value: "other", label: "Other", singular: "Other" },
];

export function categoryName(value: MaterialCategory): string {
  return CATEGORIES.find((c) => c.value === value)?.singular ?? "Other";
}
