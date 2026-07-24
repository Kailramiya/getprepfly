"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <Logo size="sm" />
      </div>

      {sent ? (
        <div className="text-center group">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Check your email</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">
            If <span className="font-bold text-foreground">{email}</span> is registered with Prepfly,
            you&apos;ll receive a password reset link shortly. Check your spam folder if you don&apos;t see it.
          </p>
          <p className="mt-6 text-sm font-semibold text-muted-foreground/60 uppercase tracking-widest">Link expires in 1 hour.</p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Forgot password?</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Enter your registered email and we&apos;ll send you a link to reset your password.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98]" size="xl" loading={loading}>
              Send reset link
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
