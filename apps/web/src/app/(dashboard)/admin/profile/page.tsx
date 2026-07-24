"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";

interface CentreData {
  id: string; name: string; slug: string; logo: string | null; primaryColor: string;
  address: string | null; city: string | null; state: string | null;
  phone: string | null; email: string | null; website: string | null;
}

export default function CentreProfilePage() {
  const { user } = useAuth();
  const [centre, setCentre] = useState<CentreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", primaryColor: "#4F46E5", address: "", city: "", state: "", phone: "", email: "", website: "" });

  useEffect(() => {
    if (!user?.centreId) return;
    fetch(`/api/centres/${user.centreId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const c = data.data;
          setCentre(c);
          setForm({ name: c.name || "", primaryColor: c.primaryColor || "#4F46E5", address: c.address || "", city: c.city || "", state: c.state || "", phone: c.phone || "", email: c.email || "", website: c.website || "" });
        }
      })
      .finally(() => setLoading(false));
  }, [user?.centreId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/centres/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(data.error || "Save failed");
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Centre Profile</h1>
        <p className="text-base font-medium text-muted-foreground mt-2">Update your coaching centre information</p>
      </div>

      {centre && (
        <div className="flex items-center gap-4 rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 p-6 mb-6 hover:shadow-float transition-all duration-700 ease-fluid group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white text-xl font-extrabold shadow-inner group-hover:scale-105 transition-transform duration-700 ease-fluid" style={{ backgroundColor: form.primaryColor }}>
            {form.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{form.name}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Slug: <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md ml-1">{centre.slug}</span></p>
          </div>
          <Badge variant="secondary" className="ml-auto">Centre Admin</Badge>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</p>}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4" /> Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-bold"><Building2 className="h-5 w-5 text-primary" /> Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Centre Name *</label>
              <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Phone</label>
                <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                <Input type="email" className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="centre@email.com" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Website</label>
              <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcentre.com" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardHeader><CardTitle className="text-lg font-bold">Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Street Address</label>
              <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">City</label>
                <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Amritsar" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">State</label>
                <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Punjab" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardHeader><CardTitle className="text-lg font-bold">Branding</CardTitle></CardHeader>
          <CardContent>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-20 cursor-pointer rounded border" />
              <Input className="w-32 rounded-2xl border-none bg-background/40 py-2.5 px-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
              <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: form.primaryColor }} />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">This color will be used for your centre&apos;s branding on the platform.</p>
          </CardContent>
        </Card>

        <Button type="submit" loading={saving} size="lg" className="w-full sm:w-auto rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid px-10 font-bold tracking-wide text-md">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
