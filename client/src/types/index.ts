export type Role = "student" | "rep" | "admin";
export type Level = 100 | 200 | 300 | 400 | 500;
export type Status = "pending" | "active" | "rejected";
export type Semester = "harmattan" | "rain";

export type MaterialCategory =
  | "lecture-note"
  | "past-question"
  | "assignment"
  | "textbook"
  | "other";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  level?: Level;
  status: Status;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  level?: Level;
  status: Status;
  createdAt: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  lecturerName?: string;
  courseCode: string;
  level: Level;
  semester: Semester;
  category: MaterialCategory;
  originalName: string;
  size: number;
  createdAt: string;
  uploadedByName?: string;
}

export interface LibraryState {
  materialId: string;
  bookmarked: boolean;
  lastOpenedAt: string | null;
  lastPage: number | null;
  totalPages: number | null;
}
