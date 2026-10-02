import { useMemo, useState } from "react";
import {
  CircleAlert,
  Eye,
  FileText,
  FolderOpen,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import MaterialForm from "./MaterialForm";
import type { MaterialFormValues } from "./MaterialForm";
import Modal from "./Modal";
import Notice from "./Notice";
import Spinner from "./Spinner";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { api, errorMessage } from "../lib/api";
import { categoryName } from "../lib/catergories";
import { LEVELS } from "../lib/constants";
import { formatBytes, formatDate } from "../lib/format";
import { SEMESTERS } from "../lib/semesters";
import { inputClass } from "../lib/ui";
import type { Level, Material, Semester } from "../types";
import { useToast } from "../hooks/useToast";

const shortSemester: Record<Semester, string> = {
  harmattan: "Harmattan",
  rain: "Rain",
};

type MaterialsPanelProps = {
  materials: Material[];
  loading: boolean;
  error: string;
  reload: () => void;
  // Set for course reps: they only ever see and edit their own level
  lockedLevel?: Level;
};

export default function MaterialsPanel({
  materials,
  loading,
  error,
  reload,
  lockedLevel,
}: MaterialsPanelProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useTimedMessage(5000);
  const showToast = useToast();

  //new uploads show at the top
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter((m) => {
        if (levelFilter && String(m.level) !== levelFilter) return false;
        if (semesterFilter && m.semester !== semesterFilter) return false;
        if (!q) return true;
        return (
          m.title.toLowerCase().includes(q) ||
          m.courseCode.toLowerCase().includes(q) ||
          m.originalName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [materials, search, levelFilter, semesterFilter]);

  async function saveEdit(values: MaterialFormValues) {
    if (!editing) return;
    await api<unknown>(`/materials/${editing.id}`, {
      method: "PATCH",
      body: values,
    });
    setEditing(null);
    reload();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api<unknown>(`/materials/${deleting.id}`, { method: "DELETE" });
      showToast("Material deleted.");
      setDeleting(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white p-12 text-blue-600 shadow-sm">
        <Spinner size={32} />
        <p className="text-sm text-blue-600">Loading materials...</p>
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

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, course or file name..."
            className={`${inputClass} pl-10`}
          />
        </div>

        {lockedLevel === undefined && (
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
            className={`${inputClass} sm:w-40`}
          >
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
        )}

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          aria-label="Filter by semester"
          className={`${inputClass} sm:w-48`}
        >
          <option value="">Both semesters</option>
          {SEMESTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
            <FolderOpen size={28} />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            No materials yet
          </h2>
          <p className="max-w-sm text-sm text-gray-900">
            Use the Upload material tab to add the first one.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center text-gray-900">
          No materials match those filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={22} />
                </span>

                <div className="min-w-0">
                  <h3 className="wrap-break-word font-semibold text-gray-900">
                    {m.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {m.level} Level
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.semester === "rain"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {shortSemester[m.semester]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.category === "past-question"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {categoryName(m.category)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-blue-900/60">
                    <span className="font-semibold text-blue-700">
                      {m.courseCode}
                    </span>
                    {" · "}
                    {formatBytes(m.size)}
                    {" · "}
                    {formatDate(m.createdAt)}
                    {" · "}
                    {m.originalName}
                    {m.lecturerName && (
                      <>
                        {" · Lecturer: "}
                        <span className="font-semibold text-blue-700">
                          {m.lecturerName}
                        </span>
                      </>
                    )}
                    {m.uploadedByName && (
                      <>
                        {" · by "}
                        <span className="font-semibold text-blue-700">
                          {m.uploadedByName}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/api/materials/${m.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${m.title}`}
                  title="View"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50"
                >
                  <Eye size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  aria-label={`Edit ${m.title}`}
                  title="Edit"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(m)}
                  aria-label={`Delete ${m.title}`}
                  title="Delete"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title="Edit material" onClose={() => setEditing(null)}>
          <MaterialForm
            key={editing.id}
            mode="edit"
            initial={editing}
            lockedLevel={lockedLevel}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this material?"
          message={`"${deleting.title}" will be permanently removed, including its file and every student's saved and progress records for it.`}
          confirmLabel="Delete"
          danger
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
