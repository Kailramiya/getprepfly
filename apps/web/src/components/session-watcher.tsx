"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

/**
 * Watches the session — if it becomes invalid (user logged in from another device),
 * shows a message and forces sign-out.
 */
export function SessionWatcher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showKicked, setShowKicked] = useState(false);

  useEffect(() => {
    // status "authenticated" but session.user is null/undefined → invalidated
    // This happens when our custom session callback wipes the user on sessionInvalid
    if (status === "authenticated" && !session?.user) {
      setShowKicked(true);
      // Force sign-out so the stale cookie is cleared
      setTimeout(() => {
        signOut({ callbackUrl: "/login?kicked=1" });
      }, 2500);
    }
  }, [status, session, router]);

  if (!showKicked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">You&apos;ve been signed out</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your account is now active on another device. Only one device can be logged in at a time.
        </p>
        <p className="mt-4 text-xs text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  );
}
