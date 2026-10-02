import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export default function SelectField({
  label,
  error,
  id,
  children,
  ...rest
}: SelectFieldProps) {
  const selectId = id ?? rest.name;

  return (
    <div>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <select
        id={selectId}
        {...rest}
        className={`mt-1.5 w-full rounded-lg border bg-gray-900 px-3.5 py-2.5 text-slate-100 outline-none transition focus:ring-2 ${
          error
            ? "border-red-500/70 focus:ring-red-500/30"
            : "border-gray-700 focus:border-blue-500 "
        }`}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
