"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

// Fallback vocabulary — used until words are added via the admin Vocabulary page
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

interface VocabWord {
  word: string;
  meaning: string;
  example: string;
  category: string | null;
  difficulty: string;
}

export default function VocabularyPage() {
  const [vocab, setVocab] = useState<VocabWord[]>(SAMPLE_VOCAB);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"list" | "flashcard">("list");

  useEffect(() => {
    fetch("/api/vocabulary?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.items.length > 0) setVocab(d.data.items);
      })
      .catch(() => {});
  }, []);

  const current = vocab[currentIndex];

  const handleNext = () => {
    setShowMeaning(false);
    setCurrentIndex((prev) => (prev + 1) % vocab.length);
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
          <p className="text-gray-500 dark:text-slate-400">Learn PTE-essential words — {mastered.size}/{vocab.length} mastered</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("list")}
            className={`rounded-full transition-all duration-500 ease-fluid ${mode === "list" ? "shadow-sm shadow-primary/25" : "bg-transparent border-white/10"}`}
          >
            Word List
          </Button>
          <Button
            variant={mode === "flashcard" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("flashcard")}
            className={`rounded-full transition-all duration-500 ease-fluid ${mode === "flashcard" ? "shadow-sm shadow-primary/25" : "bg-transparent border-white/10"}`}
          >
            Flashcards
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 rounded-full bg-background/50 ring-1 ring-white/10 shadow-inner overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(mastered.size / vocab.length) * 100}%` }}
        />
      </div>

      {mode === "flashcard" ? (
        /* Flashcard Mode */
        <div className="mx-auto max-w-lg">
          <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden relative">
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
                    <div className="mt-6 rounded-2xl bg-muted-foreground/5 px-6 py-4 border border-white/5 shadow-inner">
                      <p className="text-sm italic text-muted-foreground/80">&ldquo;{current.example}&rdquo;</p>
                    </div>
                  </>
                )}
              </div>

              {showMeaning && (
                <div className="flex border-t border-white/10 bg-background/30 backdrop-blur-md">
                  <button
                    onClick={handleNext}
                    className="flex flex-1 items-center justify-center gap-2 p-5 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Review Again
                  </button>
                  <div className="w-px bg-white/10" />
                  <button
                    onClick={handleMastered}
                    className="flex flex-1 items-center justify-center gap-2 p-5 text-sm font-bold text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Mastered
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
            Card {currentIndex + 1} of {vocab.length}
          </p>
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-3">
          {vocab.map((v, i) => (
            <Card key={v.word} className={`rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-700 ease-fluid hover:shadow-float hover:-translate-y-1 ${mastered.has(i) ? "opacity-50" : ""}`}>
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-extrabold tracking-tight text-foreground">{v.word}</h3>
                    <Badge variant={
                      v.difficulty === "EASY" ? "success" :
                      v.difficulty === "HARD" ? "destructive" : "default"
                    } className="text-xs">
                      {v.difficulty}
                    </Badge>
                    {mastered.has(i) && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{v.meaning}</p>
                  <p className="mt-1 text-xs italic text-gray-400 dark:text-slate-500">&ldquo;{v.example}&rdquo;</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
