import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { LEVELS } from "../lib/constants";
import {
  apiFormWithProgress,
  errorMessage,
  type FormServerProgress,
} from "../lib/api";
import { inputClass, labelClass } from "../lib/ui";
import type { Level } from "../types";
import Spinner from "./Spinner";

type ImportFailure = {
  row: number;
  email?: string;
  message: string;
};

type ImportResult = {
  parsedCount: number;
  createdCount: number;
  failedCount: number;
  failures: ImportFailure[];
};

type ImportProgress = FormServerProgress & {
  uploadPercent?: number;
  uploadTotal?: number;
};

type BulkStudentRegistrationPanelProps = {
  onImported: () => void;
};

export default function BulkStudentRegistrationPanel({
  onImported,
}: BulkStudentRegistrationPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const createdCountRef = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || level === "") return;

    setBusy(true);
    setError("");
    setResult(null);
    createdCountRef.current = 0;
    setProgress({
      type: "progress",
      stage: "uploading",
      message: "Uploading class-list file...",
      parsedCount: 0,
      createdCount: 0,
    });
    const form = new FormData();
    form.append("file", file);
    form.append("level", String(level));

    try {
      const data = await apiFormWithProgress<ImportResult>(
        "/admin/students/import",
        form,
        ({ percent, total }) => {
          setProgress((current) => ({
            type: "progress",
            stage: "uploading",
            message:
              percent === 100
                ? "File uploaded. Reading workbook..."
                : "Uploading class-list file...",
            parsedCount: current?.parsedCount ?? 0,
            createdCount: current?.createdCount ?? 0,
            uploadPercent: total > 0 ? percent : undefined,
            uploadTotal: total,
          }));
        },
        (update) => {
          createdCountRef.current = update.createdCount ?? createdCountRef.current;
          setProgress((current) => ({ ...current, ...update }));
        },
      );
      setResult(data);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      onImported();
    } catch (err) {
      const createdCount = createdCountRef.current;
      setError(
        createdCount > 0
          ? `${errorMessage(err)} ${createdCount} account${createdCount === 1 ? " was" : "s were"} created before the import stopped.`
          : errorMessage(err),
      );
      if (createdCountRef.current > 0) onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Register a class list
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload a CSV or Excel (.xlsx) file with First Name and Last Name
          columns, or a Name column formatted as “lastname firstname othernames”.
          When using Name, only the first two words are used. Include a
          Registration Number and Student Email column.
          Registration numbers become initial passwords and must be 8-72
          characters. In Excel, format registration numbers as text to preserve
          leading zeroes. Imported student accounts are approved automatically.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="class-list-file" className={labelClass}>
            Class list file
          </label>
          <input
            ref={fileInput}
            id="class-list-file"
            type="file"
            disabled={busy}
            accept=".csv,.xlsx"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
              setResult(null);
            }}
            className={`${inputClass} mt-1 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700`}
          />
        </div>

        <div className="sm:w-44">
          <label htmlFor="class-list-level" className={labelClass}>
            Student level
          </label>
          <select
            id="class-list-level"
            disabled={busy}
            value={level}
            onChange={(event) => {
              setLevel(
                event.target.value === ""
                  ? ""
                  : (Number(event.target.value) as Level),
              );
              setResult(null);
            }}
            className={`${inputClass} mt-1 cursor-pointer`}
          >
            <option value="">Select level</option>
            {LEVELS.map((studentLevel) => (
              <option key={studentLevel} value={studentLevel}>
                {studentLevel} Level
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={busy || !file || level === ""}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Spinner size={16} /> : <Upload size={16} />}
          {busy ? "Registering..." : "Upload class list"}
        </button>
      </form>

      {busy && progress && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">{progress.message}</p>
            {progress.stage === "uploading" && progress.uploadTotal ? (
              <span className="shrink-0 tabular-nums">
                {progress.uploadPercent ?? 0}%
              </span>
            ) : (
              <Spinner size={16} />
            )}
          </div>
          {progress.stage === "uploading" && progress.uploadTotal ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width]"
                style={{ width: `${progress.uploadPercent ?? 0}%` }}
              />
            </div>
          ) : null}
          {(progress.parsedCount !== undefined ||
            progress.createdCount !== undefined) && (
            <p className="mt-1 text-xs text-blue-800">
              {progress.parsedCount !== undefined &&
                `Parsed ${progress.parsedCount}${progress.totalCount !== undefined ? ` of ${progress.totalCount}` : ""}`}
              {progress.parsedCount !== undefined &&
                progress.createdCount !== undefined &&
                " · "}
              {progress.createdCount !== undefined &&
                `Created ${progress.createdCount}`}
              {progress.failedCount
                ? ` · ${progress.failedCount} row${progress.failedCount === 1 ? "" : "s"} skipped`
                : ""}
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm ${
            result.failedCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <p className="flex items-center gap-2 font-semibold">
            {result.failedCount > 0 ? (
              <CircleAlert size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Parsed {result.parsedCount} row
            {result.parsedCount === 1 ? "" : "s"}; created{" "}
            {result.createdCount} student account
            {result.createdCount === 1 ? "" : "s"} successfully created.
            {result.failedCount > 0 &&
              ` ${result.failedCount} row${result.failedCount === 1 ? "" : "s"} not imported.`}
          </p>
          {result.failures.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.failures.slice(0, 10).map((failure) => (
                <li key={`${failure.row}-${failure.email ?? ""}`}>
                  Row {failure.row}
                  {failure.email ? ` (${failure.email})` : ""}: {failure.message}
                </li>
              ))}
              {result.failures.length > 10 && (
                <li>
                  And {result.failures.length - 10} more row
                  {result.failures.length - 10 === 1 ? "" : "s"} not imported.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
