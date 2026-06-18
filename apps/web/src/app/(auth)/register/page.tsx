"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCentreRegistration = searchParams.get("role") === "centre";
  const prefilledEmail = searchParams.get("email") || "";

  const [form, setForm] = useState({
    name: "",
    email: prefilledEmail,
    phone: "",
    password: "",
    confirmPassword: "",
    centreName: "",
    centreReferralCode: "",
    slugManuallyEdited: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-suggest referral code from centre name (only if user hasn't manually edited it)
      if (field === "centreName" && !prev.slugManuallyEdited) {
        next.centreReferralCode = slugify(value);
      }

      // Fallback: if centre name empty but email provided, suggest from email
      if (
        isCentreRegistration &&
        field === "email" &&
        !prev.centreName &&
        !prev.slugManuallyEdited
      ) {
        const emailPrefix = value.split("@")[0] || "";
        next.centreReferralCode = slugify(emailPrefix);
      }

      // Track manual edits to the referral code
      if (field === "centreReferralCode") {
        next.slugManuallyEdited = value.length > 0;
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Password must be at least 8 characters and include a letter and a number");
      return;
    }

    const cleanedPhone = form.phone.replace(/[^\d+]/g, "");
    if (!/^\+?\d{10,15}$/.test(cleanedPhone)) {
      setError("Please enter a valid phone number (10–15 digits)");
      return;
    }

    if (isCentreRegistration) {
      if (!form.centreName.trim()) {
        setError("Centre name is required");
        return;
      }
      if (!form.centreReferralCode.trim()) {
        setError("Referral code is required");
        return;
      }
      if (form.centreReferralCode.length < 3) {
        setError("Referral code must be at least 3 characters");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: isCentreRegistration ? "centre" : "student",
          centreName: isCentreRegistration ? form.centreName : undefined,
          centreReferralCode: isCentreRegistration ? form.centreReferralCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="mb-8 lg:hidden">
        <Logo size="sm" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        {isCentreRegistration ? "Register Your Centre" : "Create your account"}
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        {isCentreRegistration
          ? "Set up your coaching centre on Prepfly"
          : "Start your PTE preparation journey for free"}
      </p>

      {prefilledEmail && !isCentreRegistration && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>You&apos;ve been invited by a coaching centre. Register with <strong>{prefilledEmail}</strong> to join automatically.</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => updateForm("phone", e.target.value)}
            className="pl-10"
            required
          />
        </div>


        {isCentreRegistration && (
          <>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Coaching centre name"
                value={form.centreName}
                onChange={(e) => updateForm("centreName", e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">#</span>
                <Input
                  type="text"
                  placeholder="Referral code (auto-generated)"
                  value={form.centreReferralCode}
                  onChange={(e) =>
                    updateForm(
                      "centreReferralCode",
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  className="pl-10"
                  required
                />
              </div>
              <p className="mt-1 pl-1 text-xs text-gray-500 dark:text-slate-400">
                This code will be used by students to join your centre. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
          </>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 8, incl. a letter & number)"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => updateForm("confirmPassword", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-slate-400">
          By creating an account, you agree to our{" "}
          <Link href="/terms" target="_blank" className="font-medium text-indigo-600 hover:text-indigo-500">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-indigo-600 hover:text-indigo-500">Privacy Policy</Link>.
        </p>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {isCentreRegistration ? "Register Centre" : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>

      {!isCentreRegistration && (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-slate-400">
          Are you a coaching centre?{" "}
          <Link href="/register?role=centre" className="font-medium text-teal-600 hover:text-teal-500">
            Register as Centre
          </Link>
        </p>
      )}
    </div>
  );
}
