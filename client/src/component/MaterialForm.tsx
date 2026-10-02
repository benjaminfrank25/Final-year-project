import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Sparkles } from "lucide-react";
import Notice from "./Notice";
import Spinner from "./Spinner";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { api, errorMessage } from "../lib/api";
import { CATEGORIES } from "../lib/catergories";
import { LEVELS } from "../lib/constants";
import { MAX_UPLOAD_MB } from "../lib/limits";
import { extractMaterialText } from "../lib/document";
import { SEMESTERS } from "../lib/semesters";
import { inputClass, labelClass } from "../lib/ui";
import type { Level, Material, MaterialCategory, Semester } from "../types";
import { useToast } from "../hooks/useToast";

export type MaterialFormValues = {
  title: string;
  lecturerName: string;
  courseCode: string;
  level: Level;
  semester: Semester;
  category: MaterialCategory;
  description: string;
};

type MaterialFormProps = {
  mode: "create" | "edit";
  initial?: Material;
  defaultSemester?: Semester;
  // Course reps can only work with their own level
  lockedLevel?: Level;
  submitLabel: string;
  onSubmit: (values: MaterialFormValues, file: File | null) => Promise<void>;
  onCancel?: () => void;
};

export default function MaterialForm({
  mode,
  initial,
  defaultSemester = "harmattan",
  lockedLevel,
  submitLabel,
  onSubmit,
  onCancel,
}: MaterialFormProps) {
  const [title, setTitle, ] = useState(initial?.title ?? "");
  const [lecturerName, setLecturerName] = useState(
    (initial as (Material & { lecturerName?: string }) | undefined)?.lecturerName ?? "",
  );
  const [courseCode, setCourseCode] = useState(initial?.courseCode ?? "");
  const [level, setLevel] = useState(
    initial
      ? String(initial.level)
      : lockedLevel !== undefined
        ? String(lockedLevel)
        : "",
  );
  const [semester, setSemester] = useState<Semester>(
    initial?.semester ?? defaultSemester,
  );
  const [category, setCategory] = useState<MaterialCategory>(
    initial?.category ?? "lecture-note",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [descriptionPhase, setDescriptionPhase] = useState<
    "reading" | "generating" | null
  >(null);
  const [descriptionError, setDescriptionError] = useState("");

  const [error, setError] = useTimedMessage(5000);
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  async function generateDescription() {
    if (!file) return;

    setError("");
    setDescriptionError("");
    setDescriptionPhase("reading");
    try {
      const text = await extractMaterialText(file);
      if (text.length < 40) {
        throw new Error(
          file.name.toLowerCase().endsWith(".pdf")
            ? "This PDF has no selectable text to describe. Scanned PDFs need OCR first."
            : file.name.toLowerCase().endsWith(".pptx")
              ? "This PowerPoint has no readable slide text to describe."
              : "This Word document does not contain enough readable text to describe.",
        );
      }

      setDescriptionPhase("generating");
      const result = await api<{ description: string }>("/materials/describe", {
        method: "POST",
        body: {
          text,
          title: title.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          category,
        },
      });
      setDescription(result.description);
      showToast("AI draft ready. Review it before uploading.", "info");
    } catch (err) {
      setDescriptionError(errorMessage(err));
    } finally {
      setDescriptionPhase(null);
    }
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (title.trim().length < 2) {
      setError("Title is too short");
      return;
    }
    if (courseCode.trim().length < 3) {
      setError("Enter a course code, e.g. CSC101");
      return;
    }
    if (!level) {
      setError("Select a level");
      return;
    }
    if (mode === "create") {
      if (!file) {
        setError(
          "Choose a PDF, Word (.docx), or PowerPoint (.pptx) file to upload",
        );
        return;
      }
      if (!/\.(pdf|docx|pptx)$/i.test(file.name)) {
        setError(
          "Only PDF, Word (.docx), and PowerPoint (.pptx) files are allowed",
        );
        return;
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        setError(`That file is too large (max ${MAX_UPLOAD_MB}MB)`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          lecturerName: lecturerName.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          level: lockedLevel ?? (Number(level) as Level),
          semester,
          category,
          description: description.trim(),
        },
        file,
      );

      if (mode === "create") {
        setTitle("");
        setDescription("");
        setFile(null);
        setFileKey((k) => k + 1);
      }
      showToast(
        mode === "create"
          ? "Material uploaded successfully."
          : "Material changes saved.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Notice>{error}</Notice>}

      <div>
        <label htmlFor="mf-title" className={labelClass}>
          Title
        </label>
        <input
          id="mf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to Information Technology, Week 1"
          maxLength={150}
          className={`mt-1.5 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor="Lecturer name" className={labelClass}>
          Lecturer name
        </label>
        <input
          id="Lecturer name"
          value={lecturerName}
          onChange={(e) => setLecturerName(e.target.value)}
          placeholder="e.g. Dr. John Otumu"
          maxLength={100}
          className={`mt-1.5 ${inputClass}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mf-course" className={labelClass}>
            Course code
          </label>
          <input
            id="mf-course"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="e.g. IFT101"
            maxLength={15}
            className={`mt-1.5 uppercase ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="mf-level" className={labelClass}>
            Level
          </label>
          <select
            id="mf-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={lockedLevel !== undefined}
            className={`mt-1.5 disabled:cursor-not-allowed disabled:bg-blue-50 disabled:text-gray-900/70 ${inputClass}`}
          >
            <option value="">Select level</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
          {lockedLevel !== undefined && (
            <p className="mt-1.5 text-xs text-gray-900">Fixed to your level</p>
          )}
        </div>

        <div>
          <label htmlFor="mf-semester" className={labelClass}>
            Semester
          </label>
          <select
            id="mf-semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value as Semester)}
            className={`mt-1.5 ${inputClass}`}
          >
            {SEMESTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mf-category" className={labelClass}>
            Category
          </label>
          <select
            id="mf-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MaterialCategory)}
            className={`mt-1.5 ${inputClass}`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.singular}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="mf-description" className={labelClass}>
            Description <span className="text-gray-900">(optional)</span>
          </label>
          {mode === "create" && (
            <button
              type="button"
              onClick={generateDescription}
              disabled={!file || descriptionPhase !== null || loading}
              title="Uses readable text from the selected PDF, Word, or PowerPoint file"
              aria-live="polite"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {descriptionPhase !== null ? (
                <Spinner size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              {descriptionPhase === "reading"
                ? "Reading document..."
                : descriptionPhase === "generating"
                  ? "Generating..."
                  : "Generate with AI"}
            </button>
          )}
        </div>
        <textarea
          id="mf-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="A short note students will see under the title"
          className={`mt-1.5 resize-y ${inputClass}`}
        />
        {descriptionError && (
          <p
            role="alert"
            className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {descriptionError}
          </p>
        )}
      </div>

      {mode === "create" && (
        <div>
          <label htmlFor="mf-file" className={labelClass}>
            PDF, Word, or PowerPoint file{" "}
            <span className="text-gray-900">
              (PDF, DOCX, PPTX; up to {MAX_UPLOAD_MB}MB)
            </span>
          </label>
          <input
            key={fileKey}
            id="mf-file"
            type="file"
            accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
            disabled={descriptionPhase !== null || loading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full cursor-pointer rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-3 text-sm text-blue-900/70 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || descriptionPhase !== null}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Spinner size={16} />}
          {loading
            ? mode === "create"
              ? "Uploading..."
              : "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
}
