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
        <div className="group">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Verifying your email…</h2>
        </div>
      )}

      {status === "success" && (
        <div className="group">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Email verified!</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">{message}</p>
          <Link href="/login" className="mt-8 inline-block w-full">
            <Button size="xl" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98]">Continue to login</Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="group">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Verification failed</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">{message}</p>
          <p className="mt-6 text-sm text-muted-foreground/60 uppercase tracking-widest font-semibold">
            Need a new link?{" "}
            <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Go to login
            </Link>{" "}
            and use "Resend verification".
          </p>
        </div>
      )}
    </div>
  );
}
