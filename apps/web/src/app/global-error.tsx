"use client";

import { useEffect } from "react";

/**
 * Top-level error boundary for the App Router. Reports unhandled render errors
 * to Sentry (when configured) and shows a minimal recovery UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Something went wrong
        </h2>
        <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "#4F46E5",
            color: "white",
            border: "none",
            padding: "0.625rem 1.5rem",
            borderRadius: "0.5rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
