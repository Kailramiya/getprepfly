"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import { BulkUploadModal } from "@/components/admin/bulk-upload-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  Database, Plus, Search, Upload, Trash2, Edit2,
  Mic, PenTool, BookOpen, Headphones, Star,
} from "lucide-react";

const SECTION_ICONS: Record<string, any> = {
  SPEAKING: Mic,
  WRITING: PenTool,
  READING: BookOpen,
  LISTENING: Headphones,
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
  tags: string[];
  createdAt: string;
  imageUrl: string | null;
  audioUrl: string | null;
  marks?: number;
  _count: { attempts: number };
}

interface QuestionDetail {
  id: string;
  content: any;
  explanation: string | null;
  modelAnswer: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

export default function QuestionsPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, QuestionDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDelete = async (questionId: string, title: string) => {
    const ok = await confirm({ title: "Delete question?", description: `"${title}" will be permanently removed.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    setDeleting(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        toast("success", "Question deleted");
      } else {
        toast("error", data.error || "Failed to delete question");
      }
    } catch {
      toast("error", "Failed to delete question");
    } finally {
      setDeleting(null);
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

  const refreshQuestions = () => {
    setPage(1);
    setLoading(true);
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search && { search }),
        ...(section && { section }),
        ...(questionType && { type: questionType }),
      });
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data.items);
        setTotal(data.data.total);
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [page, search, section, questionType]);

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Question Bank</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">{total} questions available</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 gap-2 font-bold tracking-wide" onClick={() => setShowBulkUpload(true)}>
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button size="lg" className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide" onClick={() => { setEditingQuestion(null); setShowForm(true); }}>
            <Plus className="h-5 w-5" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 rounded-2xl border-none bg-background/40 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {["", "SPEAKING", "WRITING", "READING", "LISTENING"].map((s) => (
            <button
              key={s}
              onClick={() => { setSection(s); setQuestionType(""); setPage(1); }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-500 ease-fluid border border-white/5 ${
                section === s
                  ? "bg-primary/20 text-primary shadow-inner backdrop-blur-md"
                  : "bg-background/40 text-foreground hover:bg-background/60 hover:-translate-y-0.5 hover:shadow-float backdrop-blur-sm"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Type sub-filter */}
      {section && QUESTION_TYPES_BY_SECTION[section] && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Type:</span>
          <button
            onClick={() => { setQuestionType(""); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-500 ease-fluid border border-white/5 ${
              questionType === ""
                ? "bg-primary/20 text-primary shadow-inner backdrop-blur-md"
                : "bg-background/40 text-foreground hover:bg-background/60 hover:-translate-y-0.5 hover:shadow-float backdrop-blur-sm"
            }`}
          >
            All types
          </button>
          {QUESTION_TYPES_BY_SECTION[section].map((t) => (
            <button
              key={t.value}
              onClick={() => { setQuestionType(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-500 ease-fluid border border-white/5 ${
                questionType === t.value
                  ? "bg-primary/20 text-primary shadow-inner backdrop-blur-md"
                  : "bg-background/40 text-foreground hover:bg-background/60 hover:-translate-y-0.5 hover:shadow-float backdrop-blur-sm"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Questions List */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><Database className="h-10 w-10 text-primary" /></div>
              <p className="text-lg font-bold text-foreground">No questions found.</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">Add your first question!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {questions.map((q) => {
                const SectionIcon = SECTION_ICONS[q.section] || Database;
                const isExpanded = expandedId === q.id;
                const detail = details[q.id];
                return (
                  <div key={q.id}>
                    <div
                      className="flex cursor-pointer items-center justify-between p-6 hover:bg-white/5 transition-colors duration-500 ease-fluid group"
                      onClick={() => toggleExpand(q.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${SECTION_COLORS[q.section] || "bg-secondary text-muted-foreground"}`}>
                          <SectionIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{q.title}</p>
                            {q.isPrediction && (
                              <Badge variant="warning" className="gap-1 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                <Star className="h-3 w-3" /> Prediction
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatType(q.type)}
                            </Badge>
                            <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>
                              {q.difficulty}
                            </Badge>
                            <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground/60 ml-2">
                              {q._count.attempts} attempts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {typeof q.marks === "number" && (
                          <span className="mr-3 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold tracking-wide uppercase text-primary shadow-inner">
                            {q.marks} {q.marks === 1 ? "mark" : "marks"}
                          </span>
                        )}
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400 disabled:opacity-50 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner mr-2 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); openEditForm(q.id); }}
                          disabled={loadingEdit === q.id}
                          title="Edit question"
                        >
                          {loadingEdit === q.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                          ) : (
                            <Edit2 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); handleDelete(q.id, q.title); }}
                          disabled={deleting === q.id}
                          title="Delete question"
                        >
                          {deleting === q.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-black/20 p-6 pl-24 backdrop-blur-md">
                        {loadingDetail === q.id ? (
                          <div className="flex items-center gap-2 py-4">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                            <span className="text-sm text-gray-500 dark:text-slate-400">Loading...</span>
                          </div>
                        ) : detail ? (
                          <div className="space-y-4 pl-14">
                            {/* Question Content */}
                            <div>
                              <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground/80">Question Content</h4>
                              <div className="mt-1 rounded-2xl bg-background/40 p-4 text-sm text-foreground shadow-inner backdrop-blur-md border border-white/5">
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
                                        <span className="font-medium text-gray-500 dark:text-slate-400">Options:</span>
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
                                        <span className="font-medium text-gray-500 dark:text-slate-400">Paragraphs:</span>
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
                                        <span className="font-medium text-gray-500 dark:text-slate-400">Blanks:</span>
                                        <ul className="ml-4 mt-1 list-disc">
                                          {detail.content.blanks.map((b: any, i: number) => (
                                            <li key={i} className="text-sm">
                                              {typeof b === "string" ? b : JSON.stringify(b)}
                                            </li>
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

                            {/* Image */}
                            {(detail.imageUrl || detail.content?.imageUrl) && (
                              <div>
                                <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground/80">Image</h4>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={detail.imageUrl || detail.content.imageUrl}
                                  alt="Question image"
                                  className="mt-1 max-h-64 rounded-lg border shadow-sm"
                                />
                              </div>
                            )}

                            {/* Audio */}
                            {(detail.audioUrl || detail.content?.audioUrl) && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Audio</h4>
                                <audio controls className="mt-1" src={detail.audioUrl || detail.content.audioUrl} />
                              </div>
                            )}

                            {/* Model Answer */}
                            {detail.modelAnswer && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Model Answer</h4>
                                <div className="mt-1 rounded-lg bg-green-50 p-3 text-sm text-green-800 shadow-sm dark:bg-green-950/50 dark:text-green-300">
                                  {detail.modelAnswer}
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {detail.explanation && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Explanation</h4>
                                <div className="mt-1 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 shadow-sm dark:bg-blue-950/50 dark:text-blue-300">
                                  {detail.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="py-4 text-sm text-gray-500 dark:text-slate-400">Failed to load details.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Page {page} of {Math.ceil(total / 20)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          onClose={() => { setShowForm(false); setEditingQuestion(null); }}
          onSave={() => {
            // Clear cached detail so it refetches updated content
            if (editingQuestion?.id) {
              setDetails((prev) => {
                const next = { ...prev };
                delete next[editingQuestion.id];
                return next;
              });
            }
            setEditingQuestion(null);
            refreshQuestions();
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onUploaded={refreshQuestions}
        />
      )}
    </div>
  );
}
