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
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            If <span className="font-medium text-gray-900">{email}</span> is registered with Prepfly,
            you'll receive a password reset link shortly. Check your spam folder if you don't see it.
          </p>
          <p className="mt-6 text-sm text-gray-500">Link expires in 1 hour.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          <h2 className="text-2xl font-bold text-gray-900">Forgot password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your registered email and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Send reset link
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
