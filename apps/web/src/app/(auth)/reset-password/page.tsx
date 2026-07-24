"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Invalid link</h2>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          This reset link is missing or invalid.{" "}
          <Link href="/forgot-password" className="font-bold text-primary hover:text-primary/80 transition-colors">
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
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

      {done ? (
        <div className="text-center group">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Password updated!</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">
            Your password has been reset successfully. Redirecting you to login...
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            Go to login now
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Set new password</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Choose a strong password — at least 8 characters.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-full pl-11 pr-12 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 rounded-full pl-11 pr-12 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>

            <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98] mt-2" size="xl" loading={loading}>
              Reset password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
            Remember it?{" "}
            <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Back to login
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
