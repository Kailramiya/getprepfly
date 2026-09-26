"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Phone, Building2, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { COUNTRY_CODES } from "@/lib/countries";

export default function CompleteProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    countryCode: "+91",
    phone: "",
    centreName: "",
    centreReferralCode: "",
    slugManuallyEdited: false,
  });

  const [isCentre, setIsCentre] = useState(false);

  useEffect(() => {
    // Read from cookies set during Google click
    const matchInvite = document.cookie.match(new RegExp("(^| )inviteToken=([^;]+)"));
    const matchRole = document.cookie.match(new RegExp("(^| )signupRole=([^;]+)"));
    
    if (matchRole && matchRole[2] === "centre") {
      setIsCentre(true);
    }
  }, []);

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
      if (field === "centreReferralCode") {
        next.slugManuallyEdited = value.length > 0;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
    }

    setLoading(true);

    try {
      const matchInvite = document.cookie.match(new RegExp("(^| )inviteToken=([^;]+)"));
      const inviteToken = matchInvite ? matchInvite[2] : undefined;

      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: isCentre ? "centre" : "student",
          centreName: isCentre ? form.centreName : undefined,
          centreReferralCode: isCentre ? form.centreReferralCode : undefined,
          inviteToken: inviteToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to complete profile.");
        return;
      }

      // Cleanup cookies
      document.cookie = "inviteToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "signupRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Force session refresh so profileComplete updates
      await updateSession();
      router.push("/dashboard");
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

      <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
        Almost there!
      </h2>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Please complete your profile to continue.
      </p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  <option key={c.label} value={c.code} className="bg-background text-foreground">
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <div className="h-14 rounded-xl border border-white/5 shadow-inner bg-background/50 backdrop-blur-md text-foreground py-2 pl-4 pr-3 text-base font-medium flex items-center justify-between pointer-events-none">
                <span>{COUNTRY_CODES.find((c) => c.code === form.countryCode)?.label.split(" ")[0]} {form.countryCode}</span>
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
          <p className="px-1 text-xs font-medium text-muted-foreground/80 leading-relaxed flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
            Used for exam reminders and account recovery
          </p>
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
                    updateForm("centreReferralCode", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
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

        <div className="pt-2">
          <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98]" size="xl" loading={loading}>
            Complete Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
