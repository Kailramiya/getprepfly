"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import {
  Database, Plus, Search, Trash2, Edit2,
  Mic, PenTool, BookOpen, Headphones, Star,
} from "lucide-react";

const SECTION_ICONS: Record<string, any> = {
  SPEAKING: Mic, WRITING: PenTool, READING: BookOpen, LISTENING: Headphones,
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

export default function SuperAdminQuestionsPage() {
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
      pageSize: "20",
      ...(search && { search }),
      ...(section && { section }),
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
  useEffect(() => { fetchQuestions(); }, [page, search, section]);

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    fetchQuestions();
  };

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Question Bank</h1>
          <p className="text-gray-500">{total} questions (visible to all centres)</p>
        </div>
        <Button onClick={() => { setEditingQuestion(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["", "SPEAKING", "WRITING", "READING", "LISTENING"].map((s) => (
            <button
              key={s}
              onClick={() => { setSection(s); setPage(1); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                section === s
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <Card>
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
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((q) => {
                const SectionIcon = SECTION_ICONS[q.section] || Database;
                const isExpanded = expandedId === q.id;
                const detail = details[q.id];
                return (
                  <div key={q.id}>
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
                      onClick={() => toggleExpand(q.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${SECTION_COLORS[q.section] || "bg-gray-100"}`}>
                          <SectionIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{q.title}</p>
                            {q.isPrediction && (
                              <Badge variant="warning" className="gap-1">
                                <Star className="h-3 w-3" /> Prediction
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{formatType(q.type)}</Badge>
                            <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                            <span className="text-xs text-gray-400">{q._count.attempts} attempts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {typeof q.marks === "number" && (
                          <span className="mr-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                            {q.marks} {q.marks === 1 ? "mark" : "marks"}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditForm(q.id); }}
                          disabled={loadingEdit === q.id}
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50"
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
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                        {loadingDetail === q.id ? (
                          <div className="flex items-center gap-2 py-4 pl-14">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                            <span className="text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : detail ? (
                          <div className="space-y-4 pl-14">
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-gray-400">Question Content</h4>
                              <div className="mt-1 rounded-lg bg-white p-3 text-sm text-gray-700 shadow-sm">
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
                                <h4 className="text-xs font-semibold uppercase text-gray-400">Image</h4>
                                <img src={detail.imageUrl || detail.content.imageUrl} alt="Question" className="mt-1 max-h-64 rounded-lg border shadow-sm" />
                              </div>
                            )}

                            {(detail.audioUrl || detail.content?.audioUrl) && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400">Audio</h4>
                                <audio controls className="mt-1" src={detail.audioUrl || detail.content.audioUrl} />
                              </div>
                            )}

                            {detail.modelAnswer && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400">Model Answer</h4>
                                <div className="mt-1 rounded-lg bg-green-50 p-3 text-sm text-green-800 shadow-sm">{detail.modelAnswer}</div>
                              </div>
                            )}

                            {detail.explanation && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-400">Explanation</h4>
                                <div className="mt-1 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 shadow-sm">{detail.explanation}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="py-4 pl-14 text-sm text-gray-500">Failed to load details.</p>
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
          <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
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
