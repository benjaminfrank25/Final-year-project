import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LibraryState } from "../types";
import { useToast } from "./useToast";

function blank(materialId: string): LibraryState {
  return {
    materialId,
    bookmarked: false,
    lastOpenedAt: null,
    lastPage: null,
    totalPages: null,
  };
}

export function useLibrary() {
  const [states, setStates] = useState<Record<string, LibraryState>>({});
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;

    api<{ states: LibraryState[] }>("/library")
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, LibraryState> = {};
        for (const s of data.states) map[s.materialId] = s;
        setStates(map);
      })
      .catch(() => {
        // These are extras, so the dashboard still works without them
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleBookmark = useCallback(
    async (materialId: string) => {
      const current = states[materialId]?.bookmarked ?? false;
      const next = !current;

      const apply = (value: boolean) =>
        setStates((prev) => ({
          ...prev,
          [materialId]: {
            ...(prev[materialId] ?? blank(materialId)),
            bookmarked: value,
          },
        }));

      apply(next);

      try {
        await api<unknown>(`/library/${materialId}/bookmark`, {
          method: "PUT",
          body: { bookmarked: next },
        });
        showToast(
          next
            ? "Material saved for later."
            : "Material removed from saved items.",
        );
      } catch {
        apply(current);
        showToast(
          "Couldn't update saved materials. Please try again.",
          "error",
        );
      }
    },
    [states, showToast],
  );

  const markOpened = useCallback((materialId: string) => {
    const openedAt = new Date().toISOString();

    setStates((prev) => ({
      ...prev,
      [materialId]: {
        ...(prev[materialId] ?? blank(materialId)),
        lastOpenedAt: openedAt,
      },
    }));

    api<unknown>(`/library/${materialId}/opened`, { method: "POST" }).catch(
      () => {},
    );
  }, []);

  const saveProgress = useCallback(
    (materialId: string, page: number, totalPages: number) => {
      const at = new Date().toISOString();

      setStates((prev) => {
        const current = prev[materialId] ?? blank(materialId);
        if (current.lastPage === page && current.totalPages === totalPages) {
          return prev;
        }
        return {
          ...prev,
          [materialId]: {
            ...current,
            lastPage: page,
            totalPages,
            lastOpenedAt: at,
          },
        };
      });

      api<unknown>(`/library/${materialId}/progress`, {
        method: "PUT",
        body: { page, totalPages },
      }).catch(() => {});
    },
    [],
  );

  return { states, toggleBookmark, markOpened, saveProgress };
}
