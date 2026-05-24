"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Search, X, Mic, PenTool, BookOpen, Headphones, ClipboardList,
  CheckSquare, Square,
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────

interface TemplateQuestion {
  id: string; // MockTestQuestion id
  order: number;
  question: {
    id: string;
    section: string;
    type: string;
    title: string;
    difficulty: string;
    mockTestOnly?: boolean;
    audioUrl?: string | null;
    imageUrl?: string | null;
  };
}

interface Template {
  id: string;
  title: string;
  mockType: string;
  section: string | null;
  questions: TemplateQuestion[];
}

interface BankQuestion {
  id: string;
  section: string;
  type: string;
  title: string;
  difficulty: string;
  mockTestOnly: boolean;
}

// ─── constants ───────────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  SPEAKING: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  WRITING: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  READING: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  LISTENING: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
};

const SECTION_ICONS: Record<string, any> = {
  SPEAKING: Mic, WRITING: PenTool, READING: BookOpen, LISTENING: Headphones,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  HARD: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

// ─── component ───────────────────────────────────────────────────────────────

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  // Add from bank modal
  const [showBank, setShowBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankSection, setBankSection] = useState("ALL");
  const [bankPage, setBankPage] = useState(1);
  const [bankTotal, setBankTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Create question modal
  const [showCreate, setShowCreate] = useState(false);

  // ── fetch template ──────────────────────────────────────────────────────

  const fetchTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/mock-tests/${id}`);
      const data = await res.json();
      if (data.success) setTemplate(data.data);
    } catch (e) {
      console.error("Failed to load template", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  // ── fetch question bank ─────────────────────────────────────────────────

  const fetchBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(bankPage),
        pageSize: "20",
        ...(bankSearch && { search: bankSearch }),
        ...(bankSection !== "ALL" && { section: bankSection }),
      });
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setBankQuestions(data.data.items);
        setBankTotal(data.data.total);
      }
    } catch (e) {
      console.error("Failed to load question bank", e);
    } finally {
      setBankLoading(false);
    }
  }, [bankPage, bankSearch, bankSection]);

  useEffect(() => {
    if (showBank) fetchBank();
  }, [showBank, fetchBank]);

  // reset page when filters change
  useEffect(() => { setBankPage(1); }, [bankSearch, bankSection]);

  // ── reorder ─────────────────────────────────────────────────────────────

  const reorder = async (index: number, dir: "up" | "down") => {
    if (!template) return;
    const qs = [...template.questions];
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= qs.length) return;

    // Swap order values locally
    const newOrder = qs[index].order;
    qs[index] = { ...qs[index], order: qs[swapIdx].order };
    qs[swapIdx] = { ...qs[swapIdx], order: newOrder };
    qs.sort((a, b) => a.order - b.order);
    setTemplate({ ...template, questions: qs });

    await fetch(`/api/super-admin/mock-tests/${id}/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: [
          { id: qs[index].id, order: qs[index].order },
          { id: qs[swapIdx].id, order: qs[swapIdx].order },
        ],
      }),
    });
  };

  // ── remove question ─────────────────────────────────────────────────────

  const removeQuestion = async (questionId: string) => {
    if (!template) return;
    setTemplate({
      ...template,
      questions: template.questions.filter((q) => q.question.id !== questionId),
    });
    await fetch(`/api/super-admin/mock-tests/${id}/questions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
  };

  // ── add selected from bank ──────────────────────────────────────────────

  const addSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    const res = await fetch(`/api/super-admin/mock-tests/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: Array.from(selected) }),
    });
    const data = await res.json();
    if (data.success) {
      setShowBank(false);
      setSelected(new Set());
      fetchTemplate();
    }
    setAdding(false);
  };

  // ── already-in-template set ─────────────────────────────────────────────

  const inTemplate = new Set(template?.questions.map((q) => q.question.id) ?? []);

  const toggleSelect = (qId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) { next.delete(qId); } else { next.add(qId); }
      return next;
    });
  };

  // ─── render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="py-20 text-center text-gray-500">Template not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/super-admin/mock-tests")}
          className="mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{template.title}</h1>
            <Badge variant={template.mockType === "FULL" ? "default" : "secondary"}>
              {template.mockType === "FULL" ? "Full Mock" : `Sectional — ${template.section}`}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {template.questions.length} questions in this template
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBank(true)} className="gap-2">
            <Search className="h-4 w-4" /> Add from Bank
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Question
          </Button>
        </div>
      </div>

      {/* Question list */}
      {template.questions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500 dark:text-slate-400">No questions yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
              Add from the question bank or create new mock-test-only questions
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowBank(true)} className="gap-2">
                <Search className="h-4 w-4" /> Add from Bank
              </Button>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create Question
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {template.questions.map((tq, idx) => {
                const Icon = SECTION_ICONS[tq.question.section] ?? BookOpen;
                return (
                  <div key={tq.id} className="flex items-center gap-4 px-4 py-3">
                    {/* Position */}
                    <span className="w-7 shrink-0 text-center text-sm font-medium text-gray-400 dark:text-slate-500">
                      {idx + 1}
                    </span>

                    {/* Section icon */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${SECTION_COLORS[tq.question.section]?.split(" ").slice(0, 2).join(" ")}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                        {tq.question.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${SECTION_COLORS[tq.question.section]}`}>
                          {tq.question.section}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {tq.question.type.replace(/_/g, " ")}
                        </span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[tq.question.difficulty]}`}>
                          {tq.question.difficulty}
                        </span>
                        {tq.question.mockTestOnly && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                            Mock Only
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reorder */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => reorder(idx, "up")}
                        disabled={idx === 0}
                        className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 dark:text-slate-600 dark:hover:text-slate-300"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => reorder(idx, "down")}
                        disabled={idx === template.questions.length - 1}
                        className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 dark:text-slate-600 dark:hover:text-slate-300"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeQuestion(tq.question.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add from Bank modal ─────────────────────────────────────────── */}
      {showBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add Questions from Bank</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {selected.size > 0 ? `${selected.size} selected` : "Select questions to add to this template"}
                </p>
              </div>
              <button onClick={() => { setShowBank(false); setSelected(new Set()); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["ALL", "SPEAKING", "WRITING", "READING", "LISTENING"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setBankSection(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      bankSection === s
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Question list */}
            <div className="flex-1 overflow-y-auto">
              {bankLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500">No questions found</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {bankQuestions.map((q) => {
                    const already = inTemplate.has(q.id);
                    const isSelected = selected.has(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => !already && toggleSelect(q.id)}
                        disabled={already}
                        className={`flex w-full items-center gap-4 px-6 py-3 text-left transition ${
                          already
                            ? "opacity-40 cursor-not-allowed"
                            : isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/30"
                              : "hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 shrink-0 text-indigo-600" />
                        ) : (
                          <Square className="h-5 w-5 shrink-0 text-gray-300 dark:text-slate-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{q.title}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${SECTION_COLORS[q.section]}`}>
                              {q.section}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">{q.type.replace(/_/g, " ")}</span>
                            {q.mockTestOnly && (
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                                Mock Only
                              </span>
                            )}
                            {already && (
                              <span className="text-xs text-gray-400 dark:text-slate-500">Already added</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {bankTotal > 20 && (
              <div className="flex items-center justify-center gap-3 border-t border-gray-100 dark:border-slate-700 px-6 py-3">
                <Button variant="outline" size="sm" disabled={bankPage === 1} onClick={() => setBankPage(p => p - 1)}>Prev</Button>
                <span className="text-sm text-gray-500 dark:text-slate-400">Page {bankPage} of {Math.ceil(bankTotal / 20)}</span>
                <Button variant="outline" size="sm" disabled={bankPage >= Math.ceil(bankTotal / 20)} onClick={() => setBankPage(p => p + 1)}>Next</Button>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-6 py-4 rounded-b-2xl">
              <Button variant="outline" onClick={() => { setShowBank(false); setSelected(new Set()); }}>Cancel</Button>
              <Button onClick={addSelected} loading={adding} disabled={selected.size === 0}>
                Add Selected ({selected.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Question modal ───────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-4 w-full max-w-3xl">
            <QuestionForm
              isSuperAdmin
              onClose={() => setShowCreate(false)}
              onSave={async (createdQuestion) => {
                if (createdQuestion?.id) {
                  await fetch(`/api/super-admin/mock-tests/${id}/questions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ questionIds: [createdQuestion.id] }),
                  });
                  fetchTemplate();
                }
                setShowCreate(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
