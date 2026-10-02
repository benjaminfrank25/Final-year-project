import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  error?: string;
};

export default function PasswordField({
  label,
  error,
  id,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? rest.name;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          {...rest}
          className={`block w-full rounded-lg border bg-gray-900 py-2.5 pl-3.5 pr-11 text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 ${
            error
              ? "border-red-500/70 focus:ring-red-500/30"
              : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
          }`}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition hover:text-slate-200"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
