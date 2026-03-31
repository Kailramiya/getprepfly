"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const SECTIONS = ["SPEAKING", "WRITING", "READING", "LISTENING"];
const TYPES_BY_SECTION: Record<string, string[]> = {
  SPEAKING: ["READ_ALOUD", "REPEAT_SENTENCE", "DESCRIBE_IMAGE", "RETELL_LECTURE", "ANSWER_SHORT_QUESTION", "RESPOND_TO_SITUATION"],
  WRITING: ["SUMMARIZE_WRITTEN_TEXT", "WRITE_ESSAY"],
  READING: ["READING_MCQ_SINGLE", "READING_MCQ_MULTIPLE", "REORDER_PARAGRAPHS", "READING_FILL_BLANKS_DRAG", "READING_FILL_BLANKS_DROPDOWN"],
  LISTENING: ["SUMMARIZE_SPOKEN_TEXT", "LISTENING_MCQ_SINGLE", "LISTENING_MCQ_MULTIPLE", "LISTENING_FILL_BLANKS", "HIGHLIGHT_CORRECT_SUMMARY", "SELECT_MISSING_WORD", "WRITE_FROM_DICTATION"],
};

interface QuestionFormProps {
  onClose: () => void;
  onSave: () => void;
}

export function QuestionForm({ onClose, onSave }: QuestionFormProps) {
  const [section, setSection] = useState("SPEAKING");
  const [type, setType] = useState("READ_ALOUD");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  // Dynamic content fields based on type
  const [text, setText] = useState(""); // for READ_ALOUD
  const [passage, setPassage] = useState(""); // for MCQ, SWT, fill blanks
  const [prompt, setPrompt] = useState(""); // for WRITE_ESSAY
  const [question, setQuestion] = useState(""); // for MCQ question
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [correctText, setCorrectText] = useState(""); // for dictation
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const handleSave = async () => {
    if (!title.trim()) return alert("Title is required");
    setSaving(true);

    let content: any = {};

    if (type === "READ_ALOUD") content = { text };
    else if (type === "WRITE_ESSAY") content = { prompt, minWords: 200, maxWords: 300 };
    else if (type === "SUMMARIZE_WRITTEN_TEXT") content = { passage };
    else if (type === "WRITE_FROM_DICTATION") content = { correctText };
    else if (type.includes("MCQ_SINGLE") || type === "HIGHLIGHT_CORRECT_SUMMARY" || type === "SELECT_MISSING_WORD") {
      content = { passage, question, options: options.filter(Boolean), correctAnswers: [correctAnswer] };
    } else if (type.includes("MCQ_MULTIPLE")) {
      content = { passage, question, options: options.filter(Boolean), correctAnswers };
    } else if (type === "REORDER_PARAGRAPHS") {
      content = { paragraphs: passage.split("\n\n").filter(Boolean), correctOrder: passage.split("\n\n").filter(Boolean).map((_: string, i: number) => i) };
    } else if (type.includes("FILL_BLANKS")) {
      content = { passage: text, blanks: [] };
    } else {
      content = { text: text || passage || prompt };
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section, type, difficulty, title,
          content, modelAnswer: modelAnswer || undefined,
          explanation: explanation || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        alert(data.error || "Failed to save");
      }
    } catch {
      alert("Error saving question");
    }
    setSaving(false);
  };

  const needsPassage = type.includes("MCQ") || type === "SUMMARIZE_WRITTEN_TEXT" || type === "HIGHLIGHT_CORRECT_SUMMARY" || type.includes("FILL_BLANKS");
  const needsOptions = type.includes("MCQ") || type === "HIGHLIGHT_CORRECT_SUMMARY" || type === "SELECT_MISSING_WORD";
  const needsText = type === "READ_ALOUD" || type === "REPEAT_SENTENCE" || type === "DESCRIBE_IMAGE" || type === "RETELL_LECTURE" || type === "RESPOND_TO_SITUATION" || type === "ANSWER_SHORT_QUESTION";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900">Add New Question</h2>
        <p className="mt-1 text-sm text-gray-500">Fill in the details below</p>

        <div className="mt-6 space-y-4">
          {/* Section + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Section</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={section}
                onChange={(e) => { setSection(e.target.value); setType(TYPES_BY_SECTION[e.target.value][0]); }}
              >
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Question Type</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {(TYPES_BY_SECTION[section] || []).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title + Difficulty */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Climate Change Impact" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Difficulty</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Text Content (Read Aloud, etc.) */}
          {needsText && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {type === "READ_ALOUD" ? "Text to Read" : "Question / Prompt"}
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the question content..."
              />
            </div>
          )}

          {/* Essay Prompt */}
          {type === "WRITE_ESSAY" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Essay Prompt</label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter the essay topic..."
              />
            </div>
          )}

          {/* Passage (MCQ, SWT, Fill Blanks) */}
          {needsPassage && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {type === "REORDER_PARAGRAPHS" ? "Paragraphs (separate with empty lines)" : "Passage"}
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="Enter the passage text..."
              />
            </div>
          )}

          {/* MCQ Question */}
          {needsOptions && (
            <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What is the main idea of the passage?" />
          )}

          {/* Options */}
          {needsOptions && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Options</label>
              {options.map((opt, i) => (
                <div key={i} className="mt-2 flex items-center gap-2">
                  <input
                    type={type.includes("MULTIPLE") ? "checkbox" : "radio"}
                    name="correct"
                    checked={type.includes("MULTIPLE") ? correctAnswers.includes(i) : correctAnswer === i}
                    onChange={() => {
                      if (type.includes("MULTIPLE")) {
                        setCorrectAnswers((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                        );
                      } else {
                        setCorrectAnswer(i);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
              <button
                onClick={() => setOptions([...options, ""])}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >+ Add option</button>
            </div>
          )}

          {/* Correct Text (Dictation) */}
          {type === "WRITE_FROM_DICTATION" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Correct Sentence</label>
              <textarea
                className="min-h-[60px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                value={correctText}
                onChange={(e) => setCorrectText(e.target.value)}
                placeholder="The exact sentence the student should type"
              />
            </div>
          )}

          {/* Model Answer + Explanation */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Model Answer (optional)</label>
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="Ideal answer for reference"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Explanation (optional)</label>
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Why this answer is correct"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Question</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
