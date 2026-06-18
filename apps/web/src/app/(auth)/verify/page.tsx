"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState(token ? "" : "This verification link is missing or invalid.");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard against double-run in React strict mode
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified.");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    })();
  }, [token]);

  return (
    <div className="text-center">
      <div className="mb-8 lg:hidden">
        <Logo size="sm" />
      </div>

      {status === "verifying" && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Verifying your email…</h2>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Email verified!</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{message}</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="lg">Continue to login</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Verification failed</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{message}</p>
          <p className="mt-6 text-sm text-gray-500 dark:text-slate-400">
            Need a new link?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Go to login
            </Link>{" "}
            and use &quot;Resend verification&quot;.
          </p>
        </>
      )}
    </div>
  );
}
