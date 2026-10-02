import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "blue" | "green";
};

export default function StatCard({ icon, label, value, tone }: StatCardProps) {
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
        <p className="text-sm text-blue-900/60">{label}</p>
        <p className="text-xl font-bold text-black">{value}</p>
      </div>
    </div>
  );
}
