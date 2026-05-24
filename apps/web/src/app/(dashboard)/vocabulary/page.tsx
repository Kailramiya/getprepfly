"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

// Sample vocabulary — in production this comes from the API
const SAMPLE_VOCAB = [
  { word: "Ubiquitous", meaning: "Present, appearing, or found everywhere", example: "Mobile phones have become ubiquitous in modern society.", category: "academic", difficulty: "MEDIUM" },
  { word: "Pragmatic", meaning: "Dealing with things sensibly and realistically", example: "A pragmatic approach to solving environmental issues.", category: "academic", difficulty: "MEDIUM" },
  { word: "Mitigate", meaning: "Make less severe, serious, or painful", example: "Measures to mitigate the effects of climate change.", category: "academic", difficulty: "MEDIUM" },
  { word: "Facilitate", meaning: "Make an action or process easier", example: "Technology facilitates communication across borders.", category: "academic", difficulty: "EASY" },
  { word: "Unprecedented", meaning: "Never done or known before", example: "The pandemic caused unprecedented disruption globally.", category: "academic", difficulty: "HARD" },
  { word: "Albeit", meaning: "Although", example: "It was a significant, albeit small, improvement.", category: "academic", difficulty: "HARD" },
  { word: "Constitute", meaning: "Be a part of a whole", example: "Women constitute 50% of the workforce.", category: "academic", difficulty: "EASY" },
  { word: "Inevitable", meaning: "Certain to happen; unavoidable", example: "Change is inevitable in a growing economy.", category: "academic", difficulty: "EASY" },
  { word: "Discrepancy", meaning: "An illogical or surprising difference", example: "There was a discrepancy between the two reports.", category: "academic", difficulty: "MEDIUM" },
  { word: "Implications", meaning: "The effect or consequence of an action", example: "The implications of the new policy are far-reaching.", category: "academic", difficulty: "EASY" },
];

export default function VocabularyPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"list" | "flashcard">("list");

  const current = SAMPLE_VOCAB[currentIndex];

  const handleNext = () => {
    setShowMeaning(false);
    setCurrentIndex((prev) => (prev + 1) % SAMPLE_VOCAB.length);
  };

  const handleMastered = () => {
    setMastered((prev) => new Set(prev).add(currentIndex));
    handleNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Vocabulary Builder</h1>
          <p className="text-gray-500 dark:text-slate-400">Learn PTE-essential words — {mastered.size}/{SAMPLE_VOCAB.length} mastered</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("list")}
          >
            Word List
          </Button>
          <Button
            variant={mode === "flashcard" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("flashcard")}
          >
            Flashcards
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(mastered.size / SAMPLE_VOCAB.length) * 100}%` }}
        />
      </div>

      {mode === "flashcard" ? (
        /* Flashcard Mode */
        <div className="mx-auto max-w-lg">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center p-8 text-center transition-all"
                onClick={() => setShowMeaning(!showMeaning)}
              >
                {!showMeaning ? (
                  <>
                    <Badge variant="secondary" className="mb-4">{current.category}</Badge>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{current.word}</h2>
                    <p className="mt-4 text-sm text-gray-400 dark:text-slate-500">Tap to reveal meaning</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-indigo-600">{current.word}</h2>
                    <p className="mt-3 text-lg text-gray-700 dark:text-slate-300">{current.meaning}</p>
                    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-700/50">
                      <p className="text-sm italic text-gray-600 dark:text-slate-400">&ldquo;{current.example}&rdquo;</p>
                    </div>
                  </>
                )}
              </div>

              {showMeaning && (
                <div className="flex border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={handleNext}
                    className="flex flex-1 items-center justify-center gap-2 p-4 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <X className="h-4 w-4" />
                    Review Again
                  </button>
                  <div className="w-px bg-gray-200 dark:bg-slate-700" />
                  <button
                    onClick={handleMastered}
                    className="flex flex-1 items-center justify-center gap-2 p-4 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                  >
                    <Check className="h-4 w-4" />
                    Mastered
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
            Card {currentIndex + 1} of {SAMPLE_VOCAB.length}
          </p>
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-3">
          {SAMPLE_VOCAB.map((vocab, i) => (
            <Card key={vocab.word} className={mastered.has(i) ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{vocab.word}</h3>
                    <Badge variant={
                      vocab.difficulty === "EASY" ? "success" :
                      vocab.difficulty === "HARD" ? "destructive" : "default"
                    } className="text-xs">
                      {vocab.difficulty}
                    </Badge>
                    {mastered.has(i) && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{vocab.meaning}</p>
                  <p className="mt-1 text-xs italic text-gray-400 dark:text-slate-500">&ldquo;{vocab.example}&rdquo;</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
