import type { ReactNode } from "react";

type NoticeProps = {
  variant?: "error" | "success";
  children: ReactNode;
};

const styles = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function Notice({ variant = "error", children }: NoticeProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
