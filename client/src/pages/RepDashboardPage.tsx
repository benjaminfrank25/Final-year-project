import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, FileText, Upload } from "lucide-react";
import DashboardLayout from "../component/DashboardLayout";
import MaterialsPanel from "../component/MaterialsPanel";
import StatCard from "../component/StatCard";
import UploadPanel from "../component/UploadPanel";
import { useMaterials } from "../hooks/useMaterials";
import { currentSemester } from "../lib/semesters";
import { useAppSelector } from "../store/hooks";

const TABS = [
  { value: "upload", label: "Upload material", icon: Upload },
  { value: "materials", label: "My level's materials", icon: FileText },
] as const;

type Tab = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is Tab {
  return value === "upload" || value === "materials";
}

export default function RepDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const materials = useMaterials();

  const [now] = useState(() => Date.now());
  const [params, setParams] = useSearchParams();

  const tabParam = params.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "upload";

  const courseCount = new Set(materials.materials.map((m) => m.courseCode))
    .size;

  if (!user || user.level === undefined) return null;

  return (
    <DashboardLayout>
      <section className="rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 p-6 text-white shadow-sm sm:p-8">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-blue-50">
          Course rep · {user.level} Level
        </span>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Welcome, {user.fullName}
        </h1>
        <p className="mt-2 max-w-xl text-blue-100">
          Upload study materials for {user.level} Level and keep them organized.
          Your classmates will see new uploads straight away.
        </p>
      </section>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          tone="blue"
          icon={<FileText size={22} />}
          label={`${user.level} Level materials`}
          value={materials.loading ? "–" : materials.materials.length}
        />
        <StatCard
          tone="green"
          icon={<BookOpen size={22} />}
          label="Courses"
          value={materials.loading ? "–" : courseCount}
        />
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const selected = tab === t.value;

          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setParams({ tab: t.value }, { replace: true })}
              aria-pressed={selected}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "upload" && (
          <UploadPanel
            defaultSemester={currentSemester(now)}
            lockedLevel={user.level}
            onUploaded={materials.reload}
          />
        )}

        {tab === "materials" && (
          <MaterialsPanel
            materials={materials.materials}
            loading={materials.loading}
            error={materials.error}
            reload={materials.reload}
            lockedLevel={user.level}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
