import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Level, Status, Student } from "../types";

export interface StudentPatch {
  status?: Status;
  level?: Level;
  role?: "student" | "rep";
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api<{ students: Student[] }>("/admin/students")
      .then((data) => {
        if (cancelled) return;
        setStudents(data.students);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }, []);

  // Throws if the server refuses, so the caller can show the message
  const update = useCallback(async (id: string, patch: StudentPatch) => {
    const data = await api<{ student: Student }>(`/admin/students/${id}`, {
      method: "PATCH",
      body: patch,
    });
    setStudents((prev) => prev.map((s) => (s.id === id ? data.student : s)));
  }, []);

  return { students, loading, error, reload, update };
}
