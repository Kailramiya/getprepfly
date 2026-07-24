"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  Database, Plus, Search, Trash2, Edit2,
  Mic, PenTool, BookOpen, Headphones, Star,
  Building2, Calendar, ArrowUpDown, LayoutGrid, List as ListIcon, ClipboardList,
} from "lucide-react";

const SECTION_ICONS: Record<string, any> = {
  SPEAKING: Mic, WRITING: PenTool, READING: BookOpen, LISTENING: Headphones,
};

const QUESTION_TYPES_BY_SECTION: Record<string, { value: string; label: string }[]> = {
  SPEAKING: [
    { value: "READ_ALOUD", label: "Read Aloud" },
    { value: "REPEAT_SENTENCE", label: "Repeat Sentence" },
    { value: "DESCRIBE_IMAGE", label: "Describe Image" },
    { value: "RETELL_LECTURE", label: "Retell Lecture" },
    { value: "ANSWER_SHORT_QUESTION", label: "Answer Short Question" },
    { value: "RESPOND_TO_SITUATION", label: "Respond to Situation" },
    { value: "SUMMARIZE_GROUP_DISCUSSION", label: "Summarize Group Discussion" },
  ],
  WRITING: [
    { value: "WRITE_ESSAY", label: "Write Essay" },
    { value: "SUMMARIZE_WRITTEN_TEXT", label: "Summarize Written Text" },
  ],
  READING: [
    { value: "READING_MCQ_SINGLE", label: "MCQ Single" },
    { value: "READING_MCQ_MULTIPLE", label: "MCQ Multiple" },
    { value: "REORDER_PARAGRAPHS", label: "Reorder Paragraphs" },
    { value: "READING_FILL_BLANKS_DRAG", label: "Fill Blanks (Drag)" },
    { value: "READING_FILL_BLANKS_DROPDOWN", label: "Fill Blanks (Dropdown)" },
  ],
  LISTENING: [
    { value: "SUMMARIZE_SPOKEN_TEXT", label: "Summarize Spoken Text" },
    { value: "HIGHLIGHT_CORRECT_SUMMARY", label: "Highlight Correct Summary" },
    { value: "HIGHLIGHT_INCORRECT_WORDS", label: "Highlight Incorrect Words" },
    { value: "SELECT_MISSING_WORD", label: "Select Missing Word" },
    { value: "LISTENING_MCQ_SINGLE", label: "MCQ Single" },
    { value: "LISTENING_MCQ_MULTIPLE", label: "MCQ Multiple" },
    { value: "LISTENING_FILL_BLANKS", label: "Fill Blanks" },
    { value: "WRITE_FROM_DICTATION", label: "Write From Dictation" },
  ],
};
const SECTION_COLORS: Record<string, string> = {
  SPEAKING: "bg-teal-100 text-teal-700",
  WRITING: "bg-blue-100 text-blue-700",
  READING: "bg-purple-100 text-purple-700",
  LISTENING: "bg-orange-100 text-orange-700",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HARD: "bg-red-100 text-red-700",
};

interface Question {
  id: string;
  section: string;
  type: string;
  difficulty: string;
  title: string;
  isPrediction: boolean;
  isPublic?: boolean;
  tags: string[];
  createdAt: string;
  marks?: number;
  centreId?: string | null;
  centre?: { id: string; name: string; slug: string } | null;
  _count: { attempts: number };
}

interface CentreOption {
  id: string;
  name: string;
  slug: string;
}

interface QuestionDetail {
  id: string;
  content: any;
  explanation: string | null;
  modelAnswer: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

export default function SuperAdminQuestionsPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, QuestionDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  // New: centre filter, sort, view mode
  const [questionType, setQuestionType] = useState<string>("");
  const [centreFilter, setCentreFilter] = useState<string>(""); // "" = all, "global" = unassigned, or centreId
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [groupByCentre, setGroupByCentre] = useState<boolean>(false);
  const [mockTestOnly, setMockTestOnly] = useState<boolean>(false);
  const [centres, setCentres] = useState<CentreOption[]>([]);

  // Load centre list once for the filter dropdown
  useEffect(() => {
    fetch("/api/centres")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setCentres(d.data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  const openEditForm = async (questionId: string) => {
    setLoadingEdit(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}`);
      const data = await res.json();
      if (data.success) {
        setEditingQuestion(data.data);
        setShowForm(true);
      }
    } catch {
      alert("Failed to load question for editing");
    } finally {
      setLoadingEdit(null);
    }
  };

  const toggleExpand = async (questionId: string) => {
    if (expandedId === questionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(questionId);
    if (!details[questionId]) {
      setLoadingDetail(questionId);
      try {
        const res = await fetch(`/api/questions/${questionId}`);
        const data = await res.json();
        if (data.success) {
          setDetails((prev) => ({ ...prev, [questionId]: data.data }));
        }
      } catch {
        // ignore
      } finally {
        setLoadingDetail(null);
      }
    }
  };

  const fetchQuestions = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: groupByCentre ? "200" : "20", // need more rows to group properly
      ...(search && { search }),
      ...(section && { section }),
      ...(questionType && { type: questionType }),
      ...(centreFilter && { centreId: centreFilter }),
      ...(mockTestOnly && { mockTestOnly: "true" }),
      sort: "createdAt",
      order: sortOrder,
    });
    fetch(`/api/questions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuestions(data.data.items);
          setTotal(data.data.total);
        }
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchQuestions(); }, [page, search, section, questionType, centreFilter, sortOrder, groupByCentre, mockTestOnly]);

  const deleteQuestion = async (id: string) => {
    const ok = await confirm({ description: "Delete this question? This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast("error", data.error || "Failed to delete");
        fetchQuestions();
      } else {
        toast("success", "Question deleted");
      }
    } catch {
      toast("error", "Network error — please try again");
      fetchQuestions();
    }
  };

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Renders a single question row with expand/edit/delete + centre badge.
  // Used by both list view and group-by-centre view.
  const renderQuestionRow = (q: Question) => {
    const SectionIcon = SECTION_ICONS[q.section] || Database;
    const isExpanded = expandedId === q.id;
    const detail = details[q.id];
    return (
      <div key={q.id}>
        <div
          className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/40"
          onClick={() => toggleExpand(q.id)}
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${SECTION_COLORS[q.section] || "bg-gray-100"}`}>
              <SectionIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-slate-100">{q.title}</p>
                {q.isPrediction && (
                  <Badge variant="warning" className="gap-1">
                    <Star className="h-3 w-3" /> Prediction
                  </Badge>
                )}
                {q.isPublic && (
                  <Badge className="gap-1 bg-green-100 text-green-700">🌍 Public</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">{formatType(q.type)}</Badge>
                <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                {q.centre ? (
                  <Badge className="text-xs gap-1 bg-purple-100 text-purple-700">
                    <Building2 className="h-3 w-3" /> {q.centre.name}
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-gray-100 text-gray-600">Global</Badge>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {q._count.attempts} attempts · {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {typeof q.marks === "number" && (
              <span className="mr-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                {q.marks} {q.marks === 1 ? "mark" : "marks"}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); openEditForm(q.id); }}
              disabled={loadingEdit === q.id}
              className="rounded-full p-2 text-gray-400 hover:bg-blue-500/10 hover:text-blue-500 disabled:opacity-50 transition-all duration-300"
              title="Edit question"
            >
              {loadingEdit === q.id ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <Edit2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
              className="rounded-full p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
              title="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            {loadingDetail === q.id ? (
              <div className="flex items-center gap-2 py-4 pl-14">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <span className="text-sm text-gray-500 dark:text-slate-400">Loading...</span>
              </div>
            ) : detail ? (
              <div className="space-y-4 pl-14">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Question Content</h4>
                  <div className="mt-1 rounded-lg bg-white p-3 text-sm text-gray-700 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                    {typeof detail.content === "string" ? (
                      <p>{detail.content}</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.content?.text && (
                          <p><span className="font-medium text-gray-500">Text:</span> {detail.content.text}</p>
                        )}
                        {detail.content?.prompt && (
                          <p><span className="font-medium text-gray-500">Prompt:</span> {detail.content.prompt}</p>
                        )}
                        {detail.content?.passage && (
                          <p><span className="font-medium text-gray-500">Passage:</span> {detail.content.passage}</p>
                        )}
                        {detail.content?.options && (
                          <div>
                            <span className="font-medium text-gray-500">Options:</span>
                            <ol className="ml-4 mt-1 list-decimal space-y-1">
                              {detail.content.options.map((opt: string, i: number) => (
                                <li key={i} className={detail.content?.correctAnswer === i || (Array.isArray(detail.content?.correctAnswers) && detail.content.correctAnswers.includes(i)) ? "font-semibold text-green-700" : ""}>
                                  {opt}
                                  {(detail.content?.correctAnswer === i || (Array.isArray(detail.content?.correctAnswers) && detail.content.correctAnswers.includes(i))) && " ✓"}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {detail.content?.paragraphs && (
                          <div>
                            <span className="font-medium text-gray-500">Paragraphs:</span>
                            <ol className="ml-4 mt-1 list-decimal space-y-1">
                              {detail.content.paragraphs.map((p: string, i: number) => (
                                <li key={i} className="text-sm">{p}</li>
                              ))}
                            </ol>
                            {detail.content.correctOrder && (
                              <p className="mt-1 text-xs text-green-600">Correct order: {detail.content.correctOrder.join(" → ")}</p>
                            )}
                          </div>
                        )}
                        {detail.content?.blanks && (
                          <div>
                            <span className="font-medium text-gray-500">Blanks:</span>
                            <ul className="ml-4 mt-1 list-disc">
                              {detail.content.blanks.map((b: any, i: number) => (
                                <li key={i} className="text-sm">{typeof b === "string" ? b : JSON.stringify(b)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {detail.content?.minWords && (
                          <p className="text-xs text-gray-500">Word limit: {detail.content.minWords}–{detail.content.maxWords} words</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {(detail.imageUrl || detail.content?.imageUrl) && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Image</h4>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.imageUrl || detail.content.imageUrl} alt="Question" className="mt-1 max-h-64 rounded-lg border shadow-sm" />
                  </div>
                )}

                {(detail.audioUrl || detail.content?.audioUrl) && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Audio</h4>
                    <audio controls className="mt-1" src={detail.audioUrl || detail.content.audioUrl} />
                  </div>
                )}

                {detail.modelAnswer && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Model Answer</h4>
                    <div className="mt-1 rounded-lg bg-green-50 p-3 text-sm text-green-800 shadow-sm dark:bg-green-950/40 dark:text-green-300">{detail.modelAnswer}</div>
                  </div>
                )}

                {detail.explanation && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Explanation</h4>
                    <div className="mt-1 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 shadow-sm dark:bg-blue-950/40 dark:text-blue-300">{detail.explanation}</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-4 pl-14 text-sm text-gray-500 dark:text-slate-400">Failed to load details.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Global Question Bank</h1>
          <p className="text-base font-medium text-muted-foreground">{total} questions (visible to all centres)</p>
        </div>
        <Button onClick={() => { setEditingQuestion(null); setShowForm(true); }} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold">
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Filters Row 1: Search + Section */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 w-full rounded-2xl border-none bg-white/5 py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["", "SPEAKING", "WRITING", "READING", "LISTENING"].map((s) => (
            <button
              key={s}
              onClick={() => { setSection(s); setQuestionType(""); setPage(1); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                section === s
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {s || "All sections"}
            </button>
          ))}
        </div>
      </div>

      {/* Type sub-filter — shown only when a section is selected */}
      {section && QUESTION_TYPES_BY_SECTION[section] && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Type:</span>
          <button
            onClick={() => { setQuestionType(""); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              questionType === ""
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
            }`}
          >
            All types
          </button>
          {QUESTION_TYPES_BY_SECTION[section].map((t) => (
            <button
              key={t.value}
              onClick={() => { setQuestionType(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                questionType === t.value
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters Row 2: Centre + Sort + Group */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Centre filter dropdown */}
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={centreFilter}
            onChange={(e) => { setCentreFilter(e.target.value); setPage(1); }}
            className="w-full rounded-2xl border-none bg-white/5 py-2.5 pl-10 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
          >
            <option value="">All centres ({centres.length})</option>
            <option value="global">— Global / unassigned —</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Sort by date */}
        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="flex items-center gap-2 rounded-2xl border-none shadow-inner bg-white/5 px-3 py-2 text-sm font-medium transition-all duration-700 hover:bg-white/10"
          title="Toggle sort order"
        >
          <Calendar className="h-3.5 w-3.5" />
          {sortOrder === "desc" ? "Newest first" : "Oldest first"}
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {/* Mock test only toggle */}
        <button
          onClick={() => { setMockTestOnly(!mockTestOnly); setPage(1); }}
          className={`flex items-center gap-2 rounded-2xl border-none shadow-inner px-3 py-2 text-sm font-medium transition-all duration-700 ease-fluid ${
            mockTestOnly
              ? "bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20"
              : "bg-white/5 hover:bg-white/10 text-foreground"
          }`}
          title="Show only questions used in mock tests"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Mock test only
        </button>

        {/* View toggle: List vs Grouped */}
        <div className="ml-auto inline-flex rounded-2xl bg-background/40 p-1 shadow-inner ring-1 ring-white/5">
          <button
            onClick={() => setGroupByCentre(false)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium transition-all ${
              !groupByCentre ? "bg-indigo-500/10 text-indigo-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setGroupByCentre(true)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium transition-all ${
              groupByCentre ? "bg-indigo-500/10 text-indigo-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Group by centre
          </button>
        </div>
      </div>

      {/* Questions List */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <Database className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No questions found.</p>
            </div>
          ) : groupByCentre ? (
            <div className="divide-y-4 divide-gray-100">
              {(() => {
                // Group questions by centre name (or "Global" for centreId null)
                const groups = new Map<string, Question[]>();
                for (const q of questions) {
                  const key = q.centre?.name || "Global / Unassigned";
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(q);
                }
                const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                return sorted.map(([centreName, group]) => (
                  <div key={centreName}>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 dark:from-purple-950/30 dark:to-indigo-950/30 shadow-glass">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{centreName}</p>
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        {group.length} {group.length === 1 ? "question" : "questions"}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.map((q) => renderQuestionRow(q))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((q) => renderQuestionRow(q))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">Page {page} of {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] font-bold">Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)} className="shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] font-bold">Next</Button>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          isSuperAdmin={true}
          onClose={() => { setShowForm(false); setEditingQuestion(null); }}
          onSave={() => {
            if (editingQuestion?.id) {
              setDetails((prev) => {
                const next = { ...prev };
                delete next[editingQuestion.id];
                return next;
              });
            }
            setEditingQuestion(null);
            fetchQuestions();
          }}
        />
      )}
    </div>
  );
}
