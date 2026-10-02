import type { ReactNode } from "react";
import { APP_NAME } from "../lib/constants";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-slate-900 text-slate-100 lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-linear-to-br from-blue-600 to-blue-700  p-12 lg:flex">
        <div className="text-2xl font-bold tracking-tight">{APP_NAME}</div>

        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Every level.
            <br />
            Its own materials.
          </h2>
          <p className="mt-4 max-w-md text-white">
            Sign in to access the lecture notes and study materials for your
            level, all in one place.
          </p>
        </div>

        <p className="text-sm text-white">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-2xl font-bold tracking-tight text-blue-400 lg:hidden">
            {APP_NAME}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-gray-400">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-white">{footer}</div>
        </div>
      </main>
    </div>
  );
}
