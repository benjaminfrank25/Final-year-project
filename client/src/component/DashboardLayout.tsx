import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { GraduationCap, LayoutDashboard, LogOut, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_NAME } from "../lib/constants";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";
import type { User } from "../types";
import { useToast } from "../hooks/useToast";

type DashboardLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function roleLabel(user: User): string {
  if (user.role === "admin") return "Administrator";
  if (user.role === "rep") return `Course rep · ${user.level} Level`;
  return `${user.level} Level student`;
}

function NavLinks({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon size={16} />
            {item.label}
          </NavLink>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const showToast = useToast();

  // Course reps get a second page for uploading
  const navItems: NavItem[] =
    user?.role === "rep" && user.level !== undefined
      ? [
          {
            to: `/dashboard/${user.level}`,
            label: "My dashboard",
            icon: LayoutDashboard,
          },
          { to: "/rep", label: "Rep tools", icon: Upload },
        ]
      : [];

  return (
    <div
      style={{ colorScheme: "light" }}
      className="flex min-h-screen flex-col bg-blue-50 text-blue-800"
    >
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap size={20} />
            </span>
            <span className="truncate text-lg font-bold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </div>

          {navItems.length > 0 && (
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLinks items={navItems} />
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {initials(user.fullName)}
                </span>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-tight text-slate-900">
                    {user.fullName}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {roleLabel(user)}
                  </p>
                </div>
              </div>
            )}

            <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

            <button
              type="button"
              onClick={() => {
                dispatch(logout());
                showToast("You've been logged out.");
              }}
              aria-label="Log out"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 hover:underline"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Phones: the links get their own slim row under the header */}
        {navItems.length > 0 && (
          <nav className="flex items-center gap-1 border-t border-slate-200/80 px-4 py-2 sm:hidden">
            <NavLinks items={navItems} />
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-medium text-slate-900">
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <p>Each level only sees its own materials.</p>
        </div>
      </footer>
    </div>
  );
}
