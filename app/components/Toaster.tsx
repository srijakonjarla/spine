"use client";

import { useSyncExternalStore, useEffect } from "react";
import { getToasts, subscribeToasts, dismissToast } from "@/lib/toast";

const EMPTY: readonly ReturnType<typeof getToasts>[number][] = [];

const COLORS = {
  error: "bg-red-500/95 text-white",
  info: "bg-plum/95 text-white",
  success: "bg-sage/95 text-white",
};

export function Toaster() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToasts,
    () => EMPTY, // server snapshot — no toasts during SSR
  );

  // Auto-dismiss after 4 s
  useEffect(() => {
    if (!toasts.length) return;
    const oldest = toasts[0];
    const timer = setTimeout(() => dismissToast(oldest.id), 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-sm ${COLORS[t.type]}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="opacity-70 hover:opacity-100 transition-opacity text-base leading-none shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
