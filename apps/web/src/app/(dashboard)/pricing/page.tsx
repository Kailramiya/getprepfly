"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, PenTool, BookOpen, Headphones, Check, Sparkles, Lock, Star,
} from "lucide-react";

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

type Duration = "1M" | "6M" | "1Y";

const DURATION_SUFFIX: Record<Duration, string> = { "1M": "", "6M": "_6M", "1Y": "_1Y" };
const DURATION_LABEL: Record<Duration, string>  = { "1M": "1 Month", "6M": "6 Months", "1Y": "1 Year" };
const DURATION_DAYS: Record<Duration, number>   = { "1M": 30, "6M": 180, "1Y": 365 };

const BASE_PLANS = [
  {
    baseId: "MODULE_SPEAKING",
    title: "Speaking Module",
    defaultPrice: { "1M": 199, "6M": 999, "1Y": 1799 },
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
    defaultPrice: { "1M": 199, "6M": 999, "1Y": 1799 },
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
    defaultPrice: { "1M": 199, "6M": 999, "1Y": 1799 },
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
    defaultPrice: { "1M": 199, "6M": 999, "1Y": 1799 },
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

  useEffect(() => {
    Promise.all([
      fetch("/api/access/me").then(r => r.json()),
      fetch("/api/pricing").then(r => r.json()),
    ]).then(([accessData, priceData]) => {
      if (accessData.success) setAccess(accessData.data);
      if (priceData.success) setLivePrices(priceData.data);
    }).finally(() => setLoading(false));
  }, []);

  const suffix = DURATION_SUFFIX[duration];

  const planId = (baseId: string) => baseId + suffix;

  const planPrice = (baseId: string, defaultRupees: number): number => {
    const key = planId(baseId);
    if (!livePrices) return defaultRupees;
    return Math.round((livePrices[key] ?? defaultRupees * 100) / 100);
  };

  const handlePurchase = async (id: string) => {
    setError("");
    setProcessing(id);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: id }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to start payment");
        setProcessing(null);
        return;
      }

      const { orderId, amount, currency, keyId, planLabel, userName, userEmail } = data.data;

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

  const durationOptions: Duration[] = ["1M", "6M", "1Y"];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Choose Your Plan</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
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

      {/* Duration toggle */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
          {durationOptions.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition ${
                duration === d
                  ? "bg-white text-gray-900 shadow dark:bg-slate-700 dark:text-slate-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {DURATION_LABEL[d]}
              {d !== "1M" && (
                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/50 dark:text-green-400">
                  {d === "6M" ? "Save 16%" : "Save 25%"}
                </span>
              )}
            </button>
          ))}
        </div>
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
        const modulePrice  = planPrice("MODULE_SPEAKING", BASE_PLANS[0].defaultPrice[duration]);
        const bundlePrice  = planPrice(bundleBaseId, { "1M": 599, "6M": 2999, "1Y": 4999 }[duration]);
        const separately   = modulePrice * 4;
        const save         = separately - bundlePrice;
        const owned        = access?.hasAllAccess ?? false;

        return (
          <Card className="relative overflow-hidden border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-xl dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/40">
            <div className="absolute -right-6 -top-6 rotate-12">
              <Badge className="bg-amber-500 text-white">
                <Sparkles className="mr-1 h-3 w-3" /> BEST VALUE
              </Badge>
            </div>
            <CardContent className="p-8">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Star className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">All Modules Bundle</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Everything unlocked — {DURATION_DAYS[duration]} days access
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 dark:text-slate-300">
                    {[
                      "All 20+ PTE question types",
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
                  <div className="flex items-baseline justify-center gap-1 lg:justify-end">
                    <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">₹{bundlePrice}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">/ {DURATION_LABEL[duration].toLowerCase()}</span>
                  </div>
                  {save > 0 && <p className="mt-1 text-xs font-medium text-green-600">Save ₹{save}</p>}
                  {owned ? (
                    <Button disabled className="mt-4 w-full gap-2 lg:w-auto" size="lg">
                      <Check className="h-4 w-4" /> Active until {formatExpiry("ALL")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(bundlePlanId)}
                      loading={processing === bundlePlanId}
                      className="mt-4 w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 lg:w-auto"
                      size="lg"
                    >
                      Unlock Everything — ₹{bundlePrice}
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
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">OR BUY INDIVIDUAL MODULES</p>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BASE_PLANS.map((plan) => {
            const Icon  = plan.icon;
            const id    = planId(plan.baseId);
            const owned = hasModuleAccess(plan.baseId);
            const expiry = formatExpiry(plan.baseId);
            const price = planPrice(plan.baseId, plan.defaultPrice[duration]);

            return (
              <Card key={plan.baseId} className={`relative transition ${owned ? "border-green-300 bg-green-50/40 dark:border-green-800 dark:bg-green-950/20" : "hover:shadow-lg dark:border-slate-700"}`}>
                <CardContent className="p-5">
                  {owned && (
                    <Badge className="absolute right-3 top-3 bg-green-600 text-white">
                      <Check className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  )}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${plan.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-slate-100">{plan.title}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">₹{price}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">/ {DURATION_LABEL[duration].toLowerCase()}</span>
                  </div>

                  <ul className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-slate-400">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {owned ? (
                    <div className="mt-4 rounded-md bg-white p-2 text-center text-xs text-green-700 dark:bg-slate-700 dark:text-green-300">
                      Active until {expiry}
                    </div>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(id)}
                      loading={processing === id}
                      className="mt-4 w-full"
                      variant="outline"
                    >
                      Buy for ₹{price}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Free Tier Info */}
      <Card className="border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
        <CardContent className="flex items-start gap-3 p-5">
          <Lock className="mt-0.5 h-5 w-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Free Tier</h3>
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
