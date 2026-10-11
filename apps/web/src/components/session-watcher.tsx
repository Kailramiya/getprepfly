"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 60_000; // check every 60 seconds while the tab is visible

/**
 * Polls the session endpoint while the tab is visible (paused in background
 * tabs — most users keep several open and only look at one at a time, so
 * polling a hidden one is pure waste) and checks immediately the moment the
 * tab comes back into view, instead of waiting for the next tick — which
 * actually catches a kick *faster* in the common case of switching back to
 * a tab that was invalidated while it sat in the background.
 * If the server marks the session invalid (another device logged in),
 * shows a modal and forces sign-out within 3 seconds.
 */
export function SessionWatcher() {
  const { data: session, status, update } = useSession();
  const [showKicked, setShowKicked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect invalidation from session state change
  useEffect(() => {
    if (status === "authenticated" && !session?.user) {
      setShowKicked(true);
      setTimeout(() => signOut({ callbackUrl: "/login?kicked=1" }), 3000);
    }
  }, [status, session]);

  // Re-fetches the JWT from the server. The server's jwt callback will set
  // sessionInvalid=true if another device has since logged in, causing the
  // session callback to return an empty user.
  const checkNow = useCallback(() => { update(); }, [update]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(checkNow, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkNow();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, checkNow]);

  if (!showKicked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-slate-100">
          You&apos;ve been signed out
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          Your account has been signed in on another device. Only one active
          session is allowed at a time.
        </p>
        <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
          Redirecting to login…
        </p>
      </div>
    </div>
  );
}
