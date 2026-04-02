"use client";

// import { useState } from "react"; // UNCOMMENT when re-enabling payments
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // UNCOMMENT when re-enabling payments
import { Badge } from "@/components/ui/badge";
import { Crown, LogOut } from "lucide-react";
// import { Check, Zap } from "lucide-react"; // UNCOMMENT when re-enabling payments

/*
=====================================================================
COMMENTED OUT: Payment plans & upgrade logic — Uncomment after beta
=====================================================================
const PLANS = [
  { id: "VIP_30", name: "VIP 30 Days", price: 499, priceLabel: "₹499", period: "30 days",
    features: ["Unlimited practice", "AI scoring", "Full mock tests", "Weekly predictions"], popular: false },
  { id: "VIP_90", name: "VIP 90 Days", price: 999, priceLabel: "₹999", period: "90 days",
    features: ["Everything in VIP 30", "Priority support", "Templates library", "Score trend analysis"], popular: true },
  { id: "VIP_180", name: "VIP 180 Days", price: 1499, priceLabel: "₹1,499", period: "180 days",
    features: ["Everything in VIP 90", "Vocabulary builder", "Best value", "Download practice PDFs"], popular: false },
];
=====================================================================
*/

export default function SettingsPage() {
  const { user } = useAuth();
  // const [loadingPlan, setLoadingPlan] = useState<string | null>(null); // UNCOMMENT for payments
  // const [coupon, setCoupon] = useState(""); // UNCOMMENT for payments

  /*
  =====================================================================
  COMMENTED OUT: Razorpay upgrade handler — Uncomment after beta
  =====================================================================
  const handleUpgrade = async (planType: string) => {
    setLoadingPlan(planType);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, couponCode: coupon || undefined }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error); return; }
      const options = {
        key: data.data.keyId, amount: data.data.amount, currency: data.data.currency,
        name: "Prepfly", description: data.data.planLabel, order_id: data.data.orderId,
        prefill: { name: data.data.userName, email: data.data.userEmail },
        theme: { color: "#4F46E5" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) { alert("Payment successful!"); window.location.reload(); }
          else { alert("Payment verification failed."); }
        },
      };
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch { alert("Something went wrong."); }
    finally { setLoadingPlan(null); }
  };
  =====================================================================
  */

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Free Beta Banner */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-indigo-50">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
            <Crown className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Free Beta Access</h3>
            <p className="mt-1 text-sm text-gray-600">
              All features are <strong>completely free</strong> during our beta period.
              Practice speaking, writing, reading, listening — everything unlocked!
            </p>
          </div>
          <Badge className="shrink-0 bg-teal-600 text-white">FREE</Badge>
        </CardContent>
      </Card>

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
