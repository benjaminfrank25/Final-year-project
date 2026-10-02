import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Material } from "../types";

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api<{ materials: Material[] }>("/materials")
      .then((data) => {
        if (cancelled) return;
        setMaterials(data.materials);
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

  return { materials, loading, error, reload };
}
