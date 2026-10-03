import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Announcement } from "../types";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api<{ announcements: Announcement[] }>("/announcements")
      .then((data) => {
        if (cancelled) return;
        setAnnouncements(data.announcements);
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

  useEffect(() => {
    const interval = window.setInterval(
      () => setReloadKey((key) => key + 1),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  }, []);

  const create = useCallback(
    async (title: string, message: string) => {
      const data = await api<{ announcement: Announcement }>(
        "/admin/announcements",
        {
          method: "POST",
          body: { title, message },
        },
      );
      setAnnouncements((current) => [data.announcement, ...current].slice(0, 50));
      return data.announcement;
    },
    [],
  );

  return { announcements, loading, error, reload, create };
}
