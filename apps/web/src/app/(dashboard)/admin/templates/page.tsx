"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, BookOpen, Trash2, Edit2, X, Star,
} from "lucide-react";

const QUESTION_TYPES_BY_SECTION: Record<string, { value: string; label: string }[]> = {
  Speaking: [
    { value: "READ_ALOUD", label: "Read Aloud" },
    { value: "REPEAT_SENTENCE", label: "Repeat Sentence" },
    { value: "DESCRIBE_IMAGE", label: "Describe Image" },
    { value: "RETELL_LECTURE", label: "Retell Lecture" },
    { value: "ANSWER_SHORT_QUESTION", label: "Answer Short Question" },
    { value: "RESPOND_TO_SITUATION", label: "Respond to Situation" },
    { value: "SUMMARIZE_GROUP_DISCUSSION", label: "Summarize Group Discussion" },
  ],
  Writing: [
    { value: "WRITE_ESSAY", label: "Write Essay" },
    { value: "SUMMARIZE_WRITTEN_TEXT", label: "Summarize Written Text" },
  ],
  Reading: [
    { value: "READING_MCQ_SINGLE", label: "MCQ Single" },
    { value: "READING_MCQ_MULTIPLE", label: "MCQ Multiple" },
    { value: "REORDER_PARAGRAPHS", label: "Reorder Paragraphs" },
    { value: "READING_FILL_BLANKS_DRAG", label: "Fill Blanks (Drag)" },
    { value: "READING_FILL_BLANKS_DROPDOWN", label: "Fill Blanks (Dropdown)" },
  ],
  Listening: [
    { value: "SUMMARIZE_SPOKEN_TEXT", label: "Summarize Spoken Text" },
    { value: "LISTENING_MCQ_SINGLE", label: "MCQ Single" },
    { value: "LISTENING_MCQ_MULTIPLE", label: "MCQ Multiple" },
    { value: "WRITE_FROM_DICTATION", label: "Write from Dictation" },
    { value: "LISTENING_FILL_BLANKS", label: "Fill in Blanks" },
    { value: "HIGHLIGHT_CORRECT_SUMMARY", label: "Highlight Correct Summary" },
    { value: "HIGHLIGHT_INCORRECT_WORDS", label: "Highlight Incorrect Words" },
    { value: "SELECT_MISSING_WORD", label: "Select Missing Word" },
  ],
};

interface Template {
  id: string;
  title: string;
  questionType: string;
  content: string;
  language: string;
  isPremium: boolean;
  createdAt: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [questionType, setQuestionType] = useState("WRITE_ESSAY");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("EN");
  const [isPremium, setIsPremium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/templates");
    const data = await res.json();
    if (data.success) setTemplates(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setTitle("");
    setQuestionType("WRITE_ESSAY");
    setContent("");
    setLanguage("EN");
    setIsPremium(false);
    setEditingId(null);
    setError("");
  };

  const openEdit = (t: Template) => {
    setTitle(t.title);
    setQuestionType(t.questionType);
    setContent(t.content);
    setLanguage(t.language);
    setIsPremium(t.isPremium);
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required");
    if (!content.trim()) return setError("Content is required");

    setSaving(true);
    try {
      const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questionType, content, language, isPremium }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        fetchTemplates();
      } else {
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete template "${title}"?`)) return;
    // Optimistic update — remove from UI immediately
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to delete — refreshing list");
        fetchTemplates();
      }
    } catch {
      alert("Network error — refreshing list");
      fetchTemplates();
    }
  };

  const formatType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Guide Templates</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Add ready-made templates that students can use while practicing each question type
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No templates yet</p>
            <p className="mt-1 text-sm text-gray-400">Add your first template to help students ace the exam</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {templates.map((t) => {
                const isExpanded = expandedId === t.id;
                return (
                  <div key={t.id}>
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-slate-100">{t.title}</p>
                            {t.isPremium && (
                              <Badge variant="warning" className="gap-1">
                                <Star className="h-3 w-3" /> Premium
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{formatType(t.questionType)}</Badge>
                            <span className="text-xs text-gray-400 dark:text-slate-500">{t.language}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.title); }}
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2 dark:text-slate-500">Template Content</h4>
                        <div className="rounded-lg bg-white p-4 text-sm text-gray-700 whitespace-pre-wrap shadow-sm dark:bg-slate-800 dark:text-slate-300">
                          {t.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-teal-50 px-6 py-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {editingId ? "Edit Template" : "Add New Template"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
                  Templates help students structure their answers for better scores
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Template Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Essay Template - Agree/Disagree"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Question Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {Object.entries(QUESTION_TYPES_BY_SECTION).map(([section, types]) => (
                    <optgroup key={section} label={section}>
                      {types.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Which question type does this template help with?
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Template Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Example for Essay:

Introduction: In today's society, the issue of [topic] has become increasingly important. Some argue that [view 1], while others believe [view 2].

Body Paragraph 1: On one hand, [first argument]. For instance, [example]. Therefore, [mini-conclusion].

Body Paragraph 2: On the other hand, [second argument]. For example, [example]. Hence, [mini-conclusion].

Conclusion: In conclusion, [restate position]. Overall, [final thought].`}
                  rows={12}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Write the template that students can adapt. Use [placeholders] for parts students should fill in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="EN">English</option>
                    <option value="HI">हिंदी (Hindi)</option>
                    <option value="PA">ਪੰਜਾਬੀ (Punjabi)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPremium}
                      onChange={(e) => setIsPremium(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-slate-300">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      Premium template (VIP only)
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                  ⚠ {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingId ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
