import { useMemo, useState } from "react";
import {
  CircleAlert,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Notice from "./Notice";
import Spinner from "./Spinner";
import { useTimedMessage } from "../hooks/useTimedMessage";
import type { StudentPatch } from "../hooks/useStudents";
import { errorMessage } from "../lib/api";
import { LEVELS } from "../lib/constants";
import { formatDate } from "../lib/format";
import { inputClass } from "../lib/ui";
import type { Level, Status, Student } from "../types";
import { useToast } from "../hooks/useToast";
import BulkStudentRegistrationPanel from "./BulkStudentRegistrationPanel";

type Filter = "pending" | "active" | "rejected" | "rep" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "rep", label: "Course reps" },
  { value: "all", label: "All" },
];

const statusStyle: Record<Status, string> = {
  pending: "bg-blue-50 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

const emptyText: Record<Filter, string> = {
  pending: "No pending registrations right now.",
  active: "No active students yet.",
  rejected: "Nobody has been rejected.",
  rep: "No course reps yet. Make an active student a course rep to let them upload for their level.",
  all: "No students have registered yet.",
};

type StudentsPanelProps = {
  students: Student[];
  loading: boolean;
  error: string;
  reload: () => void;
  update: (id: string, patch: StudentPatch) => Promise<void>;
  onImported?: () => void;
  mode?: "admin" | "rep";
  approveAll?: () => Promise<number>;
};

function confirmText(s: Student, mode: "admin" | "rep"): string {
  if (mode === "rep" && s.status === "pending") {
    return `${s.fullName} will not be able to log in unless an administrator restores their access.`;
  }

  const repNote =
    s.role === "rep" ? " They'll also lose their course rep access." : "";

  return s.status === "pending"
    ? `${s.fullName} won't be able to log in. You can restore them later.`
    : `${s.fullName} loses access straight away, and can't log in until you restore them.${repNote}`;
}

export default function StudentsPanel({
  students,
  loading,
  error,
  reload,
  update,
  onImported,
  mode = "admin",
  approveAll,
}: StudentsPanelProps) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(10);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirming, setConfirming] = useState<Student | null>(null);
  const [confirmingApproveAll, setConfirmingApproveAll] = useState(false);
  const [actionError, setActionError] = useTimedMessage(5000);
  const showToast = useToast();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      pending: 0,
      active: 0,
      rejected: 0,
      rep: 0,
      all: students.length,
    };
    for (const s of students) {
      c[s.status] += 1;
      if (s.role === "rep") c.rep += 1;
    }
    return c;
  }, [students]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filter === "rep") {
        if (s.role !== "rep") return false;
      } else if (filter !== "all" && s.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [students, filter, search]);
  const displayed = visible.slice(0, visibleLimit);

  async function run(id: string, patch: StudentPatch) {
    setBusyId(id);
    try {
      await update(id, patch);
      const message =
        patch.status === "active"
          ? "Student access approved."
          : patch.status === "rejected"
            ? "Student registration rejected."
            : patch.role === "rep"
              ? "Course rep role granted."
              : patch.role === "student"
                ? "Course rep role removed."
                : "Student level updated.";
      showToast(message);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!confirming) return;
    const id = confirming.id;
    setConfirming(null);
    await run(id, { status: "rejected" });
  }

  async function confirmApproveAll() {
    if (!approveAll) return;
    setBulkBusy(true);
    try {
      const count = await approveAll();
      setConfirmingApproveAll(false);
      showToast(
        count === 1
          ? "Approved 1 student for your level."
          : `Approved ${count} students for your level.`,
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white p-12 text-blue-600 shadow-sm">
        <Spinner size={32} />
        <p className="text-sm text-blue-600">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
        <CircleAlert size={32} className="text-red-500" />
        <p className="text-red-700">{error}</p>
        <button
          onClick={reload}
          className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4">
          <Notice>{actionError}</Notice>
        </div>
      )}

      {mode === "admin" && (
        <BulkStudentRegistrationPanel onImported={onImported ?? reload} />
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.filter((f) => mode === "admin" || f.value === "pending").map(
            (f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  filter === f.value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >
                {f.label} <span className="opacity-70">{counts[f.value]}</span>
              </button>
            ),
          )}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {mode === "rep" && approveAll && counts.pending > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700">
            Approve all {counts.pending} pending applications for your level.
          </p>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => setConfirmingApproveAll(true)}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserCheck size={16} />
            Approve all
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
            <Users size={28} />
          </span>
          <p className="max-w-md text-blue-900/70">
            {search
              ? "No students match your search."
              : mode === "rep"
                ? "No pending registrations for your level."
                : emptyText[filter]}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {displayed.map((s) => {
            const busy = busyId === s.id;

            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="wrap-break-word font-semibold text-gray-900">
                      {s.fullName}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyle[s.status]}`}
                    >
                      {s.status}
                    </span>
                    {mode === "rep" && s.level !== undefined && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Applicant · {s.level} Level
                      </span>
                    )}
                    {mode === "admin" && s.role === "rep" && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Course rep
                      </span>
                    )}
                  </div>
                  <p className="break-all text-sm text-gray-900">{s.email}</p>
                  <p className="text-xs text-blue-900/50">
                    Registered {formatDate(s.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mode === "admin" && (
                    <select
                      value={s.level ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        run(s.id, { level: Number(e.target.value) as Level })
                      }
                      aria-label={`Level for ${s.fullName}`}
                      className="cursor-pointer rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l} Level
                        </option>
                      ))}
                    </select>
                  )}

                  {(s.status === "pending" ||
                    (mode === "admin" && s.status === "rejected")) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(s.id, { status: "active" })}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy && <Spinner size={14} />}
                      {s.status === "pending" ? "Approve" : "Restore"}
                    </button>
                  )}

                  {mode === "admin" &&
                    s.status === "active" &&
                    s.role === "student" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(s.id, { role: "rep" })}
                      className="cursor-pointer rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Make course rep
                    </button>
                  )}

                  {mode === "admin" &&
                    s.status === "active" &&
                    s.role === "rep" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(s.id, { role: "student" })}
                      className="cursor-pointer rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove rep
                    </button>
                  )}

                  {(mode === "rep" && s.status === "pending") ||
                  (mode === "admin" &&
                    (s.status === "pending" || s.status === "active")) ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirming(s)}
                      className="cursor-pointer rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {mode === "rep" || s.status === "pending"
                        ? "Reject"
                        : "Revoke access"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {visible.length > 10 && (
        <div className="mt-5 flex justify-center gap-3">
          {visibleLimit < visible.length && (
            <button
              type="button"
              onClick={() => setVisibleLimit((limit) => limit + 10)}
              className="cursor-pointer rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              View more students ({visible.length - visibleLimit} remaining)
            </button>
          )}
          {visibleLimit > 10 && (
            <button
              type="button"
              onClick={() => setVisibleLimit(10)}
              className="cursor-pointer rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Show fewer
            </button>
          )}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={
            confirming.status === "pending"
              ? "Reject this registration?"
              : "Revoke access?"
          }
          message={confirmText(confirming, mode)}
          confirmLabel={confirming.status === "pending" ? "Reject" : "Revoke"}
          danger
          onConfirm={confirmReject}
          onCancel={() => setConfirming(null)}
        />
      )}

      {confirmingApproveAll && (
        <ConfirmDialog
          title="Approve all pending students?"
          message={`This will activate all ${counts.pending} pending student applications for your level. They will be able to log in immediately.`}
          confirmLabel="Approve all"
          loading={bulkBusy}
          onConfirm={confirmApproveAll}
          onCancel={() => setConfirmingApproveAll(false)}
        />
      )}
    </div>
  );
}
