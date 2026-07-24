"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Common dial codes for PTE students (India default + major study/work destinations).
const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+64", label: "🇳🇿 +64" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+977", label: "🇳🇵 +977" },
  { code: "+880", label: "🇧🇩 +880" },
  { code: "+92", label: "🇵🇰 +92" },
  { code: "+94", label: "🇱🇰 +94" },
  { code: "+974", label: "🇶🇦 +974" },
  { code: "+966", label: "🇸🇦 +966" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+60", label: "🇲🇾 +60" },
  { code: "+49", label: "🇩🇪 +49" },
];

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
  // An invite link always registers a student, so it overrides centre mode.
  const isCentreRegistration = !inviteToken && searchParams.get("role") === "centre";
  const prefilledEmail = searchParams.get("email") || "";

  const [inviteCentre, setInviteCentre] = useState<{ valid: boolean; centreName: string | null } | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/centres/invite-link/validate?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => r.json())
      .then((d) => setInviteCentre(d.data || { valid: false, centreName: null }))
      .catch(() => setInviteCentre({ valid: false, centreName: null }));
  }, [inviteToken]);

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

    // Validate national digits before combining with country code.
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
          phone: fullPhone,
          password: form.password,
          role: isCentreRegistration ? "centre" : "student",
          centreName: isCentreRegistration ? form.centreName : undefined,
          centreReferralCode: isCentreRegistration ? form.centreReferralCode : undefined,
          inviteToken: inviteToken || undefined,
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

      <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
        {isCentreRegistration ? "Register Your Centre" : "Create your account"}
      </h2>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        {isCentreRegistration
          ? "Set up your coaching centre on Prepfly"
          : "Start your PTE preparation journey for free"}
      </p>

      {prefilledEmail && !isCentreRegistration && !inviteToken && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>You&apos;ve been invited by a coaching centre. Register with <strong>{prefilledEmail}</strong> to join automatically.</span>
        </div>
      )}

      {inviteToken && inviteCentre?.valid && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span>You&apos;re joining <strong>{inviteCentre.centreName}</strong>. Create your account below to get full access.</span>
        </div>
      )}

      {inviteToken && inviteCentre && !inviteCentre.valid && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>This invite link is invalid or has expired. Please ask your centre for a new one, or register normally below.</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="relative group">
          <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
            required
          />
        </div>

        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
            required
          />
        </div>

        <div className="flex gap-3">
          <select
            aria-label="Country code"
            value={form.countryCode}
            onChange={(e) => updateForm("countryCode", e.target.value)}
            className="shrink-0 h-12 rounded-full border-none shadow-inner bg-black/5 dark:bg-black/20 text-foreground py-2 pl-4 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.label} value={c.code} className="bg-background text-foreground">{c.label}</option>
            ))}
          </select>
          <div className="relative flex-1 group">
            <Phone className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value.replace(/\D/g, ""))}
              className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
              maxLength={10}
              required
            />
          </div>
        </div>


        {isCentreRegistration && (
          <>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="text"
                placeholder="Coaching centre name"
                value={form.centreName}
                onChange={(e) => updateForm("centreName", e.target.value)}
                className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
                required
              />
            </div>

            <div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground transition-colors group-focus-within:text-primary">#</span>
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
                  className="h-12 rounded-full pl-9 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
                  required
                />
              </div>
              <p className="mt-2 px-2 text-xs font-medium text-muted-foreground/80 leading-relaxed">
                This code will be used by students to join your centre. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
          </>
        )}

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 8, incl. a letter & number)"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            className="h-12 rounded-full pl-11 pr-12 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
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

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => updateForm("confirmPassword", e.target.value)}
            className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
            required
          />
        </div>

        <p className="text-center text-xs font-medium text-muted-foreground/80 pt-2">
          By creating an account, you agree to our{" "}
          <Link href="/terms" target="_blank" className="font-bold text-primary hover:text-primary/80 transition-colors">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="font-bold text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>.
        </p>

        <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98] mt-2" size="xl" loading={loading}>
          {isCentreRegistration ? "Register Centre" : "Create Account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Log in
        </Link>
      </p>

      {!isCentreRegistration && (
        <p className="mt-4 text-center text-sm font-medium text-muted-foreground/80">
          Are you a coaching centre?{" "}
          <Link href="/register?role=centre" className="font-bold text-teal-500 hover:text-teal-400 transition-colors">
            Register as Centre
          </Link>
        </p>
      )}
    </div>
  );
}
