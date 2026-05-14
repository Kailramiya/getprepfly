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
        <h1 className="text-2xl font-bold text-gray-900">Centre Profile</h1>
        <p className="text-gray-500">Update your coaching centre information</p>
      </div>

      {centre && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white text-lg font-bold" style={{ backgroundColor: form.primaryColor }}>
            {form.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{form.name}</p>
            <p className="text-xs text-gray-500">Slug: <span className="font-mono">{centre.slug}</span></p>
          </div>
          <Badge variant="secondary" className="ml-auto">Centre Admin</Badge>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Centre Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="centre@email.com" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
              <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcentre.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Street Address</label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Amritsar" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Punjab" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
          <CardContent>
            <label className="mb-1 block text-sm font-medium text-gray-700">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-20 cursor-pointer rounded border" />
              <Input value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} className="w-32 font-mono text-sm" />
              <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: form.primaryColor }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">This color will be used for your centre&apos;s branding on the platform.</p>
          </CardContent>
        </Card>

        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
