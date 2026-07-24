"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
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
  const confirm = useConfirm();
  const { toast } = useToast();
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
    const ok = await confirm({ title: "Delete template?", description: `"${title}" will be permanently removed.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast("error", data.error || "Failed to delete");
        fetchTemplates();
      } else {
        toast("success", "Template deleted");
      }
    } catch {
      toast("error", "Network error — please try again");
      fetchTemplates();
    }
  };

  const formatType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Study Guide Templates</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">
            Add ready-made templates that students can use while practicing each question type
          </p>
        </div>
        <Button size="lg" onClick={() => { resetForm(); setShowForm(true); }} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide">
          <Plus className="h-5 w-5" />
          Add Template
        </Button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><BookOpen className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-bold text-foreground">No templates yet</p>
            <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">Add your first template to help students ace the exam</p>
            <Button size="lg" onClick={() => { resetForm(); setShowForm(true); }} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid mt-6 gap-2 font-bold tracking-wide">
              <Plus className="h-5 w-5" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {templates.map((t) => {
                const isExpanded = expandedId === t.id;
                return (
                  <div key={t.id}>
                    <div
                      className="flex cursor-pointer items-center justify-between p-6 hover:bg-white/5 transition-colors duration-500 ease-fluid group"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{t.title}</p>
                            {t.isPremium && (
                              <Badge variant="warning" className="gap-1 px-2 py-0.5">
                                <Star className="h-3 w-3" /> Premium
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs">{formatType(t.questionType)}</Badge>
                            <span className="text-xs text-gray-400 dark:text-slate-500">{t.language}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.title); }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all duration-700 ease-fluid hover:scale-110 shadow-inner opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/5 bg-black/10 px-6 py-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Template Content</h4>
                        <div className="rounded-2xl border border-white/10 bg-background/40 p-6 text-sm font-medium text-foreground whitespace-pre-wrap shadow-inner backdrop-blur-md">
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
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {editingId ? "Edit Template" : "Add New Template"}
                </h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
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
                  className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Question Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full rounded-2xl border-none bg-background/40 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
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
                  className="w-full rounded-2xl border-none bg-background/40 p-4 text-sm font-mono focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground placeholder:text-slate-500"
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
                    className="w-full rounded-2xl border-none bg-background/40 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
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

            <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
              <Button variant="outline" size="lg" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10 font-bold tracking-wide">
                Cancel
              </Button>
              <Button onClick={handleSave} size="lg" loading={saving} className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid font-bold tracking-wide">
                {editingId ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
