"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles } from "lucide-react";
import { pickWordOfDay } from "@/lib/vocabulary";

// Fallback vocabulary — used until words are added via the admin Vocabulary page.
// Synthetic "sample-" ids: this list only ever shows before the real fetch
// resolves (or if it comes back empty), so there's nothing real to persist
// progress against — a failed progress POST for one of these is harmless.
const SAMPLE_VOCAB = [
  { id: "sample-1", word: "Ubiquitous", meaning: "Present, appearing, or found everywhere", example: "Mobile phones have become ubiquitous in modern society.", category: "academic", difficulty: "MEDIUM", dayNumber: null },
  { id: "sample-2", word: "Pragmatic", meaning: "Dealing with things sensibly and realistically", example: "A pragmatic approach to solving environmental issues.", category: "academic", difficulty: "MEDIUM", dayNumber: null },
  { id: "sample-3", word: "Mitigate", meaning: "Make less severe, serious, or painful", example: "Measures to mitigate the effects of climate change.", category: "academic", difficulty: "MEDIUM", dayNumber: null },
  { id: "sample-4", word: "Facilitate", meaning: "Make an action or process easier", example: "Technology facilitates communication across borders.", category: "academic", difficulty: "EASY", dayNumber: null },
  { id: "sample-5", word: "Unprecedented", meaning: "Never done or known before", example: "The pandemic caused unprecedented disruption globally.", category: "academic", difficulty: "HARD", dayNumber: null },
  { id: "sample-6", word: "Albeit", meaning: "Although", example: "It was a significant, albeit small, improvement.", category: "academic", difficulty: "HARD", dayNumber: null },
  { id: "sample-7", word: "Constitute", meaning: "Be a part of a whole", example: "Women constitute 50% of the workforce.", category: "academic", difficulty: "EASY", dayNumber: null },
  { id: "sample-8", word: "Inevitable", meaning: "Certain to happen; unavoidable", example: "Change is inevitable in a growing economy.", category: "academic", difficulty: "EASY", dayNumber: null },
  { id: "sample-9", word: "Discrepancy", meaning: "An illogical or surprising difference", example: "There was a discrepancy between the two reports.", category: "academic", difficulty: "MEDIUM", dayNumber: null },
  { id: "sample-10", word: "Implications", meaning: "The effect or consequence of an action", example: "The implications of the new policy are far-reaching.", category: "academic", difficulty: "EASY", dayNumber: null },
];

interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  meaningHi?: string | null;
  meaningPa?: string | null;
  example: string;
  category: string | null;
  difficulty: string;
  dayNumber?: number | null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10; // safety cap — 1000 words is already a very large list for this feature

export default function VocabularyPage() {
  const [vocab, setVocab] = useState<VocabWord[]>(SAMPLE_VOCAB);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"list" | "flashcard">("list");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Loads every page up to MAX_PAGES, replacing SAMPLE_VOCAB with page 1 as
    // soon as it arrives rather than waiting for the whole list.
    const loadAll = async () => {
      let p = 1;
      let totalPages = 1;
      setLoadingMore(true);
      do {
        const res = await fetch(`/api/vocabulary?page=${p}&pageSize=${PAGE_SIZE}`).then((r) => r.json()).catch(() => null);
        if (cancelled || !res?.success) break;
        totalPages = Math.min(res.data.totalPages || 1, MAX_PAGES);
        setVocab((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]));
        p++;
      } while (p <= totalPages && !cancelled);
      if (!cancelled) setLoadingMore(false);
    };
    loadAll();

    // Restore previously-mastered words — this used to be purely in-memory
    // and reset on every reload despite VocabProgress existing for exactly
    // this purpose.
    fetch("/api/vocabulary/progress")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setMastered(new Set<string>(d.data.masteredIds));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const current = vocab[currentIndex];
  const wordOfDay = useMemo(() => pickWordOfDay(vocab), [vocab]);

  const markMastered = (id: string) => {
    setMastered((prev) => new Set(prev).add(id));
    fetch("/api/vocabulary/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vocabId: id, mastered: true }),
    }).catch(() => {}); // local state already updated — a failed save just means it won't survive a reload
  };

  const handleNext = () => {
    setShowMeaning(false);
    setCurrentIndex((prev) => (prev + 1) % vocab.length);
  };

  const handleMastered = () => {
    markMastered(current.id);
    handleNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Vocabulary Builder</h1>
          <p className="text-gray-500 dark:text-slate-400">
            Learn PTE-essential words — {mastered.size}/{vocab.length} mastered
            {loadingMore && <span className="ml-1 text-gray-400 dark:text-slate-500">(loading more…)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("list")}
            className={`rounded-full transition-all duration-500 ease-fluid ${mode === "list" ? "shadow-sm shadow-primary/25" : "shadow-sm"}`}
          >
            Word List
          </Button>
          <Button
            variant={mode === "flashcard" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("flashcard")}
            className={`rounded-full transition-all duration-500 ease-fluid ${mode === "flashcard" ? "shadow-sm shadow-primary/25" : "shadow-sm"}`}
          >
            Flashcards
          </Button>
        </div>
      </div>

      {/* Word of the Day */}
      {wordOfDay && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-gradient-to-br from-amber-500/10 via-background/50 to-background/50 backdrop-blur-xl ring-1 ring-amber-500/20 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-4 w-4" /> Word of the Day
                </div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{wordOfDay.word}</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{wordOfDay.meaning}</p>
                {(wordOfDay.meaningHi || wordOfDay.meaningPa) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {wordOfDay.meaningHi && <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/20">{wordOfDay.meaningHi}</Badge>}
                    {wordOfDay.meaningPa && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">{wordOfDay.meaningPa}</Badge>}
                  </div>
                )}
                <p className="mt-3 text-sm italic text-muted-foreground/80">&ldquo;{wordOfDay.example}&rdquo;</p>
              </div>
              <Button
                size="sm"
                variant={mastered.has(wordOfDay.id) ? "default" : "outline"}
                onClick={() => markMastered(wordOfDay.id)}
                disabled={mastered.has(wordOfDay.id)}
                className="shrink-0 gap-1.5 rounded-full shadow-sm"
              >
                <Check className="h-3.5 w-3.5" /> {mastered.has(wordOfDay.id) ? "Mastered" : "Mark mastered"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {(current.meaningHi || current.meaningPa) && (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {current.meaningHi && <Badge variant="outline" className="text-sm bg-orange-500/10 text-orange-700 border-orange-500/20">{current.meaningHi}</Badge>}
                        {current.meaningPa && <Badge variant="outline" className="text-sm bg-blue-500/10 text-blue-700 border-blue-500/20">{current.meaningPa}</Badge>}
                      </div>
                    )}
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
          {vocab.map((v) => (
            <Card key={v.id} className={`rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-700 ease-fluid hover:shadow-float hover:-translate-y-1 ${mastered.has(v.id) ? "opacity-50" : ""}`}>
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
                    {mastered.has(v.id) && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    {v.meaning}
                    {(v.meaningHi || v.meaningPa) && (
                      <span className="ml-2 inline-flex gap-1.5 align-middle">
                        {v.meaningHi && <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">({v.meaningHi})</span>}
                        {v.meaningPa && <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">({v.meaningPa})</span>}
                      </span>
                    )}
                  </p>
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
