"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Trash2, Mail, User } from "lucide-react";

interface Teacher { id: string; name: string; email: string; phone: string | null; createdAt: string; isActive: boolean }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchTeachers = () => {
    fetch("/api/centres/teachers").then(r => r.json()).then(d => { if (d.success) setTeachers(d.data); }).finally(() => setLoading(false));
  };
  useEffect(() => { fetchTeachers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    const res = await fetch("/api/centres/teachers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setTeachers(prev => [data.data, ...prev]);
      setForm({ name: "", email: "", phone: "" });
      setShowForm(false);
      setSuccess("Teacher added! They will receive login credentials via email.");
    } else { setError(data.error || "Failed to add teacher"); }
    setSubmitting(false);
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from your centre? They will lose access.`)) return;
    setRemoving(id);
    const res = await fetch("/api/centres/teachers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId: id }) });
    if ((await res.json()).success) setTeachers(prev => prev.filter(t => t.id !== id));
    setRemoving(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Teachers</h1>
          <p className="text-gray-500 dark:text-slate-400">Manage teaching staff for your centre</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus className="h-4 w-4" /> Add Teacher</Button>
      </div>

      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-300">{success}</div>}

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40">
          <CardContent className="p-5">
            {error && <p className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Full Name *</label>
                <Input placeholder="Priya Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Email *</label>
                <Input type="email" placeholder="teacher@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Phone</label>
                <Input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" loading={submitting}>Add Teacher</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">A temporary password will be sent to the teacher&apos;s email.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-gray-400" />
            {teachers.length === 0 ? "No Teachers Yet" : `Teachers (${teachers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : teachers.length === 0 ? (
            <div className="py-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-gray-500">Add teachers to help manage your students.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {teachers.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{t.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{t.email}</span>
                        {t.phone && <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Teacher</Badge>
                    <button onClick={() => handleRemove(t.id, t.name)} disabled={removing === t.id} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                      {removing === t.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
