"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff, Building2, CheckCircle2, XCircle, Phone, ChevronDown } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { COUNTRY_CODES } from "@/lib/countries";

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
  const inviteToken = searchParams.get("invite") || "";
  const prefilledEmail = searchParams.get("email") || "";

  const [inviteCentre, setInviteCentre] = useState<{ valid: boolean; centreName: string | null } | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/centres/invite-link/validate?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => r.json())
      .then((d) => setInviteCentre(d.data || { valid: false, centreName: null }))
      .catch(() => setInviteCentre({ valid: false, centreName: null }));
  }, [inviteToken]);

  const [isCentre, setIsCentre] = useState(!inviteToken && searchParams.get("role") === "centre");

  const [form, setForm] = useState({
    name: "",
    email: prefilledEmail,
    countryCode: "+91",
    phone: "",
    password: "",
    confirmPassword: "",
    centreName: "",
    centreReferralCode: "",
    slugManuallyEdited: false,
  });
  
  const [emailWarning, setEmailWarning] = useState("");
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

      if (field === "centreName" && !prev.slugManuallyEdited) {
        next.centreReferralCode = slugify(value);
      }

      if (isCentre && field === "email" && !prev.centreName && !prev.slugManuallyEdited) {
        const emailPrefix = value.split("@")[0] || "";
        next.centreReferralCode = slugify(emailPrefix);
      }

      if (field === "centreReferralCode") {
        next.slugManuallyEdited = value.length > 0;
      }

      return next;
    });
  };

  const checkEmailOnBlur = () => {
    if (form.email.trim().toLowerCase().endsWith("@gmail.con")) {
      setEmailWarning("Did you mean @gmail.com?");
    } else {
      setEmailWarning("");
    }
  };

  const applyEmailFix = () => {
    setForm((prev) => ({ ...prev, email: prev.email.replace(/@gmail\.con$/i, "@gmail.com") }));
    setEmailWarning("");
  };

  const passLength = form.password.length >= 8;
  const passLetter = /[A-Za-z]/.test(form.password);
  const passNumber = /[0-9]/.test(form.password);
  const passValid = passLength && passLetter && passNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passValid) {
      setError("Please meet all password requirements.");
      return;
    }

    const nationalDigits = form.phone.replace(/\D/g, "");
    if (nationalDigits.length < 10) {
      setError("Phone number must be at least 10 digits.");
      return;
    }
    const fullPhone = `${form.countryCode}${nationalDigits}`;
    if (!/^\+\d{10,15}$/.test(fullPhone)) {
      setError("Please enter a valid phone number with your country code.");
      return;
    }

    if (isCentre) {
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
          phone: fullPhone,
          password: form.password,
          role: isCentre ? "centre" : "student",
          centreName: isCentre ? form.centreName : undefined,
          centreReferralCode: isCentre ? form.centreReferralCode : undefined,
          inviteToken: inviteToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Track submissions if needed
      console.log("form_submitted", { role: isCentre ? "centre" : "student" });

      router.push("/onboarding");
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

      <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
        Create your account
      </h2>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Start your PTE preparation journey today.
      </p>

      {/* Role Toggle */}
      {!inviteToken && (
        <div className="mt-6 flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setIsCentre(false)}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all duration-300 ${!isCentre ? "bg-background text-foreground shadow-sm ring-1 ring-white/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setIsCentre(true)}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all duration-300 ${isCentre ? "bg-background text-foreground shadow-sm ring-1 ring-white/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
          >
            Coaching Centre
          </button>
        </div>
      )}

      {prefilledEmail && !isCentre && !inviteToken && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>You&apos;ve been invited by a coaching centre. Register with <strong>{prefilledEmail}</strong> to join automatically.</span>
        </div>
      )}

      {inviteToken && inviteCentre?.valid && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>You&apos;re joining <strong>{inviteCentre.centreName}</strong>. Create your account below to get full access.</span>
        </div>
      )}

      {inviteToken && inviteCentre && !inviteCentre.valid && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>This invite link is invalid or has expired. Please ask your centre for a new one, or register normally below.</span>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Full Name</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="e.g. Aman Sharma"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              autoComplete="name"
              className="h-14 rounded-xl pl-11 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Email address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              onBlur={checkEmailOnBlur}
              autoComplete="email"
              className="h-14 rounded-xl pl-11 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
              required
            />
          </div>
          {emailWarning && (
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500 mt-2">
              <span>{emailWarning}</span>
              <button type="button" onClick={applyEmailFix} className="underline font-bold hover:text-amber-700 dark:hover:text-amber-400">Fix it</button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Phone number</label>
          <div className="flex gap-3">
            <div className="relative shrink-0 w-[110px]">
              <select
                aria-label="Country code"
                value={form.countryCode}
                onChange={(e) => updateForm("countryCode", e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.label} value={c.code} className="bg-background text-foreground">{c.label}</option>
                ))}
              </select>
              <div className="h-14 rounded-xl border border-white/5 shadow-inner bg-background/50 backdrop-blur-md text-foreground py-2 pl-4 pr-3 text-base font-medium flex items-center justify-between pointer-events-none">
                <span>{COUNTRY_CODES.find(c => c.code === form.countryCode)?.label.split(" ")[0]} {form.countryCode}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </div>
            <div className="relative flex-1 group">
              <Phone className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value.replace(/\D/g, ""))}
                className="h-14 rounded-xl pl-11 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
                maxLength={10}
                required
              />
            </div>
          </div>
        </div>

        {isCentre && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Coaching Centre Name</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="text"
                  placeholder="e.g. Masterclass Academy"
                  value={form.centreName}
                  onChange={(e) => updateForm("centreName", e.target.value)}
                  className="h-14 rounded-xl pl-11 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Referral Code</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground transition-colors group-focus-within:text-primary">#</span>
                <Input
                  type="text"
                  placeholder="auto-generated"
                  value={form.centreReferralCode}
                  onChange={(e) =>
                    updateForm(
                      "centreReferralCode",
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  className="h-14 rounded-xl pl-9 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
                  required
                />
              </div>
              <p className="px-1 text-xs font-medium text-muted-foreground/80 leading-relaxed">
                Students will use this code to join your centre.
              </p>
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
              autoComplete="new-password"
              className="h-14 rounded-xl pl-11 pr-12 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-1">
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${passLength ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> 8+ characters
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${passLetter ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> A letter
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${passNumber ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> A number
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Confirm Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => updateForm("confirmPassword", e.target.value)}
              className="h-14 rounded-xl pl-11 shadow-inner bg-background/50 border-white/5 backdrop-blur-md focus-visible:ring-primary/20 text-base"
              required
            />
          </div>
        </div>

        <p className="text-center text-xs font-medium text-muted-foreground/80 pt-4">
          By creating an account, you agree to our{" "}
          <Link href="/terms" target="_blank" className="font-bold underline text-foreground hover:text-foreground/80 transition-colors">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="font-bold underline text-foreground hover:text-foreground/80 transition-colors">Privacy Policy</Link>.
        </p>

        <div className="pt-2">
          <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98]" size="xl" loading={loading}>
            {isCentre ? "Register Centre" : "Create Account"}
          </Button>
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            No credit card needed · Cancel anytime
          </p>
        </div>
      </form>

      <p className="mt-10 text-center text-sm font-medium text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
