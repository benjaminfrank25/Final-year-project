import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { ToastContext } from "../hooks/toastContext";
import type { ToastVariant } from "../hooks/toastContext";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
};

const appearance: Record<
  ToastVariant,
  {
    icon: typeof Check;
    label: string;
    iconClass: string;
    borderClass: string;
    progressClass: string;
  }
> = {
  success: {
    icon: Check,
    label: "Complete",
    iconClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    borderClass: "border-l-emerald-500",
    progressClass: "bg-emerald-500",
  },
  error: {
    icon: CircleAlert,
    label: "Needs attention",
    iconClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    borderClass: "border-l-rose-500",
    progressClass: "bg-rose-500",
  },
  info: {
    icon: Info,
    label: "Update",
    iconClass: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    borderClass: "border-l-sky-500",
    progressClass: "bg-sky-500",
  },
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = ++nextId.current;
      const duration = variant === "error" ? 6000 : 4200;
      setToasts((current) => [
        ...current.slice(-3),
        { id, message, variant, duration },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), duration),
      );
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:right-6 sm:bottom-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => {
          const style = appearance[toast.variant];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className={`toast-enter pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-slate-200 border-l-[3px] bg-white px-3.5 py-3 ${style.borderClass}`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconClass}`}
                aria-hidden="true"
              >
                <Icon size={17} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-[11px] font-bold text-slate-500">
                  {style.label}
                </p>
                <p className="mt-0.5 text-sm font-medium leading-5 text-slate-800">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                <X size={16} />
              </button>
              <span
                aria-hidden="true"
                className={`toast-progress absolute right-0 bottom-0 left-0 h-0.5 origin-left ${style.progressClass}`}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
