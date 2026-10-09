import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Download, RefreshCw, Share2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { AuditLog } from "../types";
import Spinner from "./Spinner";
import { useToast } from "../hooks/useToast";

const PAGE_SIZE = 50;

type AuditResponse = {
  logs: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatAction(action: string): string {
  if (action === "material.created" || action === "material.uploaded") {
    return "Material Uploaded";
  }

  return action
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchAllAuditLogs(): Promise<AuditLog[]> {
  const firstPage = await api<AuditResponse>(
    `/admin/audit-logs?page=1&limit=100`,
  );
  const allLogs = [...firstPage.logs];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await api<AuditResponse>(
      `/admin/audit-logs?page=${page}&limit=100`,
    );
    allLogs.push(...result.logs);
  }

  return allLogs;
}

function createAuditText(logs: AuditLog[]): string {
  const header = [
    "Course Vault — Audit Log",
    `Exported: ${new Date().toLocaleString()}`,
    `Activities: ${logs.length}`,
    "",
  ];
  const entries = logs.map((entry) =>
    [
      `Date and time: ${formatTimestamp(entry.createdAt)} (${entry.createdAt})`,
      `Activity: ${formatAction(entry.action)}`,
      `Target: ${entry.targetName} (${entry.targetType})`,
      `Performed by: ${entry.actorName} <${entry.actorEmail}> [${entry.actorRole}]`,
      entry.details ? `Details: ${entry.details}` : "",
      `Record ID: ${entry.id}`,
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [...header, ...entries].join("\n");
}

function downloadTextFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;

    api<AuditResponse>(`/admin/audit-logs?page=${page}&limit=${PAGE_SIZE}`)
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
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
  }, [page, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  }, []);

  const changePage = useCallback((nextPage: number) => {
    setLoading(true);
    setError("");
    setPage(nextPage);
  }, []);

  const exportAuditLog = useCallback(async () => {
    setExporting(true);
    setExportError("");
    try {
      const allLogs = await fetchAllAuditLogs();
      const file = new File(
        [createAuditText(allLogs)],
        `course-vault-audit-log-${new Date().toISOString().slice(0, 10)}.txt`,
        { type: "text/plain;charset=utf-8" },
      );
      return file;
    } catch (err) {
      setExportError(errorMessage(err));
      return null;
    } finally {
      setExporting(false);
    }
  }, []);

  const downloadAuditLog = useCallback(async () => {
    const file = await exportAuditLog();
    if (file) downloadTextFile(file);
  }, [exportAuditLog]);

  const shareAuditLog = useCallback(async () => {
    const file = await exportAuditLog();
    if (!file) return;

    if (
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function" ||
      !navigator.canShare({ files: [file] })
    ) {
      setExportError(
        "File sharing is not supported by this browser. Download the .txt file and share it using another app.",
      );
      return;
    }

    try {
      await navigator.share({ files: [file], title: "Course Vault Audit Log" });
      showToast("Audit log shared.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setExportError(errorMessage(err));
    }
  }, [exportAuditLog, showToast]);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit log</h2>
          <p className="mt-1 text-sm text-gray-500">
            Administrative actions with date and time shown in your local
            timezone. {total} {total === 1 ? "activity" : "activities"} recorded.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <h3 className="font-semibold text-slate-900">Export audit log</h3>
        <p className="mt-1 text-sm text-slate-600">
          Download or share a text file containing all recorded audit
          activities, not just the entries on the current page.
        </p>
        {exportError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {exportError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadAuditLog}
            disabled={exporting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Spinner size={16} /> : <Download size={16} />}
            Download .txt
          </button>
          <button
            type="button"
            onClick={shareAuditLog}
            disabled={
              exporting ||
              typeof navigator.share !== "function" ||
              typeof navigator.canShare !== "function"
            }
            title={
              typeof navigator.share !== "function"
                ? "File sharing is not supported by this browser"
                : undefined
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 size={16} />
            Share .txt
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-blue-600">
          <Spinner size={24} />
          <p className="text-sm">Loading audit activity...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <CircleAlert size={28} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <p className="rounded-xl bg-blue-50 p-5 text-sm text-blue-900/70">
          No audit activity has been recorded yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Date and time</th>
                  <th className="px-3 py-3 font-semibold">Activity</th>
                  <th className="px-3 py-3 font-semibold">Target</th>
                  <th className="px-3 py-3 font-semibold">Performed by</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-4 text-slate-600">
                      <time dateTime={entry.createdAt}>
                        {formatTimestamp(entry.createdAt)}
                      </time>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">
                        {formatAction(entry.action)}
                      </p>
                      {entry.details && (
                        <p className="mt-1 text-slate-500">{entry.details}</p>
                      )}
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <span className="font-medium">{entry.targetName}</span>
                      <span className="mt-1 block text-xs capitalize text-slate-500">
                        {entry.targetType}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-medium text-slate-800">
                        {entry.actorName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.actorEmail} · {entry.actorRole}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-slate-500">
              Page {page} of {Math.max(1, totalPages)}
            </p>
            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
