"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "@/components/admin/question-form";
import {
  Database, Plus, Search, Trash2,
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
  _count: { attempts: number };
}

export default function SuperAdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

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
        <Button onClick={() => setShowForm(true)} className="gap-2">
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
                return (
                  <div key={q.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
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
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
        <QuestionForm onClose={() => setShowForm(false)} onSave={fetchQuestions} />
      )}
    </div>
  );
}
