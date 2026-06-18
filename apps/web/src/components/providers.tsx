"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { SentryInit } from "@/components/sentry-init";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SentryInit />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
