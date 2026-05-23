"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 30_000; // check every 30 seconds

/**
 * Actively polls the session endpoint every 30 s.
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

  // Actively poll — call update() which re-fetches the JWT from the server.
  // The server's jwt callback will set sessionInvalid=true if another device
  // has since logged in, causing the session callback to return an empty user.
  useEffect(() => {
    if (status !== "authenticated") return;

    intervalRef.current = setInterval(async () => {
      await update();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, update]);

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
