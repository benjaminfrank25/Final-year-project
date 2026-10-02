import type { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function Button({
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-br from-blue-600 to-blue-700 px-4 py-2.5 font-semibold text-white  transition-colors hover:bg-blue-500  focus:outline-none  disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Spinner size={18} />}
      {children}
    </button>
  );
}
