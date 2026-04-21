"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertCircle, Crown } from "lucide-react";

interface AccessInfo {
  hasAllAccess: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  freeSpeakingScoringsRemaining: number | null;
  reason?: string;
}

export function TrialBanner() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/access/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAccess(data.data);
      })
      .catch(() => {});
  }, []);

  if (!access || dismissed) return null;

  // Premium user — no banner
  if (access.hasAllAccess && !access.isTrial) return null;

  // Trial active
  if (access.isTrial && access.trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const isExpiringSoon = daysLeft <= 1;

    return (
      <div className={`border-b px-4 py-2.5 text-sm sm:px-6 lg:px-8 ${
        isExpiringSoon
          ? "border-amber-300 bg-amber-50"
          : "border-blue-200 bg-blue-50"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown className={`h-4 w-4 ${isExpiringSoon ? "text-amber-600" : "text-blue-600"}`} />
            <p className={isExpiringSoon ? "text-amber-800" : "text-blue-800"}>
              <strong>Free Trial Active</strong> — {daysLeft === 0 ? "ends today" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}. Enjoy full access!
            </p>
          </div>
          <Link
            href="/pricing"
            className="rounded-md bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            View plans →
          </Link>
        </div>
      </div>
    );
  }

  // Trial expired
  if (access.trialExpired) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-red-800">
              <strong>Trial expired.</strong>{" "}
              {access.freeSpeakingScoringsRemaining !== null && (
                <span className="text-red-700">
                  You can still practice Speaking (<strong>{access.freeSpeakingScoringsRemaining}</strong> free AI scorings left today).
                </span>
              )}{" "}
              Unlock all modules from <strong>₹99</strong>.
            </p>
          </div>
          <Link
            href="/pricing"
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  // Post-trial speaking limit indicator (rare edge case)
  if (access.freeSpeakingScoringsRemaining !== null && access.freeSpeakingScoringsRemaining < 7) {
    return (
      <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-xs sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-indigo-600" />
          <p className="text-indigo-700">
            <strong>{access.freeSpeakingScoringsRemaining}</strong> free AI scorings left today. Resets at midnight.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
