"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, PenTool, BookOpen, Headphones, Check, Sparkles, Lock, Star,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
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

const PLANS = [
  {
    id: "MODULE_SPEAKING",
    title: "Speaking Module",
    price: 99,
    icon: Mic,
    color: "from-teal-500 to-teal-600",
    features: [
      "All speaking questions unlocked",
      "Read Aloud, Repeat Sentence, Describe Image",
      "Retell Lecture, Answer Short Question",
      "Respond to Situation",
      "Audio recording + AI scoring",
      "30 days access",
    ],
  },
  {
    id: "MODULE_WRITING",
    title: "Writing Module",
    price: 99,
    icon: PenTool,
    color: "from-blue-500 to-blue-600",
    features: [
      "All writing questions unlocked",
      "Write Essay + Summarize Written Text",
      "AI grammar + vocabulary feedback",
      "Model answers + templates",
      "30 days access",
    ],
  },
  {
    id: "MODULE_READING",
    title: "Reading Module",
    price: 99,
    icon: BookOpen,
    color: "from-purple-500 to-purple-600",
    features: [
      "All reading questions unlocked",
      "MCQ Single & Multiple",
      "Reorder Paragraphs",
      "Fill in the Blanks (Drag + Dropdown)",
      "30 days access",
    ],
  },
  {
    id: "MODULE_LISTENING",
    title: "Listening Module",
    price: 99,
    icon: Headphones,
    color: "from-orange-500 to-orange-600",
    features: [
      "All listening questions unlocked",
      "Write from Dictation, Summarize Spoken Text",
      "Fill Blanks + MCQ + Highlight Summary",
      "Unlimited audio replays",
      "30 days access",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/access/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAccess(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (planId: string) => {
    setError("");
    setProcessing(planId);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planId }),
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
        prefill: {
          name: userName,
          email: userEmail,
        },
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
        modal: {
          ondismiss: () => {
            setProcessing(null);
          },
        },
      });

      razorpay.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(null);
    }
  };

  const hasAccess = (planId: string): boolean => {
    if (!access) return false;
    if (access.hasAllAccess) return true;
    if (planId === "ALL_MODULES") return access.hasAllAccess;
    const section = planId.replace("MODULE_", "");
    return access.modules.includes(section);
  };

  const formatExpiry = (planId: string): string | null => {
    if (!access) return null;
    const section = planId === "ALL_MODULES" ? "ALL" : planId.replace("MODULE_", "");
    const expiry = access.expiresAt[section];
    if (!expiry) return null;
    return new Date(expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

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
            Free Trial — full access until {formatExpiry("ALL_MODULES")}
          </div>
        )}
        {access?.hasAllAccess && !access?.isTrial && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
            <Check className="h-4 w-4" />
            You have full access until {formatExpiry("ALL_MODULES")}
          </div>
        )}
        {access?.trialExpired && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <Lock className="h-4 w-4" />
            Trial expired. Unlock modules to continue.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* All Modules Bundle - Featured */}
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
                  <p className="text-sm text-gray-600 dark:text-slate-400">Everything unlocked — 30 days access</p>
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
              <div className="mb-1 text-xs font-medium text-gray-500 line-through dark:text-slate-400">₹396 separately</div>
              <div className="flex items-baseline justify-center gap-1 lg:justify-end">
                <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">₹299</span>
                <span className="text-sm text-gray-500 dark:text-slate-400">/ 30 days</span>
              </div>
              <p className="mt-1 text-xs text-green-600 font-medium">Save ₹97</p>
              {hasAccess("ALL_MODULES") ? (
                <Button disabled className="mt-4 w-full gap-2 lg:w-auto" size="lg">
                  <Check className="h-4 w-4" /> Active until {formatExpiry("ALL_MODULES")}
                </Button>
              ) : (
                <Button
                  onClick={() => handlePurchase("ALL_MODULES")}
                  loading={processing === "ALL_MODULES"}
                  className="mt-4 w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 lg:w-auto"
                  size="lg"
                >
                  Unlock Everything for ₹299
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Module Options */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">OR BUY INDIVIDUAL MODULES</p>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const owned = hasAccess(plan.id);
            const expiry = formatExpiry(plan.id);
            return (
              <Card key={plan.id} className={`relative transition ${owned ? "border-green-300 bg-green-50/40" : "hover:shadow-lg"}`}>
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
                    <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">₹{plan.price}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">/ 30 days</span>
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
                      onClick={() => handlePurchase(plan.id)}
                      loading={processing === plan.id}
                      className="mt-4 w-full"
                      variant="outline"
                    >
                      Buy for ₹{plan.price}
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
              <p className="mt-2 text-sm text-amber-700">
                You are currently on the free tier.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-sm text-gray-500">Loading your access details...</p>}
    </div>
  );
}
