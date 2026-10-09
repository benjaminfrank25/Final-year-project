import { lazy, Suspense, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  CalendarClock,
  CircleAlert,
  FileText,
  FolderOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import DashboardLayout from "../component/DashboardLayout";
import AnnouncementsPanel from "../component/AnnouncementsPanel";
import ContinueCard from "../component/ContinueCard";
import CourseCard from "../component/CourseCard";
import MaterialRow from "../component/MaterialRow";
import RecentCard from "../component/RecentCard";
import SemesterSwitch from "../component/SemesterSwitch";
import Spinner from "../component/Spinner";
import { useLibrary } from "../hooks/useLibrary";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useMaterials } from "../hooks/useMaterials";
import { CATEGORIES } from "../lib/catergories";
import { formatDate } from "../lib/format";
import { currentSemester, isSemester, semesterLabel } from "../lib/semesters";
import { useAppSelector } from "../store/hooks";
import type { Material, MaterialCategory, Semester } from "../types";

//loaded whenn a pdf is big
const PdfViewer = lazy(() => import("../component/PdfViewer"));
const OfficePreview = lazy(() => import("../component/OfficePreview"));

const DAY_MS = 24 * 60 * 60 * 1000;

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "blue" | "green";
};

function StatCard({ icon, label, value, tone }: StatCardProps) {
  const cardClass =
    tone === "green"
      ? "border-emerald-100 from-white to-emerald-100"
      : "border-blue-100 from-white to-blue-100";
  const iconClass =
    tone === "green" ? "bg-white text-emerald-600" : "bg-white text-blue-600";

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border bg-linear-to-br p-5 shadow-sm ${cardClass}`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${iconClass}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm text-gray-900">{label}</p>
        <p className="text-xl font-bold text-black">{value}</p>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { materials, loading, error, reload } = useMaterials();
  const announcements = useAnnouncements();
  const { states, toggleBookmark, markOpened, saveProgress } = useLibrary();

  const [now] = useState(() => Date.now());
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [course, setCourse] = useState<string | null>(null);
  const [category, setCategory] = useState<MaterialCategory | "all">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [viewing, setViewing] = useState<{
    material: Material;
    startPage: number;
  } | null>(null);

  const semesterParam = params.get("semester");
  const semester: Semester = isSemester(semesterParam)
    ? semesterParam
    : currentSemester(now);

  function changeSemester(next: Semester) {
    setParams({ semester: next }, { replace: true });
    setCourse(null);
    setCategory("all");
  }

  function openViewer(material: Material) {
    markOpened(material.id);
    setViewing({
      material,
      startPage: states[material.id]?.lastPage ?? 1,
    });
  }

  const semesterCounts = useMemo(() => {
    const counts: Record<Semester, number> = { harmattan: 0, rain: 0 };
    for (const m of materials) counts[m.semester] += 1;
    return counts;
  }, [materials]);

  // Everything below works on just the chosen semester's materials
  const inSemester = useMemo(
    () => materials.filter((m) => m.semester === semester),
    [materials, semester],
  );

  const totalCourses = useMemo(
    () => new Set(materials.map((m) => m.courseCode)).size,
    [materials],
  );

  const courses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of inSemester) {
      counts.set(m.courseCode, (counts.get(m.courseCode) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [inSemester]);

  const tabs = useMemo(() => {
    const counts = new Map<MaterialCategory, number>();
    for (const m of inSemester) {
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    }
    return [
      { value: "all" as const, label: "All", count: inSemester.length },
      ...CATEGORIES.filter((c) => counts.has(c.value)).map((c) => ({
        value: c.value,
        label: c.label,
        count: counts.get(c.value) ?? 0,
      })),
    ];
  }, [inSemester]);

  const savedCount = useMemo(
    () => inSemester.filter((m) => states[m.id]?.bookmarked).length,
    [inSemester, states],
  );

  const recent = useMemo(() => {
    const byId = new Map(materials.map((m) => [m.id, m]));
    const sorted = Object.values(states).sort((a, b) =>
      (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""),
    );

    const list: { material: Material; openedAt: string }[] = [];
    for (const s of sorted) {
      const material = byId.get(s.materialId);
      if (material && s.lastOpenedAt) {
        list.push({ material, openedAt: s.lastOpenedAt });
      }
      if (list.length === 4) break;
    }
    return list;
  }, [materials, states]);

  const continueItem = useMemo(() => {
    const byId = new Map(materials.map((m) => [m.id, m]));
    let best: {
      material: Material;
      page: number;
      total: number;
      at: string;
    } | null = null;

    for (const s of Object.values(states)) {
      if (!s.lastOpenedAt || !s.lastPage || !s.totalPages) continue;
      if (s.lastPage <= 1 || s.lastPage >= s.totalPages) continue;

      const material = byId.get(s.materialId);
      if (!material) continue;

      if (!best || s.lastOpenedAt > best.at) {
        best = {
          material,
          page: s.lastPage,
          total: s.totalPages,
          at: s.lastOpenedAt,
        };
      }
    }
    return best;
  }, [materials, states]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inSemester.filter((m) => {
      if (course && m.courseCode !== course) return false;
      if (category !== "all" && m.category !== category) return false;
      if (savedOnly && !states[m.id]?.bookmarked) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.courseCode.toLowerCase().includes(q) ||
        m.originalName.toLowerCase().includes(q)
      );
    });
  }, [inSemester, course, category, savedOnly, states, search]);

  const latestDate = useMemo(() => {
    let max = "";
    for (const m of materials) {
      if (m.createdAt > max) max = m.createdAt;
    }
    return max || null;
  }, [materials]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <section className="rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 p-6 text-white shadow-sm sm:p-8">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-blue-50">
          {user.level} Level
        </span>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Welcome back, {user.fullName}
        </h1>
        <p className="mt-2 max-w-xl text-blue-100">
          the lecture notes and Word documents for your level, in one place.
        </p>
      </section>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          tone="blue"
          icon={<FileText size={22} />}
          label="Materials"
          value={loading ? "–" : materials.length}
        />
        <StatCard
          tone="green"
          icon={<BookOpen size={22} />}
          label="Courses"
          value={loading ? "–" : totalCourses}
        />
        <StatCard
          tone="blue"
          icon={<CalendarClock size={22} />}
          label="Last upload"
          value={
            loading ? "–" : latestDate ? formatDate(latestDate) : "None yet"
          }
        />
      </div>

      <section className="mt-8">
        <AnnouncementsPanel
          announcements={announcements.announcements}
          loading={announcements.loading}
          error={announcements.error}
          reload={announcements.reload}
          mode="student"
        />
      </section>

      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white p-12 text-blue-600 shadow-sm">
          <Spinner size={32} />
          <p className="text-sm text-blue-600">Loading your materials...</p>
        </div>
      ) : error ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <CircleAlert size={32} className="text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={reload}
            className="mt-1 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : materials.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
            <FolderOpen size={28} />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            No materials yet
          </h2>
          <p className="max-w-sm text-sm text-gray-900">
            Nothing has been uploaded for {user.level} Level yet. Check back
            soon.
          </p>
        </div>
      ) : (
        <>
          {/* Continue reading */}
          {continueItem && (
            <section className="mt-8">
              <ContinueCard
                material={continueItem.material}
                page={continueItem.page}
                total={continueItem.total}
                onContinue={() => openViewer(continueItem.material)}
              />
            </section>
          )}

          {/* Semester */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-gray-900">
              Choose a semester
            </h2>
            <SemesterSwitch
              value={semester}
              counts={semesterCounts}
              onChange={changeSemester}
            />
          </section>

          {recent.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                Recently opened
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recent.map((r) => (
                  <RecentCard
                    key={r.material.id}
                    material={r.material}
                    openedAt={r.openedAt}
                    now={now}
                    onOpen={() => openViewer(r.material)}
                  />
                ))}
              </div>
            </section>
          )}

          {inSemester.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <FolderOpen size={28} />
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                Nothing in the {semesterLabel(semester)} yet
              </h2>
              <p className="max-w-sm text-sm text-blue-900/60">
                No materials have been uploaded for {user.level} Level in this
                semester. Check back soon.
              </p>
            </div>
          ) : (
            <>
              {/* Courses */}
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    Your courses
                  </h2>
                  {course && (
                    <button
                      onClick={() => setCourse(null)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <X size={14} />
                      Clear filter
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {courses.map((c) => (
                    <CourseCard
                      key={c.code}
                      code={c.code}
                      count={c.count}
                      selected={course === c.code}
                      onClick={() =>
                        setCourse(course === c.code ? null : c.code)
                      }
                    />
                  ))}
                </div>
              </section>

              {/* Materials */}
              <section className="mt-8">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    {course
                      ? `${course} materials`
                      : `${semesterLabel(semester)} materials`}
                    <span className="ml-2 text-sm font-medium text-blue-/50">
                      {visible.length}
                    </span>
                  </h2>

                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search materials..."
                      className="w-full rounded-xl border border-blue-200 bg-white py-2.5 pl-10 pr-3 text-gray-900 outline-none transition placeholder:text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Category tabs + Saved */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {tabs.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCategory(t.value)}
                      aria-pressed={category === t.value}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                        category === t.value
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      {t.label} <span className="opacity-70">{t.count}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSavedOnly((v) => !v)}
                    aria-pressed={savedOnly}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      savedOnly
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <Bookmark size={14} />
                    Saved <span className="opacity-70">{savedCount}</span>
                  </button>
                </div>

                {visible.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center">
                    <p className="text-blue-900/70">
                      {savedOnly && savedCount === 0
                        ? "You haven't saved anything in this semester yet. Tap the bookmark on a material to save it."
                        : "No materials match your search."}
                    </p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setCourse(null);
                        setCategory("all");
                        setSavedOnly(false);
                      }}
                      className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Clear search and filters
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {visible.map((m) => {
                      const s = states[m.id];
                      return (
                        <MaterialRow
                          key={m.id}
                          material={m}
                          isNew={
                            now - new Date(m.createdAt).getTime() < 7 * DAY_MS
                          }
                          bookmarked={s?.bookmarked ?? false}
                          progress={
                            s?.lastPage && s.totalPages
                              ? { page: s.lastPage, total: s.totalPages }
                              : null
                          }
                          onToggleBookmark={() => toggleBookmark(m.id)}
                          onView={() => openViewer(m)}
                        />
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}

      {/* In-platform material preview */}
      {viewing && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white">
              <Spinner size={36} />
            </div>
          }
        >
          {/\.pdf$/i.test(viewing.material.originalName) ? (
            <PdfViewer
              key={viewing.material.id}
              material={viewing.material}
              startPage={viewing.startPage}
              onProgress={saveProgress}
              onClose={() => setViewing(null)}
            />
          ) : (
            <OfficePreview
              key={viewing.material.id}
              material={viewing.material}
              onClose={() => setViewing(null)}
            />
          )}
        </Suspense>
      )}
    </DashboardLayout>
  );
}
