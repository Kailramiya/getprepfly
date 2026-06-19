"use client";

import { useState, createContext, useContext, useCallback, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ description: "" });
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleChoice = (choice: boolean) => {
    setOpen(false);
    resolveRef.current?.(choice);
    resolveRef.current = null;
  };

  const isDanger = opts.variant === "danger" || opts.variant === undefined;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleChoice(false)}
          />
          {/* Dialog */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDanger ? "bg-red-100 dark:bg-red-950/50" : "bg-amber-100 dark:bg-amber-950/50"}`}>
                <AlertTriangle className={`h-5 w-5 ${isDanger ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <div className="min-w-0 flex-1">
                {opts.title && (
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{opts.title}</p>
                )}
                <p className={`text-sm text-gray-600 dark:text-slate-400 ${opts.title ? "mt-1" : ""}`}>{opts.description}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => handleChoice(false)}>
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                size="sm"
                className={isDanger ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                onClick={() => handleChoice(true)}
              >
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
