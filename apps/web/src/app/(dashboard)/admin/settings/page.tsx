"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Crown, AlertTriangle,
  Zap, Shield, Loader2, CreditCard,
} from "lucide-react";

declare global { interface Window { Razorpay: any } }

const PLANS = [
  {
    key: "CENTRE_STARTER",
    name: "Starter",
    price: 2999,
    maxStudents: 50,
    color: "from-teal-500 to-teal-600",
    badge: null,
    features: [
      "Up to 50 students",
      "All 4 modules for all students",
      "AI scoring — all question types",
      "Student progress tracking",
      "Batch management",
    ],
  },
  {
    key: "CENTRE_GROWTH",
    name: "Growth",
    price: 6999,
    maxStudents: 150,
    color: "from-indigo-500 to-purple-600",
    badge: "Most Popular",
    features: [
      "Up to 150 students",
      "All 4 modules for all students",
      "AI scoring — all question types",
      "Advanced analytics dashboard",
      "Batch management + leaderboard",
      "Priority support",
    ],
  },
  {
    key: "CENTRE_PRO",
    name: "Pro",
    price: 14999,
    maxStudents: 500,
    color: "from-amber-500 to-orange-600",
    badge: "Best Value",
    features: [
      "Up to 500 students",
      "All 4 modules for all students",
      "AI scoring — all question types",
      "Full analytics + centre branding",
      "Unlimited batches",
      "Dedicated support",
    ],
  },
];

interface SubData {
  centre: {
    name: string;
    isPremiumCentre: boolean;
    premiumUntil: string | null;
    isActive: boolean;
    daysLeft: number;
    studentCount: number;
  } | null;
  plan: {
    planName: string;
    maxStudents: number;
    monthlyPrice: number;
    status: string;
    endDate: string | null;
  } | null;
  history: Array<{
    id: string;
    planName: string;
    monthlyPrice: number;
    status: string;
    startDate: string;
    endDate: string | null;
    payment: { amount: number; razorpayPaymentId: string | null; createdAt: string } | null;
  }>;
}

export default function AdminBillingPage() {
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/centres/subscription")
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubscribe = async (planKey: string, planName: string) => {
    setError("");
    setSuccessMsg("");
    setProcessing(planKey);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planKey }),
      });
      const orderData = await res.json();
      if (!orderData.success) {
        setError(orderData.error || "Failed to create order");
        setProcessing(null);
        return;
      }

      const { orderId, amount, currency, keyId, planLabel, userName, userEmail } = orderData.data;

      if (!window.Razorpay) {
        setError("Payment library not loaded. Please refresh.");
        setProcessing(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Prepfly",
        description: planLabel,
        order_id: orderId,
        prefill: { name: userName, email: userEmail },
        theme: { color: "#4F46E5" },
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
            setSuccessMsg(`${planName} activated! All your students now have full access.`);
            fetchData();
          } else {
            setError(verifyData.error || "Payment verification failed. Contact support.");
          }
          setProcessing(null);
        },
        modal: { ondismiss: () => setProcessing(null) },
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const formatAmount = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { centre, plan, history } = data || { centre: null, plan: null, history: [] };
  const currentPlanKey = plan ? PLANS.find((p) => p.name === plan.planName.replace(" Plan", ""))?.key : null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-500">Manage your coaching centre plan</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            {successMsg}
          </div>
        )}

        {/* Current Plan Status */}
        <Card className={centre?.isActive ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${centre?.isActive ? "bg-green-600" : "bg-amber-500"} text-white`}>
                  {centre?.isActive ? <Crown className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {centre?.isActive ? plan?.planName || "Premium Active" : "No Active Plan"}
                    </h2>
                    <Badge variant={centre?.isActive ? "success" : "warning"}>
                      {centre?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {centre?.isActive && centre.premiumUntil ? (
                    <p className="text-sm text-gray-600">
                      Expires {formatDate(centre.premiumUntil)} · {centre.daysLeft} days left
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Subscribe to give all your students full access to Prepfly
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{centre?.studentCount ?? 0}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                {plan && (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{plan.maxStudents}</p>
                    <p className="text-xs text-gray-500">Max Allowed</p>
                  </div>
                )}
              </div>
            </div>

            {centre?.isActive && centre.daysLeft <= 7 && (
              <div className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
                Your plan expires in {centre.daysLeft} day{centre.daysLeft === 1 ? "" : "s"}. Renew now to avoid interruption for your students.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Cards */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {centre?.isActive ? "Renew or Upgrade Your Plan" : "Choose a Plan"}
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrent = currentPlanKey === p.key && centre?.isActive;
              return (
                <Card
                  key={p.key}
                  className={`relative overflow-hidden transition ${
                    isCurrent ? "border-2 border-indigo-500 shadow-lg" : "border-gray-200"
                  }`}
                >
                  {p.badge && (
                    <div className="absolute right-4 top-4">
                      <Badge className="bg-indigo-600 text-white">{p.badge}</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute left-4 top-4">
                      <Badge variant="success">Current Plan</Badge>
                    </div>
                  )}

                  <div className={`h-2 w-full bg-gradient-to-r ${p.color}`} />

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">₹{p.price.toLocaleString("en-IN")}</span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Up to {p.maxStudents} students</p>

                    <ul className="mt-5 space-y-2.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`mt-6 w-full bg-gradient-to-r ${p.color} text-white`}
                      onClick={() => handleSubscribe(p.key, p.name)}
                      disabled={!!processing}
                      loading={processing === p.key}
                    >
                      {processing === p.key
                        ? "Processing..."
                        : isCurrent
                          ? "Renew Plan"
                          : centre?.isActive
                            ? "Switch to " + p.name
                            : "Subscribe — ₹" + p.price.toLocaleString("en-IN")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <Card className="border-indigo-100 bg-indigo-50">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-indigo-900">How centre plans work</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: CreditCard, title: "Subscribe", desc: "Choose a plan and pay via Razorpay — UPI, card, or net banking" },
                { icon: Zap, title: "Instant activation", desc: "All your enrolled students immediately get full access to all 4 modules" },
                { icon: Shield, title: "Auto-renewal", desc: "Renew any time before expiry to extend without interruption" },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <item.icon className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">{item.title}</p>
                    <p className="text-xs text-indigo-700 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        {history.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Billing History</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Start</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Expiry</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Payment ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{h.planName}</td>
                          <td className="px-4 py-3 text-gray-700">{formatAmount(h.monthlyPrice)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(h.startDate)}</td>
                          <td className="px-4 py-3 text-gray-600">{h.endDate ? formatDate(h.endDate) : "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={h.status === "ACTIVE" ? "success" : "secondary"}>
                              {h.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">
                            {h.payment?.razorpayPaymentId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
