"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic, PenTool, BookOpen, Headphones,
  ArrowRight, Star, PlayCircle,
} from "lucide-react";

const SECTION_CONFIG: Record<string, {
  title: string;
  icon: any;
  color: string;
  gradient: string;
  types: { type: string; label: string; description: string; timeLimit: string }[];
}> = {
  speaking: {
    title: "Speaking",
    icon: Mic,
    color: "teal",
    gradient: "from-teal-500 to-teal-600",
    types: [
      { type: "READ_ALOUD", label: "Read Aloud", description: "Read a text aloud with clear pronunciation", timeLimit: "30-40 sec" },
      { type: "REPEAT_SENTENCE", label: "Repeat Sentence", description: "Listen and repeat the sentence exactly", timeLimit: "15 sec" },
      { type: "DESCRIBE_IMAGE", label: "Describe Image", description: "Describe the image in detail", timeLimit: "25+40 sec" },
      { type: "RETELL_LECTURE", label: "Re-tell Lecture", description: "Listen to a lecture and re-tell it", timeLimit: "10+40 sec" },
      { type: "ANSWER_SHORT_QUESTION", label: "Answer Short Question", description: "Listen and give a short answer", timeLimit: "10 sec" },
      { type: "RESPOND_TO_SITUATION", label: "Respond to a Situation", description: "Listen to a situation and respond appropriately", timeLimit: "20 sec" },
    ],
  },
  writing: {
    title: "Writing",
    icon: PenTool,
    color: "blue",
    gradient: "from-blue-500 to-blue-600",
    types: [
      { type: "SUMMARIZE_WRITTEN_TEXT", label: "Summarize Written Text", description: "Read a passage and write a one-sentence summary (5-75 words)", timeLimit: "10 min" },
      { type: "WRITE_ESSAY", label: "Write Essay", description: "Write a 200-300 word essay on the given topic", timeLimit: "20 min" },
    ],
  },
  reading: {
    title: "Reading",
    icon: BookOpen,
    color: "purple",
    gradient: "from-purple-500 to-purple-600",
    types: [
      { type: "READING_MCQ_SINGLE", label: "Multiple Choice (Single)", description: "Read the passage and choose the single best answer", timeLimit: "2 min" },
      { type: "READING_MCQ_MULTIPLE", label: "Multiple Choice (Multiple)", description: "Read the passage and choose all correct answers", timeLimit: "2 min" },
      { type: "REORDER_PARAGRAPHS", label: "Re-order Paragraphs", description: "Drag and drop paragraphs in the correct order", timeLimit: "2 min" },
      { type: "READING_FILL_BLANKS_DRAG", label: "Fill in the Blanks (Drag & Drop)", description: "Drag words from the box to fill in blanks", timeLimit: "2 min" },
      { type: "READING_FILL_BLANKS_DROPDOWN", label: "Fill in the Blanks (Dropdown)", description: "Select the correct word from the dropdown for each blank", timeLimit: "2 min" },
    ],
  },
  listening: {
    title: "Listening",
    icon: Headphones,
    color: "orange",
    gradient: "from-orange-500 to-orange-600",
    types: [
      { type: "SUMMARIZE_SPOKEN_TEXT", label: "Summarize Spoken Text", description: "Listen to an audio and write a 50-70 word summary", timeLimit: "10 min" },
      { type: "LISTENING_MCQ_SINGLE", label: "Multiple Choice (Single)", description: "Listen and choose the single best answer", timeLimit: "2 min" },
      { type: "LISTENING_MCQ_MULTIPLE", label: "Multiple Choice (Multiple)", description: "Listen and choose all correct answers", timeLimit: "2 min" },
      { type: "LISTENING_FILL_BLANKS", label: "Fill in the Blanks", description: "Listen and fill in the missing words in the transcript", timeLimit: "2 min" },
      { type: "HIGHLIGHT_CORRECT_SUMMARY", label: "Highlight Correct Summary", description: "Listen and choose the paragraph that best summarizes the audio", timeLimit: "2 min" },
      { type: "SELECT_MISSING_WORD", label: "Select Missing Word", description: "Audio stops — choose the word that completes it", timeLimit: "2 min" },
      { type: "WRITE_FROM_DICTATION", label: "Write from Dictation", description: "Listen and type the exact sentence you hear", timeLimit: "1 min" },
    ],
  },
};

export default function PracticeSectionPage() {
  const params = useParams();
  const sectionKey = (params.section as string)?.toLowerCase();
  const config = SECTION_CONFIG[sectionKey];

  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/questions?section=${config?.title.toUpperCase()}&pageSize=1`);
        const data = await res.json();
        if (data.success) {
          // Just set total for now, individual type counts can be fetched later
          setQuestionCounts({ total: data.data.total });
        }
      } catch {}
    };
    if (config) fetchCounts();
  }, [config]);

  if (!config) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Invalid section. Choose Speaking, Writing, Reading, or Listening.</p>
      </div>
    );
  }

  const SectionIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className={`rounded-2xl bg-gradient-to-r ${config.gradient} p-6 text-white sm:p-8`}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <SectionIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{config.title} Practice</h1>
            <p className="mt-1 text-white/80">
              {config.types.length} question types &bull; {questionCounts.total || 0} questions available
            </p>
          </div>
        </div>
      </div>

      {/* Question Types Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {config.types.map((qt, index) => (
          <Link key={qt.type} href={`/practice/${sectionKey}/${qt.type.toLowerCase()}`}>
            <Card className="group h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex h-full items-start gap-4 p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${config.color}-100`}>
                  <PlayCircle className={`h-5 w-5 text-${config.color}-600`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{qt.label}</h3>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-600 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{qt.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {qt.timeLimit}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Type {index + 1}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Weekly Predictions */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-amber-500" />
            <div>
              <h3 className="font-semibold text-amber-900">Weekly Predictions</h3>
              <p className="text-sm text-amber-700">High-probability questions for this week</p>
            </div>
          </div>
          <Link href={`/practice/${sectionKey}?prediction=true`}>
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              View Predictions
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
