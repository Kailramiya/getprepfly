"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Calendar } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [targetScore, setTargetScore] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scores = ["50", "58", "65", "79", "79+"];
  const dates = ["This week", "This month", "Next month", "Not booked yet"];

  const handleComplete = () => {
    setLoading(true);
    // Store in localStorage for personalized dashboard later
    if (typeof window !== "undefined") {
      localStorage.setItem("pte_target_score", targetScore || "");
      localStorage.setItem("pte_exam_date", examDate || "");
    }

    // Give a slight delay to feel like a real save, then route directly to first practice attempt
    setTimeout(() => {
      router.push("/practice/speaking/read-aloud");
    }, 500);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6">
      <div className="absolute top-6 left-6 md:top-12 md:left-12">
        <Logo size="md" showText />
      </div>

      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 ease-fluid">
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-6 ring-1 ring-teal-500/20 shadow-inner">
                <Target className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                What&apos;s your target score?
              </h1>
              <p className="text-lg text-muted-foreground">
                We&apos;ll personalize your practice recommendations.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {scores.map((score) => (
                <button
                  key={score}
                  onClick={() => setTargetScore(score)}
                  className={`flex h-16 items-center justify-center rounded-2xl border text-xl font-bold transition-all duration-300 ${
                    targetScore === score
                      ? "border-primary bg-primary text-primary-foreground shadow-float scale-105"
                      : "border-white/10 bg-card/50 text-foreground hover:bg-white/5 shadow-glass"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div className="pt-6 flex justify-center">
              <Button
                size="xl"
                onClick={() => setStep(2)}
                disabled={!targetScore}
                className="rounded-full shadow-glass hover:shadow-float font-bold px-12 transition-all duration-700 ease-fluid active:scale-[0.98]"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-6 ring-1 ring-indigo-500/20 shadow-inner">
                <Calendar className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                When is your exam?
              </h1>
              <p className="text-lg text-muted-foreground">
                We&apos;ll help you pace your preparation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dates.map((date) => (
                <button
                  key={date}
                  onClick={() => setExamDate(date)}
                  className={`flex h-16 items-center justify-center rounded-2xl border text-lg font-bold transition-all duration-300 ${
                    examDate === date
                      ? "border-primary bg-primary text-primary-foreground shadow-float scale-[1.02]"
                      : "border-white/10 bg-card/50 text-foreground hover:bg-white/5 shadow-glass"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>

            <div className="pt-6 flex justify-center gap-4">
              <Button
                variant="outline"
                size="xl"
                onClick={() => setStep(1)}
                className="rounded-full border-white/10 bg-transparent hover:bg-white/5 font-bold transition-all"
              >
                Back
              </Button>
              <Button
                size="xl"
                onClick={handleComplete}
                disabled={!examDate || loading}
                loading={loading}
                className="rounded-full shadow-glass hover:shadow-float font-bold px-12 transition-all duration-700 ease-fluid active:scale-[0.98]"
              >
                Start Practicing <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
