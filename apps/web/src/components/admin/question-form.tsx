"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  X, Mic, PenTool, BookOpen, Headphones,
  FileText, List, Shuffle, Edit3, CheckCircle2,
  Image as ImageIcon, Volume2, Star, Info, Plus, Trash2,
} from "lucide-react";

// ============================================================================
// QUESTION TYPE METADATA
// ============================================================================

interface QuestionTypeInfo {
  value: string;
  label: string;
  icon: any;
  description: string;
  example: string;
  fields: Field[];
}

type Field =
  | "text"
  | "passage"
  | "prompt"
  | "options-single"
  | "options-multiple"
  | "paragraphs-reorder"
  | "fill-blanks"
  | "correct-text"
  | "image-url"
  | "audio-url"
  | "word-limits";

const SECTIONS = [
  {
    value: "SPEAKING",
    label: "Speaking",
    icon: Mic,
    activeClasses: "border-teal-500 bg-teal-50",
    iconActive: "text-teal-600",
    desc: "Student records audio",
  },
  {
    value: "WRITING",
    label: "Writing",
    icon: PenTool,
    activeClasses: "border-blue-500 bg-blue-50",
    iconActive: "text-blue-600",
    desc: "Student types response",
  },
  {
    value: "READING",
    label: "Reading",
    icon: BookOpen,
    activeClasses: "border-purple-500 bg-purple-50",
    iconActive: "text-purple-600",
    desc: "Student reads and answers",
  },
  {
    value: "LISTENING",
    label: "Listening",
    icon: Headphones,
    activeClasses: "border-orange-500 bg-orange-50",
    iconActive: "text-orange-600",
    desc: "Student listens and answers",
  },
];

const QUESTION_TYPES: Record<string, QuestionTypeInfo[]> = {
  SPEAKING: [
    {
      value: "READ_ALOUD",
      label: "Read Aloud",
      icon: FileText,
      description: "Student reads a text aloud. You provide the text.",
      example: 'Example text: "Climate change is affecting global weather patterns significantly."',
      fields: ["text"],
    },
    {
      value: "REPEAT_SENTENCE",
      label: "Repeat Sentence",
      icon: Volume2,
      description: "Student listens to a sentence, then repeats it. You provide the audio + expected text.",
      example: "Upload an audio file and write what the sentence says.",
      fields: ["audio-url", "text"],
    },
    {
      value: "DESCRIBE_IMAGE",
      label: "Describe Image",
      icon: ImageIcon,
      description: "Student describes an image shown. You provide the image URL + reference points.",
      example: "Graph, chart, photograph with key points to mention.",
      fields: ["image-url", "text"],
    },
    {
      value: "RETELL_LECTURE",
      label: "Retell Lecture",
      icon: Headphones,
      description: "Student listens to a lecture and retells the main points.",
      example: "Upload audio + provide reference points for scoring.",
      fields: ["audio-url", "text"],
    },
    {
      value: "ANSWER_SHORT_QUESTION",
      label: "Answer Short Question",
      icon: Edit3,
      description: "Student answers a short question in 1-2 words.",
      example: 'Question: "What do we call the study of plants?" Answer: "Botany"',
      fields: ["text", "correct-text"],
    },
    {
      value: "RESPOND_TO_SITUATION",
      label: "Respond to Situation",
      icon: Edit3,
      description: "Student responds to a given scenario in 30-40 seconds.",
      example: "Scenario: You're late for a meeting. What would you say to your colleague?",
      fields: ["text"],
    },
  ],
  WRITING: [
    {
      value: "WRITE_ESSAY",
      label: "Write Essay",
      icon: Edit3,
      description: "Student writes a 200-300 word essay on the given topic.",
      example: 'Essay prompt: "Do you think social media has a positive or negative impact on society?"',
      fields: ["prompt", "word-limits"],
    },
    {
      value: "SUMMARIZE_WRITTEN_TEXT",
      label: "Summarize Written Text",
      icon: FileText,
      description: "Student reads a passage and writes a one-sentence summary (5-75 words).",
      example: "Provide the full passage. Student must summarize it in one sentence.",
      fields: ["passage"],
    },
  ],
  READING: [
    {
      value: "READING_MCQ_SINGLE",
      label: "MCQ — Single Answer",
      icon: CheckCircle2,
      description: "Student reads passage and selects ONE correct answer.",
      example: "Passage + Question + 4 options + mark which is correct.",
      fields: ["passage", "options-single"],
    },
    {
      value: "READING_MCQ_MULTIPLE",
      label: "MCQ — Multiple Answers",
      icon: List,
      description: "Student reads passage and selects MULTIPLE correct answers.",
      example: "Passage + Question + options + mark all correct ones.",
      fields: ["passage", "options-multiple"],
    },
    {
      value: "REORDER_PARAGRAPHS",
      label: "Reorder Paragraphs",
      icon: Shuffle,
      description: "Student arranges shuffled paragraphs in correct order.",
      example: "Enter each paragraph on a new section. Order them correctly.",
      fields: ["paragraphs-reorder"],
    },
    {
      value: "READING_FILL_BLANKS_DRAG",
      label: "Fill in the Blanks (Drag & Drop)",
      icon: Edit3,
      description: "Student drags words to fill blanks in the passage.",
      example: 'Use [blank] in your passage. Example: "The cat sat on the [blank]."',
      fields: ["fill-blanks"],
    },
    {
      value: "READING_FILL_BLANKS_DROPDOWN",
      label: "Fill in the Blanks (Dropdown)",
      icon: Edit3,
      description: "Student picks the correct word from a dropdown for each blank.",
      example: 'Use [blank] markers. Provide correct answers for each blank.',
      fields: ["fill-blanks"],
    },
  ],
  LISTENING: [
    {
      value: "SUMMARIZE_SPOKEN_TEXT",
      label: "Summarize Spoken Text",
      icon: Volume2,
      description: "Student listens to audio and writes a 50-70 word summary.",
      example: "Upload audio. Student writes summary.",
      fields: ["audio-url", "text"],
    },
    {
      value: "LISTENING_MCQ_SINGLE",
      label: "MCQ — Single Answer",
      icon: CheckCircle2,
      description: "Student listens to audio and selects ONE correct answer.",
      example: "Audio + Question + options + mark correct.",
      fields: ["audio-url", "options-single"],
    },
    {
      value: "LISTENING_MCQ_MULTIPLE",
      label: "MCQ — Multiple Answers",
      icon: List,
      description: "Student listens and selects MULTIPLE correct answers.",
      example: "Audio + Question + options + mark all correct.",
      fields: ["audio-url", "options-multiple"],
    },
    {
      value: "LISTENING_FILL_BLANKS",
      label: "Fill in the Blanks",
      icon: Edit3,
      description: "Student listens to audio and fills blanks in the transcript.",
      example: "Upload audio + provide transcript with [blank] markers.",
      fields: ["audio-url", "fill-blanks"],
    },
    {
      value: "HIGHLIGHT_CORRECT_SUMMARY",
      label: "Highlight Correct Summary",
      icon: CheckCircle2,
      description: "Student listens and picks the best summary from options.",
      example: "Audio + 4 summary options + mark the best one.",
      fields: ["audio-url", "options-single"],
    },
    {
      value: "SELECT_MISSING_WORD",
      label: "Select Missing Word",
      icon: CheckCircle2,
      description: "Last word in audio is beeped. Student picks the missing word.",
      example: "Audio with missing word + options + mark the correct word.",
      fields: ["audio-url", "options-single"],
    },
    {
      value: "WRITE_FROM_DICTATION",
      label: "Write from Dictation",
      icon: Edit3,
      description: "Student listens and types exactly what they hear.",
      example: "Upload audio + provide the exact sentence for comparison.",
      fields: ["audio-url", "correct-text"],
    },
  ],
};

const DIFFICULTIES = [
  { value: "EASY", label: "Easy", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "HARD", label: "Hard", color: "bg-red-100 text-red-700 border-red-200" },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface QuestionFormProps {
  onClose: () => void;
  onSave: () => void;
  question?: any; // existing question for edit mode
  isSuperAdmin?: boolean;
}

export function QuestionForm({ onClose, onSave, question: editingQuestion, isSuperAdmin }: QuestionFormProps) {
  const isEditing = !!editingQuestion?.id;
  const initialContent = editingQuestion?.content || {};
  const [isPublic, setIsPublic] = useState<boolean>(!!editingQuestion?.isPublic);

  const [section, setSection] = useState<string>(editingQuestion?.section || "SPEAKING");
  const [typeValue, setTypeValue] = useState<string>(editingQuestion?.type || "READ_ALOUD");
  const [title, setTitle] = useState(editingQuestion?.title || "");
  const [difficulty, setDifficulty] = useState(editingQuestion?.difficulty || "MEDIUM");
  const [isPrediction, setIsPrediction] = useState(!!editingQuestion?.isPrediction);
  const [marks, setMarks] = useState<number>(editingQuestion?.marks ?? 1);
  const [tags, setTags] = useState<string>(
    Array.isArray(editingQuestion?.tags) ? editingQuestion.tags.join(", ") : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Content fields — pre-fill from existing question
  const [text, setText] = useState(initialContent.text || "");
  const [passage, setPassage] = useState(initialContent.passage || "");
  const [prompt, setPrompt] = useState(initialContent.prompt || "");
  const [question, setQuestionText] = useState(initialContent.question || "");
  const [options, setOptions] = useState<string[]>(
    Array.isArray(initialContent.options) && initialContent.options.length > 0
      ? initialContent.options
      : ["", "", "", ""]
  );
  const [correctAnswer, setCorrectAnswer] = useState<number>(
    typeof initialContent.correctAnswer === "number" ? initialContent.correctAnswer : 0
  );
  const [correctAnswers, setCorrectAnswers] = useState<number[]>(
    Array.isArray(initialContent.correctAnswers) ? initialContent.correctAnswers : []
  );
  const [correctText, setCorrectText] = useState(initialContent.correctText || "");
  const [imageUrl, setImageUrl] = useState(editingQuestion?.imageUrl || initialContent.imageUrl || "");
  const [audioUrl, setAudioUrl] = useState(editingQuestion?.audioUrl || initialContent.audioUrl || "");
  const [minWords, setMinWords] = useState<number>(initialContent.minWords || 200);
  const [maxWords, setMaxWords] = useState<number>(initialContent.maxWords || 300);
  const [paragraphs, setParagraphs] = useState<string[]>(
    Array.isArray(initialContent.paragraphs) && initialContent.paragraphs.length > 0
      ? initialContent.paragraphs
      : ["", "", "", ""]
  );
  const [fillBlanksPassage, setFillBlanksPassage] = useState(
    initialContent.passage && (typeValue || "").includes("FILL_BLANKS") ? initialContent.passage : ""
  );
  const [fillBlanksAnswers, setFillBlanksAnswers] = useState<string[]>(() => {
    if (Array.isArray(initialContent.blanks) && initialContent.blanks.length > 0) {
      return initialContent.blanks.map((b: any) =>
        typeof b === "string" ? b : b?.correctAnswer || b?.answer || ""
      );
    }
    return [""];
  });

  // Extra
  const [modelAnswer, setModelAnswer] = useState(editingQuestion?.modelAnswer || "");
  const [explanation, setExplanation] = useState(editingQuestion?.explanation || "");

  const currentType = QUESTION_TYPES[section].find((t) => t.value === typeValue) || QUESTION_TYPES[section][0];
  const fields = new Set(currentType.fields);

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    setTypeValue(QUESTION_TYPES[newSection][0].value);
  };

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
    setCorrectAnswers(correctAnswers.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)));
    if (correctAnswer >= idx && correctAnswer > 0) setCorrectAnswer(correctAnswer - 1);
  };
  const updateOption = (idx: number, value: string) => {
    const newOpts = [...options];
    newOpts[idx] = value;
    setOptions(newOpts);
  };

  const addParagraph = () => setParagraphs([...paragraphs, ""]);
  const removeParagraph = (idx: number) => setParagraphs(paragraphs.filter((_, i) => i !== idx));
  const updateParagraph = (idx: number, value: string) => {
    const next = [...paragraphs];
    next[idx] = value;
    setParagraphs(next);
  };

  const addBlankAnswer = () => setFillBlanksAnswers([...fillBlanksAnswers, ""]);
  const removeBlankAnswer = (idx: number) => setFillBlanksAnswers(fillBlanksAnswers.filter((_, i) => i !== idx));
  const updateBlankAnswer = (idx: number, value: string) => {
    const next = [...fillBlanksAnswers];
    next[idx] = value;
    setFillBlanksAnswers(next);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Please enter a title";
    if (fields.has("text") && !text.trim()) return "Please fill in the text / question content";
    if (fields.has("passage") && !passage.trim()) return "Please enter the passage";
    if (fields.has("prompt") && !prompt.trim()) return "Please enter the essay prompt";
    if (fields.has("correct-text") && !correctText.trim()) return "Please enter the correct answer text";
    if (fields.has("audio-url") && !audioUrl.trim()) return "Please provide the audio URL";
    if (fields.has("image-url") && !imageUrl.trim()) return "Please provide the image URL";

    if (fields.has("options-single") || fields.has("options-multiple")) {
      const filled = options.filter((o) => o.trim()).length;
      if (filled < 2) return "Please add at least 2 options";
      if (fields.has("options-multiple") && correctAnswers.length === 0) return "Please mark at least one correct answer";
    }

    if (fields.has("paragraphs-reorder")) {
      const filled = paragraphs.filter((p) => p.trim()).length;
      if (filled < 2) return "Please add at least 2 paragraphs";
    }

    if (fields.has("fill-blanks") && !fillBlanksPassage.trim()) return "Please enter the passage with [blank] markers";

    return null;
  };

  const buildContent = () => {
    const content: any = {};

    if (fields.has("text")) content.text = text;
    if (fields.has("passage")) content.passage = passage;
    if (fields.has("prompt")) content.prompt = prompt;
    if (fields.has("correct-text")) content.correctText = correctText;
    if (fields.has("audio-url")) content.audioUrl = audioUrl;
    if (fields.has("image-url")) content.imageUrl = imageUrl;

    if (fields.has("options-single")) {
      content.question = question;
      content.options = options.filter((o) => o.trim());
      content.correctAnswer = correctAnswer;
    }
    if (fields.has("options-multiple")) {
      content.question = question;
      content.options = options.filter((o) => o.trim());
      content.correctAnswers = correctAnswers;
    }
    if (fields.has("paragraphs-reorder")) {
      const filled = paragraphs.filter((p) => p.trim());
      content.paragraphs = filled;
      content.correctOrder = filled.map((_, i) => i); // already in correct order as entered
    }
    if (fields.has("fill-blanks")) {
      content.passage = fillBlanksPassage;
      content.blanks = fillBlanksAnswers.filter((a) => a.trim());
    }
    if (fields.has("word-limits")) {
      content.minWords = minWords;
      content.maxWords = maxWords;
    }

    return content;
  };

  const handleSave = async () => {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/questions/${editingQuestion.id}` : "/api/questions";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          type: typeValue,
          difficulty,
          title: title.trim(),
          content: buildContent(),
          modelAnswer: modelAnswer.trim() || undefined,
          explanation: explanation.trim() || undefined,
          audioUrl: audioUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          isPrediction,
          marks: marks > 0 ? marks : 1,
          isPublic: isSuperAdmin ? isPublic : undefined,
          tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setError(data.error || "Failed to save question");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const SectionIcon = SECTIONS.find((s) => s.value === section)?.icon || Mic;
  const TypeIcon = currentType.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-teal-50 to-indigo-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? "Edit Question" : "Add New Question"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {isEditing
                ? "Update the question details below"
                : "Fill in the details below to add a question to your centre"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">

            {/* STEP 1: Section Selection */}
            <section>
              <SectionHeader number={1} title="Choose Section" description="What type of PTE skill is this question for?" />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = section === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleSectionChange(s.value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                        active ? s.activeClasses : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${active ? s.iconActive : "text-gray-400"}`} />
                      <div>
                        <p className={`text-sm font-medium ${active ? "text-gray-900" : "text-gray-600"}`}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-gray-400">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP 2: Question Type */}
            <section>
              <SectionHeader number={2} title="Choose Question Type" description={`Which ${section.toLowerCase()} question type?`} />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {QUESTION_TYPES[section].map((t) => {
                  const Icon = t.icon;
                  const active = typeValue === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTypeValue(t.value)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition ${
                        active
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`} />
                      <div>
                        <p className={`text-sm font-medium ${active ? "text-gray-900" : "text-gray-700"}`}>
                          {t.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Info Banner — describes what to fill */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <TypeIcon className="h-4 w-4" />
                  {currentType.label}
                </p>
                <p className="mt-1 text-sm text-blue-800">{currentType.description}</p>
                <p className="mt-1 text-xs italic text-blue-600">{currentType.example}</p>
              </div>
            </div>

            {/* STEP 3: Basic Info */}
            <section>
              <SectionHeader number={3} title="Basic Information" description="Identify and categorize this question" />
              <div className="mt-3 space-y-4">
                <div>
                  <Label required>Question Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Climate Change Impact on Oceans"
                  />
                  <p className="mt-1 text-xs text-gray-500">Short name so you can identify this question later</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Difficulty Level</Label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => setDifficulty(d.value)}
                          className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                            difficulty === d.value ? d.color : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label required>Marks</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={marks}
                      onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                      placeholder="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">Points for this question</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrediction}
                      onChange={(e) => setIsPrediction(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      Mark as Prediction (high priority)
                    </span>
                  </label>

                  {isSuperAdmin && (
                    <label className="flex items-center gap-2 cursor-pointer rounded-md border border-green-200 bg-green-50 px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                      <span className="text-sm font-medium text-green-700">
                        🌍 Public (free for all students)
                      </span>
                    </label>
                  )}
                </div>

                <div>
                  <Label>Tags (optional)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., environment, science, graph"
                  />
                  <p className="mt-1 text-xs text-gray-500">Comma-separated. Helps students filter by topic.</p>
                </div>
              </div>
            </section>

            {/* STEP 4: Question Content (dynamic based on type) */}
            <section>
              <SectionHeader number={4} title="Question Content" description={`Fill the specific fields for ${currentType.label}`} />

              <div className="mt-3 space-y-4">

                {/* Audio — Upload OR URL */}
                {fields.has("audio-url") && (
                  <div>
                    <Label required>
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-orange-600" />
                        Audio File
                      </span>
                    </Label>
                    <MediaUploader
                      kind="audio"
                      value={audioUrl}
                      onChange={setAudioUrl}
                      folder="questions/audio"
                    />
                  </div>
                )}

                {/* Image — Upload OR URL */}
                {fields.has("image-url") && (
                  <div>
                    <Label required>
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-teal-600" />
                        Image File
                      </span>
                    </Label>
                    <MediaUploader
                      kind="image"
                      value={imageUrl}
                      onChange={setImageUrl}
                      folder="questions/images"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Image of graph, chart, photograph for students to describe.
                    </p>
                  </div>
                )}

                {/* Text (generic — read aloud, respond, reference) */}
                {fields.has("text") && (
                  <div>
                    <Label required>
                      {typeValue === "READ_ALOUD" ? "Text to Read Aloud" :
                       typeValue === "REPEAT_SENTENCE" ? "Sentence Student Should Say" :
                       typeValue === "DESCRIBE_IMAGE" ? "Reference Points for Scoring" :
                       typeValue === "RETELL_LECTURE" ? "Lecture Reference Points" :
                       typeValue === "ANSWER_SHORT_QUESTION" ? "Question" :
                       typeValue === "RESPOND_TO_SITUATION" ? "Scenario/Situation" :
                       typeValue === "SUMMARIZE_SPOKEN_TEXT" ? "Audio Transcript (for reference)" :
                       "Question Text"}
                    </Label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        typeValue === "READ_ALOUD"
                          ? "Enter the text the student should read aloud..."
                          : "Enter the content..."
                      }
                      rows={4}
                    />
                  </div>
                )}

                {/* Passage (MCQ, SWT) */}
                {fields.has("passage") && (
                  <div>
                    <Label required>Reading Passage</Label>
                    <Textarea
                      value={passage}
                      onChange={(e) => setPassage(e.target.value)}
                      placeholder="Paste the full reading passage here..."
                      rows={8}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This is what students will read. Keep it between 150-300 words for best difficulty.
                    </p>
                  </div>
                )}

                {/* Essay Prompt */}
                {fields.has("prompt") && (
                  <div>
                    <Label required>Essay Prompt / Topic</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Do you think social media has a positive or negative impact on society? Discuss with examples."
                      rows={3}
                    />
                  </div>
                )}

                {/* Word Limits */}
                {fields.has("word-limits") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Minimum Words</Label>
                      <Input
                        type="number"
                        value={minWords}
                        onChange={(e) => setMinWords(parseInt(e.target.value) || 0)}
                        placeholder="200"
                      />
                    </div>
                    <div>
                      <Label>Maximum Words</Label>
                      <Input
                        type="number"
                        value={maxWords}
                        onChange={(e) => setMaxWords(parseInt(e.target.value) || 0)}
                        placeholder="300"
                      />
                    </div>
                  </div>
                )}

                {/* MCQ Options - Single or Multiple */}
                {(fields.has("options-single") || fields.has("options-multiple")) && (
                  <>
                    <div>
                      <Label required>Question</Label>
                      <Input
                        value={question}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="What is the main idea of the passage?"
                      />
                    </div>

                    <div>
                      <Label required>
                        Answer Options
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {fields.has("options-multiple")
                            ? "(Check ALL correct answers)"
                            : "(Select the ONE correct answer)"}
                        </span>
                      </Label>
                      <div className="mt-2 space-y-2">
                        {options.map((opt, i) => {
                          const isCorrect = fields.has("options-multiple")
                            ? correctAnswers.includes(i)
                            : correctAnswer === i;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-3 rounded-lg border-2 p-3 transition ${
                                isCorrect
                                  ? "border-green-400 bg-green-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <input
                                type={fields.has("options-multiple") ? "checkbox" : "radio"}
                                name="correct-option"
                                checked={isCorrect}
                                onChange={() => {
                                  if (fields.has("options-multiple")) {
                                    setCorrectAnswers((prev) =>
                                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                                    );
                                  } else {
                                    setCorrectAnswer(i);
                                  }
                                }}
                                className="h-5 w-5 shrink-0"
                              />
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(i, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                className="flex-1 border-0 shadow-none focus:ring-0"
                              />
                              {options.length > 2 && (
                                <button
                                  onClick={() => removeOption(i)}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <button
                          onClick={addOption}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-2 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                        >
                          <Plus className="h-4 w-4" />
                          Add another option
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Tip: {fields.has("options-multiple")
                          ? "Check the box next to EVERY correct option. Students need to pick all of them."
                          : "Click the radio button next to the correct option. Only ONE can be correct."}
                      </p>
                    </div>
                  </>
                )}

                {/* Reorder Paragraphs */}
                {fields.has("paragraphs-reorder") && (
                  <div>
                    <Label required>Paragraphs (enter in CORRECT order)</Label>
                    <div className="mt-2 space-y-2">
                      {paragraphs.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <Textarea
                              value={p}
                              onChange={(e) => updateParagraph(i, e.target.value)}
                              placeholder={`Paragraph ${i + 1}...`}
                              rows={2}
                            />
                          </div>
                          {paragraphs.length > 2 && (
                            <button
                              onClick={() => removeParagraph(i)}
                              className="mt-3 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addParagraph}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-2 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                      >
                        <Plus className="h-4 w-4" />
                        Add another paragraph
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Enter paragraphs in the CORRECT order. Students will see them shuffled and need to rearrange.
                    </p>
                  </div>
                )}

                {/* Fill in Blanks */}
                {fields.has("fill-blanks") && (
                  <>
                    <div>
                      <Label required>Passage with [blank] markers</Label>
                      <Textarea
                        value={fillBlanksPassage}
                        onChange={(e) => setFillBlanksPassage(e.target.value)}
                        placeholder="The cat sat on the [blank]. It was a sunny [blank]."
                        rows={5}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Use <code className="rounded bg-gray-100 px-1 py-0.5">[blank]</code> where you want students to fill in a word.
                      </p>
                    </div>

                    <div>
                      <Label>Correct Answers (in order)</Label>
                      <div className="mt-2 space-y-2">
                        {fillBlanksAnswers.map((ans, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                              {i + 1}
                            </span>
                            <Input
                              value={ans}
                              onChange={(e) => updateBlankAnswer(i, e.target.value)}
                              placeholder={`Answer for blank #${i + 1}`}
                            />
                            {fillBlanksAnswers.length > 1 && (
                              <button
                                onClick={() => removeBlankAnswer(i)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={addBlankAnswer}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add another blank answer
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Correct Text (Dictation, Short Answer) */}
                {fields.has("correct-text") && (
                  <div>
                    <Label required>
                      {typeValue === "WRITE_FROM_DICTATION"
                        ? "Exact Sentence (what student should type)"
                        : "Correct Answer"}
                    </Label>
                    <Textarea
                      value={correctText}
                      onChange={(e) => setCorrectText(e.target.value)}
                      placeholder={
                        typeValue === "WRITE_FROM_DICTATION"
                          ? "The professor explained the theory of evolution in detail."
                          : "Botany"
                      }
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* STEP 5: Optional - Model Answer & Explanation */}
            <section>
              <SectionHeader number={5} title="Optional: Model Answer & Explanation" description="Help students understand the ideal response" />
              <div className="mt-3 space-y-4">
                <div>
                  <Label>Model Answer</Label>
                  <Textarea
                    value={modelAnswer}
                    onChange={(e) => setModelAnswer(e.target.value)}
                    placeholder="The ideal answer for reference. Students will see this after submitting."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Explanation</Label>
                  <Textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain why this is the correct answer or how to approach it."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                ⚠ {error}
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            <SectionIcon className="inline h-3 w-3" /> {section} / <TypeIcon className="inline h-3 w-3" /> {currentType.label}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {isEditing ? "Update Question" : "Save Question"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function SectionHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className || ""}`}
    />
  );
}
