/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Initializes Sentry for the Node.js and Edge runtimes. No-ops entirely when
 * SENTRY_DSN is not configured, so local dev and DSN-less deploys are unaffected.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      // Keep tracing modest in prod to control cost; tune as needed.
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    });
  }
}
