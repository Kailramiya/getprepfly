"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic, PenTool, BookOpen, Headphones, Check, Sparkles, Lock, Star, Tag, X, CreditCard,
} from "lucide-react";
import { DEFAULT_PRICES } from "@/lib/pricing-defaults";

declare global {
  interface Window { Razorpay: any }
}

interface AccessData {
  hasAllAccess: boolean;
  modules: string[];
  expiresAt: Record<string, string>;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  trialExpired?: boolean;
  freeSpeakingScoringsRemaining?: number | null;
}

type Duration = "1M" | "3M" | "6M" | "1Y";

const DURATION_SUFFIX: Record<Duration, string> = { "1M": "", "3M": "_3M", "6M": "_6M", "1Y": "_1Y" };
const DURATION_LABEL: Record<Duration, string>  = { "1M": "1 Month", "3M": "3 Months", "6M": "6 Months", "1Y": "1 Year" };
const DURATION_DAYS: Record<Duration, number>   = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

// Prices come from DEFAULT_PRICES (/api/pricing overrides on top) — never a
// second hardcoded table here. A page-local copy of the same numbers is
// exactly what caused the admin pricing page and the billing page to drift
// out of sync with reality elsewhere in this app.
const BASE_PLANS = [
  {
    baseId: "MODULE_SPEAKING",
    title: "Speaking Module",
    icon: Mic,
    color: "from-teal-500 to-teal-600",
    features: [
      "All speaking questions unlocked",
      "Read Aloud, Repeat Sentence, Describe Image",
      "Retell Lecture, Answer Short Question",
      "Respond to Situation",
      "Audio recording + AI scoring",
    ],
  },
  {
    baseId: "MODULE_WRITING",
    title: "Writing Module",
    icon: PenTool,
    color: "from-blue-500 to-blue-600",
    features: [
      "All writing questions unlocked",
      "Write Essay + Summarize Written Text",
      "AI grammar + vocabulary feedback",
      "Model answers + templates",
    ],
  },
  {
    baseId: "MODULE_READING",
    title: "Reading Module",
    icon: BookOpen,
    color: "from-purple-500 to-purple-600",
    features: [
      "All reading questions unlocked",
      "MCQ Single & Multiple",
      "Reorder Paragraphs",
      "Fill in the Blanks (Drag + Dropdown)",
    ],
  },
  {
    baseId: "MODULE_LISTENING",
    title: "Listening Module",
    icon: Headphones,
    color: "from-orange-500 to-orange-600",
    features: [
      "All listening questions unlocked",
      "Write from Dictation, Summarize Spoken Text",
      "Fill Blanks + MCQ + Highlight Summary",
      "Unlimited audio replays",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState<Duration>("1M");
  const [livePrices, setLivePrices] = useState<Record<string, number> | null>(null);

  // Coupon: input the student types, and the last-checked result for it.
  const [couponInput, setCouponInput] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      import("@/hooks/use-access").then(m => m.getSharedAccess()),
      fetch("/api/pricing").then(r => r.json()),
    ]).then(([accessData, priceData]) => {
      if (accessData.success) {
        setAccess(accessData.data);
      } else if (accessData.error && accessData.error !== "Unauthorized") {
        setError(accessData.error);
      }

      if (priceData.success) {
        setLivePrices(priceData.data);
      } else if (priceData.error) {
        setError(priceData.error);
      }
    }).catch(err => {
      console.error(err);
    }).finally(() => setLoading(false));
  }, []);

  const suffix = DURATION_SUFFIX[duration];

  const planId = (baseId: string) => baseId + suffix;

  // Rupees for a plan: live DB-overridden price if loaded, else the real
  // default from pricing-defaults.ts — the same source /api/pricing itself
  // falls back to, so this can never show a different number than checkout
  // will actually charge.
  const planPrice = (baseId: string): number => {
    const key = planId(baseId);
    const paise = livePrices?.[key] ?? DEFAULT_PRICES[key]?.amount ?? 0;
    return Math.round(paise / 100);
  };

  const discounted = (rupees: number): number =>
    coupon ? Math.round(rupees * (1 - coupon.discountPercent / 100)) : rupees;

  const checkCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponMsg(null);
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success && data.data.valid) {
        setCoupon({ code: code.toUpperCase(), discountPercent: data.data.discountPercent });
        setCouponMsg({ ok: true, text: `${data.data.discountPercent}% off applied` });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: data.data?.reason || "Invalid coupon code" });
      }
    } catch {
      setCoupon(null);
      setCouponMsg({ ok: false, text: "Could not check that code. Please try again." });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponMsg(null);
  };

  const handlePurchase = async (id: string) => {
    setError("");
    setProcessing(id);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: id, couponCode: coupon?.code }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "Unauthorized" || data.error === "unauthorized") {
          router.push("/register");
          return;
        }
        setError(data.error || "Failed to start payment");
        setProcessing(null);
        return;
      }

      // The coupon could have become invalid between checking it and buying
      // (e.g. someone else used the last redemption) — create-order already
      // ignored it and charged full price; tell the student why.
      if (coupon && data.data.couponError) {
        setCoupon(null);
        setCouponMsg({ ok: false, text: data.data.couponError });
      }

      const { orderId, amount, currency, keyId, planLabel, userName, userEmail, isFreeBypass } = data.data;

      if (isFreeBypass) {
        alert("✓ Payment successful! Access unlocked.");
        router.refresh();
        window.location.reload();
        return;
      }

      if (!window.Razorpay) {
        setError("Payment library not loaded. Please refresh and try again.");
        setProcessing(null);
        return;
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "PrepFly",
        description: planLabel,
        order_id: orderId,
        prefill: { name: userName, email: userEmail },
        theme: { color: "#0d9488" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert("✓ Payment successful! Access unlocked.");
            router.refresh();
            window.location.reload();
          } else {
            setError(verifyData.error || "Payment verification failed. Contact support with your payment ID.");
          }
          setProcessing(null);
        },
        modal: { ondismiss: () => setProcessing(null) },
      });

      razorpay.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(null);
    }
  };

  const hasModuleAccess = (baseId: string): boolean => {
    if (!access) return false;
    if (access.hasAllAccess) return true;
    const section = baseId.replace("MODULE_", "");
    return access.modules.includes(section);
  };

  const formatExpiry = (key: string): string | null => {
    if (!access) return null;
    const section = key === "ALL" ? "ALL" : key.replace("MODULE_", "");
    const expiry = access.expiresAt[section];
    if (!expiry) return null;
    return new Date(expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const durationOptions: Duration[] = ["1M", "3M", "6M", "1Y"];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-32">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Header */}
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-background p-8 text-center shadow-glass dark:shadow-glass-dark ring-1 ring-foreground/10 sm:p-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 dark:from-indigo-900/40 via-background to-background" />
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
          <CreditCard className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Choose Your Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Unlock premium practice questions with AI-powered scoring
        </p>
        {access?.isTrial && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            Free Trial — full access until {formatExpiry("ALL")}
          </div>
        )}
        {access?.hasAllAccess && !access?.isTrial && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
            <Check className="h-4 w-4" />
            You have full access until {formatExpiry("ALL")}
          </div>
        )}
        {access?.trialExpired && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <Lock className="h-4 w-4" />
            Trial expired. Unlock modules to continue.
          </div>
        )}
      </div>

      {/* Duration toggle — grid on mobile so badges never get squeezed
          illegible on narrow screens, single pill row from sm: up. */}
      <div className="mx-auto w-full max-w-xl">
        <div className="grid grid-cols-2 gap-2 rounded-[1.75rem] bg-background/50 backdrop-blur-xl ring-1 ring-white/10 p-2 shadow-glass sm:flex sm:items-center sm:justify-center sm:gap-1.5 sm:rounded-full sm:p-1.5">
          {durationOptions.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-500 ease-fluid sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-5 sm:py-2 ${
                duration === d
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
              }`}
            >
              <span>{DURATION_LABEL[d]}</span>
              {d !== "1M" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${
                    duration === d
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                  }`}
                >
                  {d === "3M" ? "Most Popular" : d === "6M" ? "Save 25%" : "Save 37%"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Coupon */}
      <div className="mx-auto max-w-sm">
        {coupon ? (
          <div className="flex items-center justify-between gap-3 rounded-full bg-green-500/10 px-4 py-2.5 ring-1 ring-green-500/20">
            <span className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400">
              <Tag className="h-4 w-4" /> {coupon.code} — {coupon.discountPercent}% off
            </span>
            <button onClick={clearCoupon} className="rounded-full p-1 text-green-700/70 hover:bg-green-500/20 dark:text-green-400/70">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Have a coupon code?"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && checkCoupon()}
                className="rounded-full pl-10 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={checkCoupon} loading={checkingCoupon} disabled={!couponInput.trim()} className="rounded-full shrink-0">
              Apply
            </Button>
          </div>
        )}
        {couponMsg && !coupon && (
          <p className={`mt-2 text-center text-xs font-medium ${couponMsg.ok ? "text-green-600" : "text-red-500"}`}>{couponMsg.text}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* All Modules Bundle - Featured */}
      {(() => {
        const bundleBaseId = "ALL_MODULES";
        const bundlePlanId = planId(bundleBaseId);
        const modulePrice  = planPrice("MODULE_SPEAKING");
        const bundlePrice  = planPrice(bundleBaseId);
        const finalPrice   = discounted(bundlePrice);
        const separately   = modulePrice * 4;
        const save         = separately - finalPrice;
        const owned        = access?.hasAllAccess ?? false;

        return (
          <Card className="relative isolate overflow-hidden rounded-[2rem] border-none shadow-glass bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent backdrop-blur-xl ring-2 ring-indigo-500/30 group transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float">
            <div className="absolute -top-16 -left-16 -z-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl transition-transform duration-700 ease-fluid group-hover:scale-125" />
            <div className="absolute -bottom-16 -right-16 -z-10 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl transition-transform duration-700 ease-fluid group-hover:scale-125" />
            <div className="absolute inset-0 bg-black/5 mix-blend-overlay pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-fluid" />
            <div className="absolute -right-6 -top-6 rotate-12 z-10">
              <Badge className="bg-amber-500 text-white shadow-md border-none">
                <Sparkles className="mr-1 h-3 w-3" /> BEST VALUE
              </Badge>
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Star className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">All Modules Bundle</h2>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Everything unlocked — {DURATION_DAYS[duration]} days access
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 dark:text-slate-300">
                    {[
                      "All 22 PTE question types",
                      "Unlimited practice in all 4 sections",
                      "AI-powered scoring & feedback",
                      "Model answers + templates",
                      "Mock tests included",
                      "Priority support",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center lg:text-right">
                  <div className="mb-1 text-xs font-medium text-gray-500 line-through dark:text-slate-400">
                    ₹{separately} separately
                  </div>
                  <div className="flex items-baseline justify-center gap-2 lg:justify-end">
                    {coupon && <span className="text-lg font-medium text-gray-400 line-through dark:text-slate-500">₹{bundlePrice}</span>}
                    <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">₹{finalPrice}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">/ {DURATION_LABEL[duration].toLowerCase()}</span>
                  </div>
                  {save > 0 && <p className="mt-1 text-xs font-medium text-green-600">Save ₹{save}</p>}
                  {owned ? (
                    <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-50 px-6 py-3 text-sm font-semibold text-green-700 lg:w-auto dark:bg-green-950/30 dark:text-green-400">
                      <Check className="h-4 w-4" /> Active until {formatExpiry("ALL")}
                    </div>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(bundlePlanId)}
                      loading={processing === bundlePlanId}
                      className="mt-4 w-full gap-2 rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-gradient-to-r from-indigo-600 to-purple-600 lg:w-auto"
                      size="lg"
                    >
                      Unlock Everything — ₹{finalPrice}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Single Module Options */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Or buy individual modules</p>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BASE_PLANS.map((plan) => {
            const Icon  = plan.icon;
            const id    = planId(plan.baseId);
            const owned = hasModuleAccess(plan.baseId);
            const price = planPrice(plan.baseId);
            const finalPrice = discounted(price);

            return (
              <Card key={plan.baseId} className={`relative rounded-[2rem] border-none shadow-glass backdrop-blur-xl ring-1 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float overflow-hidden ${owned ? "bg-green-500/10 ring-green-500/30" : "bg-background/50 ring-white/10"}`}>
                <CardContent className="p-5">
                  {owned && (
                    <Badge className="absolute right-3 top-3 bg-green-500 text-white shadow-sm border-none">
                      <Check className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  )}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.color} text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-slate-100">{plan.title}</h3>
                  {owned ? (
                    formatExpiry(plan.baseId) && (
                      <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">
                        Active until {formatExpiry(plan.baseId)}
                      </p>
                    )
                  ) : (
                    <div className="mt-2 flex items-baseline gap-1.5">
                      {coupon && <span className="text-sm font-medium text-gray-400 line-through dark:text-slate-500">₹{price}</span>}
                      <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">₹{finalPrice}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">/ {DURATION_LABEL[duration].toLowerCase()}</span>
                    </div>
                  )}

                  <ul className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-slate-400">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {!owned && (
                    <Button
                      onClick={() => handlePurchase(id)}
                      loading={processing === id}
                      className="mt-4 w-full rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10"
                      variant="outline"
                    >
                      Buy for ₹{finalPrice}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Free Tier Info */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Free Tier</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Free users can practice with questions that coaching centres have publicly shared. Purchase a module to unlock the full question bank and AI-powered feedback for that section.
            </p>
            {access && !access.hasAllAccess && access.modules.length === 0 && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                You are currently on the free tier.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-sm text-gray-500">Loading your access details...</p>}

      <p className="text-center text-xs text-gray-400 dark:text-slate-500">
        By purchasing, you agree to our{" "}
        <Link href="/terms" target="_blank" className="underline hover:text-gray-600 dark:hover:text-slate-300">Terms</Link>
        {" "}and{" "}
        <Link href="/refund-policy" target="_blank" className="underline hover:text-gray-600 dark:hover:text-slate-300">Refund &amp; Cancellation Policy</Link>.
        Payments are processed securely by Razorpay.
      </p>
    </div>
  );
}
