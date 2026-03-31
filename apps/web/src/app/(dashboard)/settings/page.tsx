"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, LogOut } from "lucide-react";

const PLANS = [
  {
    id: "VIP_30",
    name: "VIP 30 Days",
    price: 499,
    priceLabel: "₹499",
    period: "30 days",
    features: ["Unlimited practice", "AI scoring (Speaking + Writing)", "Full mock tests", "Weekly predictions"],
    popular: false,
  },
  {
    id: "VIP_90",
    name: "VIP 90 Days",
    price: 999,
    priceLabel: "₹999",
    period: "90 days",
    features: ["Everything in VIP 30", "Priority support", "Templates library", "Score trend analysis"],
    popular: true,
  },
  {
    id: "VIP_180",
    name: "VIP 180 Days",
    price: 1499,
    priceLabel: "₹1,499",
    period: "180 days",
    features: ["Everything in VIP 90", "Vocabulary builder", "Best value — save 50%", "Download practice PDFs"],
    popular: false,
  },
];

export default function SettingsPage() {
  const { user, isPremium } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");

  const handleUpgrade = async (planType: string) => {
    setLoadingPlan(planType);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, couponCode: coupon || undefined }),
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to create order");
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: data.data.keyId,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "PTE Master",
        description: data.data.planLabel,
        order_id: data.data.orderId,
        prefill: {
          name: data.data.userName,
          email: data.data.userEmail,
        },
        theme: { color: "#4F46E5" },
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert("Payment successful! Your VIP plan is now active.");
            window.location.reload();
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Your Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant={isPremium ? "success" : "secondary"} className="text-sm">
              {user?.planType || "FREE"}
            </Badge>
            {isPremium && <span className="text-sm text-green-600">Active</span>}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      {!isPremium && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Upgrade to VIP</h2>

          {/* Coupon */}
          <div className="mb-6 flex max-w-sm items-center gap-2">
            <Input
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <Button variant="outline" size="sm">Apply</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "border-2 border-indigo-500 shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                    <span className="text-sm text-gray-500">/ {plan.period}</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-6 w-full gap-2 ${plan.popular ? "" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id)}
                    loading={loadingPlan === plan.id}
                  >
                    <Zap className="h-4 w-4" />
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>
          {user?.centreName && (
            <div>
              <p className="text-sm text-gray-500">Coaching Centre</p>
              <p className="font-medium text-gray-900">{user.centreName}</p>
            </div>
          )}
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
