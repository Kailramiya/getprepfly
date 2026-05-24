"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastContextType {
  toast: (type: Toast["type"], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900",
    error: "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900",
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-right ${bgColors[t.type]}`}
            style={{ animation: "slideIn 0.3s ease-out" }}
          >
            {icons[t.type]}
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="ml-2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
