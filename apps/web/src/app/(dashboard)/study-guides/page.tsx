"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Mic, PenTool, BookOpen, Headphones,
  ArrowRight, Lightbulb,
} from "lucide-react";

const guides = [
  {
    section: "Speaking",
    icon: Mic,
    color: "teal",
    gradient: "from-teal-500 to-teal-600",
    tips: [
      { title: "Read Aloud Strategy", description: "How to score 79+ in Read Aloud with proper pacing and pronunciation", slug: "read-aloud-strategy" },
      { title: "Repeat Sentence Tips", description: "Memory techniques to remember and repeat long sentences accurately", slug: "repeat-sentence-tips" },
      { title: "Describe Image Template", description: "A proven template that works for graphs, charts, maps, and processes", slug: "describe-image-template" },
      { title: "Re-tell Lecture Strategy", description: "Note-taking method to capture key points and re-tell effectively", slug: "retell-lecture-strategy" },
    ],
  },
  {
    section: "Writing",
    icon: PenTool,
    color: "blue",
    gradient: "from-blue-500 to-blue-600",
    tips: [
      { title: "Essay Templates", description: "3 proven essay templates: agree/disagree, discuss both sides, problem/solution", slug: "essay-templates" },
      { title: "SWT One-Sentence Formula", description: "How to write a perfect one-sentence summary every time", slug: "swt-formula" },
      { title: "Grammar Checklist", description: "Top 10 grammar mistakes Indian students make in PTE Writing", slug: "grammar-checklist" },
      { title: "Linking Words Bank", description: "Essential linking words and phrases for cohesion and scoring high", slug: "linking-words" },
    ],
  },
  {
    section: "Reading",
    icon: BookOpen,
    color: "purple",
    gradient: "from-purple-500 to-purple-600",
    tips: [
      { title: "Reorder Paragraphs Strategy", description: "Step-by-step approach to identify the correct order quickly", slug: "reorder-strategy" },
      { title: "Fill in Blanks Technique", description: "Contextual clues and collocations to fill blanks accurately", slug: "fill-blanks-technique" },
      { title: "MCQ Elimination Method", description: "How to eliminate wrong answers and pick the right one", slug: "mcq-elimination" },
    ],
  },
  {
    section: "Listening",
    icon: Headphones,
    color: "orange",
    gradient: "from-orange-500 to-orange-600",
    tips: [
      { title: "Write from Dictation Strategy", description: "This question type gives the highest marks — learn how to ace it", slug: "dictation-strategy" },
      { title: "Summarize Spoken Text Template", description: "A simple template that covers all scoring criteria", slug: "spoken-text-template" },
      { title: "Note-taking for Listening", description: "Efficient shorthand techniques for PTE listening questions", slug: "listening-notes" },
    ],
  },
];

export default function StudyGuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Study Guides</h1>
        <p className="mt-1 text-gray-500">Tips, strategies, and templates for every PTE question type</p>
      </div>

      {/* Quick Tips Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-4 p-5">
          <Lightbulb className="h-8 w-8 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-semibold text-amber-900">Quick Tip of the Day</h3>
            <p className="text-sm text-amber-700">
              In PTE, Write from Dictation and Read Aloud contribute to MULTIPLE scoring categories.
              Prioritize these question types — they have the highest impact on your overall score.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section-wise Guides */}
      {guides.map((section) => (
        <div key={section.section}>
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${section.gradient}`}>
              <section.icon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{section.section} Guides</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.tips.map((tip) => (
              <Card key={tip.slug} className="group cursor-pointer transition hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{tip.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{tip.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gray-600 group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
