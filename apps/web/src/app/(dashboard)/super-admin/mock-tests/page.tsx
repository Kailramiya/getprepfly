"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, X, Mic, PenTool, BookOpen, Headphones, Layers, Settings2, Gift } from "lucide-react";

interface MockTemplate {
  id: string;
  title: string;
  mockType: string;
  section: string | null;
  isFree: boolean;
  createdAt: string;
  _count: { questions: number };
}

const SECTION_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  SPEAKING:  { label: "Speaking",  icon: Mic,        color: "text-teal-600",   bg: "bg-teal-100 dark:bg-teal-950/50" },
  WRITING:   { label: "Writing",   icon: PenTool,    color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-950/50" },
  READING:   { label: "Reading",   icon: BookOpen,   color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-950/50" },
  LISTENING: { label: "Listening", icon: Headphones, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-950/50" },
};

export default function SuperAdminMockTestsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [mockType, setMockType] = useState<"FULL" | "SECTIONAL">("FULL");
  const [section, setSection] = useState("SPEAKING");
  const [isFree, setIsFree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/mock-tests");
    const data = await res.json();
    if (data.success) setTemplates(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required");
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/mock-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mockType, section: mockType === "SECTIONAL" ? section : undefined, isFree }),
      });
      let data: any;
      try { data = await res.json(); } catch { data = {}; }
      if (data.success) {
        setTemplates(prev => [data.data, ...prev]);
        setTitle("");
        setMockType("FULL");
        setSection("SPEAKING");
        setIsFree(false);
        setShowForm(false);
      } else {
        setError(data.error || `Server error (${res.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/super-admin/mock-tests?id=${id}`, { method: "DELETE" });
    } catch {
      fetchTemplates();
    }
  };

  const fullCount = templates.filter(t => t.mockType === "FULL").length;
  const sectionalCount = templates.filter(t => t.mockType === "SECTIONAL").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mock Tests</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Create global mock test templates available to all students
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Templates", value: templates.length, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
          { label: "Full Mock Tests", value: fullCount, icon: Layers, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
          { label: "Sectional Tests", value: sectionalCount, icon: Mic, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500 dark:text-slate-400">No mock test templates yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Create your first template — students will see it on their Mock Test page</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {templates.map(t => {
                const isFull = t.mockType === "FULL";
                const meta = !isFull && t.section ? SECTION_META[t.section] : null;
                const Icon = meta?.icon ?? Layers;
                const iconBg = meta?.bg ?? "bg-indigo-100 dark:bg-indigo-950/50";
                const iconColor = meta?.color ?? "text-indigo-600";

                return (
                  <div key={t.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{t.title}</p>
                          <Badge variant={isFull ? "default" : "secondary"}>
                            {isFull ? "Full Mock" : `Sectional — ${t.section}`}
                          </Badge>
                          {t.isFree && (
                            <Badge className="bg-green-600 text-white gap-1">
                              <Gift className="h-3 w-3" /> Free
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                          {t._count.questions} questions · Created {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/super-admin/mock-tests/${t.id}`)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                      >
                        <Settings2 className="h-4 w-4" /> Manage
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Create Mock Test Template</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Questions are picked randomly from the global pool</p>
              </div>
              <button onClick={() => { setShowForm(false); setError(""); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Title <span className="text-red-500">*</span></label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Full PTE Mock Test #1" />
              </div>

              {/* Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Test Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "FULL", label: "Full Mock Test", desc: "All 4 sections · ~56 questions · 2-3 hrs", icon: Layers },
                    { value: "SECTIONAL", label: "Sectional Test", desc: "One section only · faster practice", icon: Mic },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const active = mockType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setMockType(opt.value as "FULL" | "SECTIONAL")}
                        className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition ${
                          active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`} />
                        <p className={`text-sm font-semibold ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-slate-300"}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section picker — only for SECTIONAL */}
              {mockType === "SECTIONAL" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Section</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SECTION_META).map(([key, meta]) => {
                      const Icon = meta.icon;
                      const active = section === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setSection(key)}
                          className={`flex items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                            active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Free access toggle */}
              <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Free for all students</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Mark this as the 1 free mock test available to everyone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFree(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isFree ? "bg-green-500" : "bg-gray-200 dark:bg-slate-600"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${isFree ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">⚠ {error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-6 py-4 rounded-b-2xl">
              <Button variant="outline" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
              <Button onClick={handleCreate} loading={saving}>Create Template</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
