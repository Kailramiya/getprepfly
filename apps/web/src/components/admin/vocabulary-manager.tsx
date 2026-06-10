"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    if (!confirm(`Delete "${v.word}" from the vocabulary list?`)) return;
    const res = await fetch(`/api/vocabulary/${v.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setItems((prev) => prev.filter((i) => i.id !== v.id));
      setTotal((t) => t - 1);
    } else {
      alert(data.error || "Failed to delete word");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Vocabulary</h1>
          <p className="text-gray-500 dark:text-slate-400">Manage words shown in the Vocabulary Builder ({total})</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Word</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by word or meaning..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchList(1, e.target.value); }}
          className="pl-10"
        />
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/50">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">{editing ? "Edit Word" : "Add New Word"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Word <span className="text-red-500">*</span></label>
                  <Input value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. Ubiquitous" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Category</label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. academic, everyday, topic-specific" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning <span className="text-red-500">*</span></label>
                <Input value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} placeholder="English meaning" required />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning (Hindi)</label>
                  <Input value={form.meaningHi} onChange={(e) => setForm({ ...form, meaningHi: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Meaning (Punjabi)</label>
                  <Input value={form.meaningPa} onChange={(e) => setForm({ ...form, meaningPa: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Example sentence <span className="text-red-500">*</span></label>
                <textarea
                  className="min-h-[70px] w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Day Number</label>
                  <Input type="number" min="1" value={form.dayNumber} onChange={(e) => setForm({ ...form, dayNumber: e.target.value })} placeholder="Optional — for Word of the Day" />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

              <div className="flex gap-2">
                <Button type="submit" loading={submitting}>{editing ? "Save Changes" : "Add Word"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <BookMarked className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-gray-500 dark:text-slate-400">No vocabulary words yet. Add your first word above.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {items.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{v.word}</p>
                      <Badge variant={v.difficulty === "EASY" ? "success" : v.difficulty === "HARD" ? "destructive" : "default"} className="text-xs">
                        {v.difficulty}
                      </Badge>
                      {v.category && <Badge variant="secondary" className="text-xs">{v.category}</Badge>}
                      {v.dayNumber != null && <Badge variant="outline" className="text-xs">Day {v.dayNumber}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{v.meaning}</p>
                    <p className="mt-1 text-xs italic text-gray-400 dark:text-slate-500">&ldquo;{v.example}&rdquo;</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => openEdit(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400">
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
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchList(page - 1, search)}>Previous</Button>
          <span className="text-sm text-gray-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchList(page + 1, search)}>Next</Button>
        </div>
      )}
    </div>
  );
}
