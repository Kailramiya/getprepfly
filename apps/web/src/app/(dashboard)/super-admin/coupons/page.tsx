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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Coupon Management</h1>
          <p className="text-gray-500 dark:text-slate-400">Create and manage discount codes for student plans</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Coupon
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40">
          <CardHeader>
            <CardTitle className="text-base">Create Coupon</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Code</label>
                <Input
                  placeholder="SUMMER50"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Discount %</label>
                <Input
                  type="number" min="1" max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Max Uses</label>
                <Input
                  type="number" min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Valid Until</label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" loading={submitting}>Create Coupon</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-16 text-center">
              <Tag className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-gray-500">No coupons yet. Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Discount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Usage</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Valid Until</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {coupons.map((c) => {
                    const expired = isExpired(c.validUntil);
                    const exhausted = c.usedCount >= c.maxUses;
                    const effective = c.isActive && !expired && !exhausted;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{c.code}</span>
                            <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                              {copied === c.code ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-700">{c.discountPercent}% off</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                          {c.usedCount} / {c.maxUses}
                          <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%` }} />
                          </div>
                        </td>
                        <td className={`px-4 py-3 ${expired ? "text-red-600 font-medium dark:text-red-400" : "text-gray-600 dark:text-slate-300"}`}>
                          {formatDate(c.validUntil)}
                          {expired && <span className="ml-1 text-xs">(expired)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={effective ? "success" : expired ? "destructive" : exhausted ? "warning" : "secondary"}>
                            {effective ? "Active" : expired ? "Expired" : exhausted ? "Exhausted" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => toggleActive(c.id, c.isActive)} className="text-gray-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400" title={c.isActive ? "Deactivate" : "Activate"}>
                              {c.isActive ? <ToggleRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <ToggleLeft className="h-5 w-5" />}
                            </button>
                            <button onClick={() => deleteCoupon(c.id, c.code)} className="text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400">
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
