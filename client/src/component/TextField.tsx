import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function TextField({
  label,
  error,
  id,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? rest.name;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-white">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        className={`mt-1.5 w-full rounded-lg border bg-gray-900 px-3.5 py-2.5 text-white placeholder-gray-500 outline-none transition focus:ring-2 ${
          error
            ? "border-red-500/70 focus:ring-red-500/30"
            : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
