import type { ReactNode } from "react";

type AlertProps = {
  variant?: "error" | "success";
  children: ReactNode;
};

const styles = {
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export default function Alert({ variant = "error", children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
