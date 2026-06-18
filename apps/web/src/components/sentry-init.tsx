"use client";

import { useEffect } from "react";

/**
 * Browser-side Sentry initialization. Mounted once via Providers.
 * No-ops when NEXT_PUBLIC_SENTRY_DSN is not set.
 */
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    let cancelled = false;
    import("@sentry/nextjs").then((Sentry) => {
      if (cancelled) return;
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
