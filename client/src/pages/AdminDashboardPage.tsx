import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Clock,
  FileText,
  History,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import DashboardLayout from "../component/DashboardLayout";
import AnnouncementsPanel from "../component/AnnouncementsPanel";
import MaterialsPanel from "../component/MaterialsPanel";
import StatCard from "../component/StatCard";
import StudentsPanel from "../component/StudentsPanel";
import UploadPanel from "../component/UploadPanel";
import AuditLogsPanel from "../component/AuditLogsPanel";
import { useMaterials } from "../hooks/useMaterials";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useStudents } from "../hooks/useStudents";
import { currentSemester } from "../lib/semesters";
import { useAppSelector } from "../store/hooks";

const TABS = [
  { value: "students", label: "Students", icon: Users },
  { value: "announcements", label: "Announcements", icon: Bell },
  { value: "upload", label: "Upload material", icon: Upload },
  { value: "materials", label: "Materials", icon: FileText },
  { value: "audit", label: "Audit log", icon: History },
] as const;

type Tab = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is Tab {
  return (
    value === "students" ||
    value === "announcements" ||
    value === "upload" ||
    value === "materials" ||
    value === "audit"
  );
}

export default function AdminDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const students = useStudents();
  const materials = useMaterials();
  const announcements = useAnnouncements();

  const [now] = useState(() => Date.now());
  const [params, setParams] = useSearchParams();

  const tabParam = params.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "students";

  const pendingCount = students.students.filter(
    (s) => s.status === "pending",
  ).length;
  const activeCount = students.students.filter(
    (s) => s.status === "active",
  ).length;
  const courseCount = new Set(materials.materials.map((m) => m.courseCode))
    .size;

  if (!user) return null;

  return (
    <DashboardLayout>
      <section className="rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 p-6 text-white shadow-sm sm:p-8">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-blue-50">
          Administrator
        </span>
        <h1 className="mt-3 text-3xl font-bold sm:text-3xl">
          Welcome, {user.fullName}
        </h1>
        <p className="mt-2 max-w-xl text-blue-100">
          Approve students, share announcements, upload study materials, and
          keep everything organized.
        </p>
      </section>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="green"
          icon={<Clock size={22} />}
          label="Pending approvals"
          value={students.loading ? "–" : pendingCount}
        />
        <StatCard
          tone="blue"
          icon={<UserCheck size={22} />}
          label="Active students"
          value={students.loading ? "–" : activeCount}
        />
        <StatCard
          tone="blue"
          icon={<FileText size={22} />}
          label="Materials"
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
              {t.value === "students" && pendingCount > 0 && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "students" && (
          <StudentsPanel
            students={students.students}
            loading={students.loading}
            error={students.error}
            reload={students.reload}
            update={students.update}
            onImported={() => students.reload(false)}
          />
        )}

        {tab === "announcements" && (
          <AnnouncementsPanel
            announcements={announcements.announcements}
            loading={announcements.loading}
            error={announcements.error}
            reload={announcements.reload}
            create={announcements.create}
            mode="admin"
          />
        )}

        {tab === "upload" && (
          <UploadPanel
            defaultSemester={currentSemester(now)}
            onUploaded={materials.reload}
          />
        )}

        {tab === "materials" && (
          <MaterialsPanel
            materials={materials.materials}
            loading={materials.loading}
            error={materials.error}
            reload={materials.reload}
          />
        )}

        {tab === "audit" && <AuditLogsPanel />}
      </div>
    </DashboardLayout>
  );
}
