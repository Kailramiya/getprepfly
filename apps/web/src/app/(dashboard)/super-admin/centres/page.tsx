"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, Globe, Hash, Copy, CheckCheck, Crown, Calendar } from "lucide-react";

interface Centre {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  email: string | null;
  isActive: boolean;
  isPremiumCentre?: boolean;
  premiumUntil?: string | null;
  createdAt: string;
  _count: { users: number };
}

export default function SuperAdminCentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const togglePremium = async (centre: Centre) => {
    const newStatus = !centre.isPremiumCentre;
    const action = newStatus ? "grant FREE premium access" : "remove premium access";
    if (!confirm(`Are you sure you want to ${action} for "${centre.name}"?`)) return;

    let premiumUntil: string | null = null;
    if (newStatus) {
      const durationStr = prompt("How long? Enter number of days (leave empty for lifetime):", "365");
      if (durationStr && !isNaN(parseInt(durationStr))) {
        const days = parseInt(durationStr);
        premiumUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    setTogglingId(centre.id);
    try {
      const res = await fetch(`/api/centres/${centre.id}/premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremiumCentre: newStatus, premiumUntil }),
      });
      const data = await res.json();
      if (data.success) {
        setCentres((prev) =>
          prev.map((c) =>
            c.id === centre.id
              ? { ...c, isPremiumCentre: newStatus, premiumUntil }
              : c
          )
        );
        alert(data.message);
      } else {
        alert(data.error || "Failed to update premium status");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    const fetchCentres = async () => {
      const res = await fetch("/api/centres");
      const data = await res.json();
      if (data.success) setCentres(data.data);
      setLoading(false);
    };
    fetchCentres();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">All Centres</h1>
          <p className="text-gray-500 dark:text-slate-400">{centres.length} coaching centres registered</p>
        </div>
        <Button className="rounded-full shadow-sm hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2"><Plus className="h-4 w-4" /> Add Centre</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : centres.length === 0 ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No centres registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centres.map((centre) => (
            <Card key={centre.id} className="relative overflow-hidden rounded-[2rem] border-none shadow-glass backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-2 hover:shadow-float transition-all duration-700 ease-fluid bg-background/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20">
                      <Globe className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{centre.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {centre.city || centre.state ? `${centre.city || ""}${centre.city && centre.state ? ", " : ""}${centre.state || ""}` : "Location not set"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={centre.isActive ? "success" : "destructive"}>
                    {centre.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Referral Code */}
                <div className="mt-4 rounded-2xl border-none shadow-inner bg-teal-500/10 p-3 ring-1 ring-teal-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                        Referral Code
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-sm font-bold text-teal-800 dark:text-teal-300">
                        <Hash className="h-3.5 w-3.5" />
                        {centre.slug || "not-set"}
                      </p>
                    </div>
                    {centre.slug && (
                      <button
                        onClick={() => copySlug(centre.slug)}
                        className="flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-xs text-teal-500 hover:bg-teal-500/20 transition-all duration-300"
                      >
                        {copiedSlug === centre.slug ? (
                          <>
                            <CheckCheck className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {centre._count.users} students
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    Joined {new Date(centre.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {/* Premium Status */}
                <div className={`mt-3 rounded-2xl border-none shadow-inner p-3 ring-1 ${
                  centre.isPremiumCentre
                    ? "bg-amber-500/10 ring-amber-500/20"
                    : "bg-background/40 ring-white/10"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className={`h-4 w-4 ${centre.isPremiumCentre ? "text-amber-600" : "text-gray-400"}`} />
                      <div>
                        <p className={`text-xs font-semibold uppercase ${
                          centre.isPremiumCentre ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-slate-400"
                        }`}>
                          {centre.isPremiumCentre ? "Premium Centre" : "Regular Centre"}
                        </p>
                        {centre.isPremiumCentre && centre.premiumUntil && (
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-600">
                            <Calendar className="h-3 w-3" />
                            Until {new Date(centre.premiumUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {centre.isPremiumCentre && !centre.premiumUntil && (
                          <p className="mt-0.5 text-[10px] text-amber-600">Lifetime access</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePremium(centre)}
                      disabled={togglingId === centre.id}
                      className={`rounded-full shadow-sm hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent ${centre.isPremiumCentre ? "border-red-500/30 text-red-500 hover:bg-red-500/10" : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"}`}
                    >
                      {togglingId === centre.id
                        ? "..."
                        : centre.isPremiumCentre
                          ? "Remove"
                          : "Grant Free Access"}
                    </Button>
                  </div>
                  {centre.isPremiumCentre && (
                    <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                      ⭐ All students get all modules FREE
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
