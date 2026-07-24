"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, CheckCheck } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    discountPercent: "20",
    maxUses: "100",
    validUntil: "",
  });

  const fetchCoupons = async () => {
    const res = await fetch("/api/super-admin/coupons");
    const data = await res.json();
    if (data.success) setCoupons(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) => [data.data, ...prev]);
        setForm({ code: "", discountPercent: "20", maxUses: "100", validUntil: "" });
        setShowForm(false);
      } else {
        setError(data.error || "Failed to create coupon");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/super-admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    const data = await res.json();
    if (data.success) setCoupons((prev) => prev.map((c) => c.id === id ? data.data : c));
  };

  const deleteCoupon = async (id: string, code: string) => {
    const ok = await confirm({ description: `Delete coupon "${code}"? This cannot be undone.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    const res = await fetch(`/api/super-admin/coupons/${id}`, { method: "DELETE" });
    if ((await res.json()).success) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast("success", `Coupon "${code}" deleted`);
    } else {
      toast("error", "Failed to delete coupon");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Coupon Management</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">Create and manage discount codes for student plans</p>
        </div>
        <Button size="lg" onClick={() => setShowForm(!showForm)} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide">
          <Plus className="h-5 w-5" />
          New Coupon
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-indigo-500/10 backdrop-blur-xl ring-1 ring-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Create Coupon</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Code</label>
                <Input
                  className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                  placeholder="SUMMER50"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Discount %</label>
                <Input
                  className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                  type="number" min="1" max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Max Uses</label>
                <Input
                  className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                  type="number" min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Valid Until</label>
                <Input
                  className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-4 mt-2">
                <Button type="submit" size="lg" loading={submitting} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid font-bold tracking-wide">Create Coupon</Button>
                <Button type="button" size="lg" variant="outline" onClick={() => { setShowForm(false); setError(""); }} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 font-bold tracking-wide">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><Tag className="h-10 w-10 text-primary" /></div>
              <p className="text-lg font-bold text-foreground">No coupons yet.</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20 text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="px-6 py-4 text-left font-bold">Code</th>
                    <th className="px-6 py-4 text-left font-bold">Discount</th>
                    <th className="px-6 py-4 text-left font-bold">Usage</th>
                    <th className="px-6 py-4 text-left font-bold">Valid Until</th>
                    <th className="px-6 py-4 text-left font-bold">Status</th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {coupons.map((c) => {
                    const expired = isExpired(c.validUntil);
                    const exhausted = c.usedCount >= c.maxUses;
                    const effective = c.isActive && !expired && !exhausted;
                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors duration-500 ease-fluid group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold text-primary">{c.code}</span>
                            <button onClick={() => copyCode(c.code)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 transition-all duration-300 shadow-inner">
                              {copied === c.code ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-green-400 text-base">{c.discountPercent}% off</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {c.usedCount} / {c.maxUses}
                          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%` }} />
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${expired ? "text-red-400 font-bold" : "text-foreground"}`}>
                          {formatDate(c.validUntil)}
                          {expired && <span className="ml-1 text-xs opacity-80">(expired)</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={effective ? "success" : expired ? "destructive" : exhausted ? "warning" : "secondary"} className="px-3 py-1 font-bold">
                            {effective ? "Active" : expired ? "Expired" : exhausted ? "Exhausted" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => toggleActive(c.id, c.isActive)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100" title={c.isActive ? "Deactivate" : "Activate"}>
                              {c.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                            </button>
                            <button onClick={() => deleteCoupon(c.id, c.code)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
