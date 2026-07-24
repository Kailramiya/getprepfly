"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { BookMarked, Plus, Search, Trash2, Edit2, X } from "lucide-react";

interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  meaningHi: string | null;
  meaningPa: string | null;
  example: string;
  category: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  dayNumber: number | null;
}

const EMPTY_FORM = {
  word: "", meaning: "", meaningHi: "", meaningPa: "",
  example: "", category: "", difficulty: "MEDIUM", dayNumber: "",
};

export function VocabularyManager() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [items, setItems] = useState<VocabWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VocabWord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchList = (p = page, q = search) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: "20", search: q });
    fetch(`/api/vocabulary?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.data.items);
          setTotal(d.data.total);
          setTotalPages(d.data.totalPages);
          setPage(d.data.page);
        }
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchList(1, search); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true); };
  const openEdit = (v: VocabWord) => {
    setEditing(v);
    setForm({
      word: v.word, meaning: v.meaning, meaningHi: v.meaningHi || "", meaningPa: v.meaningPa || "",
      example: v.example, category: v.category || "", difficulty: v.difficulty,
      dayNumber: v.dayNumber != null ? String(v.dayNumber) : "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const url = editing ? `/api/vocabulary/${editing.id}` : "/api/vocabulary";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditing(null);
        fetchList(editing ? page : 1, search);
      } else {
        setFormError(data.error || "Failed to save word");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v: VocabWord) => {
    const ok = await confirm({ description: `Delete "${v.word}" from the vocabulary list?`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    const res = await fetch(`/api/vocabulary/${v.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setItems((prev) => prev.filter((i) => i.id !== v.id));
      setTotal((t) => t - 1);
      toast("success", `"${v.word}" deleted`);
    } else {
      toast("error", data.error || "Failed to delete word");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Vocabulary</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">Manage words shown in the Vocabulary Builder ({total})</p>
        </div>
        <Button size="lg" onClick={openAdd} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide"><Plus className="h-5 w-5" /> Add Word</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by word or meaning..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchList(1, e.target.value); }}
          className="pl-10 rounded-2xl border-none bg-background/40 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
        />
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-indigo-500/10 backdrop-blur-xl ring-1 ring-indigo-500/20">
          <CardContent className="p-5">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">{editing ? "Edit Word" : "Add New Word"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-muted-foreground hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Word <span className="text-red-500">*</span></label>
                  <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. Ubiquitous" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Category</label>
                  <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. academic, everyday, topic-specific" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning <span className="text-red-500">*</span></label>
                <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} placeholder="English meaning" required />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning (Hindi)</label>
                  <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.meaningHi} onChange={(e) => setForm({ ...form, meaningHi: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning (Punjabi)</label>
                  <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.meaningPa} onChange={(e) => setForm({ ...form, meaningPa: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Example sentence <span className="text-red-500">*</span></label>
                <textarea
                  className="min-h-[70px] w-full rounded-2xl border-none bg-background/40 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground placeholder:text-slate-500"
                  placeholder="A sentence using the word"
                  value={form.example}
                  onChange={(e) => setForm({ ...form, example: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full rounded-2xl border-none bg-background/40 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Day Number</label>
                  <Input type="number" min="1" className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" value={form.dayNumber} onChange={(e) => setForm({ ...form, dayNumber: e.target.value })} placeholder="Optional — for Word of the Day" />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

              <div className="flex gap-2">
                <Button type="submit" size="lg" loading={submitting} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid font-bold tracking-wide">{editing ? "Save Changes" : "Add Word"}</Button>
                <Button type="button" size="lg" variant="outline" onClick={() => setShowForm(false)} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 font-bold tracking-wide">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><BookMarked className="h-10 w-10 text-primary" /></div>
              <p className="text-lg font-bold text-foreground">No vocabulary words yet.</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">Add your first word above.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-6 p-6 hover:bg-white/5 transition-colors duration-500 ease-fluid group">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{v.word}</p>
                      <Badge variant={v.difficulty === "EASY" ? "success" : v.difficulty === "HARD" ? "destructive" : "default"} className="text-xs px-2 py-0.5 font-bold">
                        {v.difficulty}
                      </Badge>
                      {v.category && <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold">{v.category}</Badge>}
                      {v.dayNumber != null && <Badge variant="outline" className="text-xs px-2 py-0.5 font-bold bg-transparent">Day {v.dayNumber}</Badge>}
                    </div>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">{v.meaning}</p>
                    <p className="mt-1 text-sm italic text-muted-foreground/70">&ldquo;{v.example}&rdquo;</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => openEdit(v)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(v)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page <= 1} onClick={() => fetchList(page - 1, search)} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 font-bold">Previous</Button>
          <span className="text-sm font-bold tracking-widest text-muted-foreground/60 uppercase">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => fetchList(page + 1, search)} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 font-bold">Next</Button>
        </div>
      )}
    </div>
  );
}
