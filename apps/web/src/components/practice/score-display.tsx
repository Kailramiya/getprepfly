"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

interface ScoreDisplayProps {
  scores: {
    overall: number;
    [key: string]: any;
  };
  type: "speaking" | "writing";
  feedback?: string;
  corrections?: { original: string; corrected: string; type: string }[];
  transcription?: string;
}

function scoreColor(score: number): string {
  if (score >= 79) return "text-green-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 79) return "bg-green-100";
  if (score >= 65) return "bg-blue-100";
  if (score >= 50) return "bg-amber-100";
  return "bg-red-100";
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 79) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (score >= 50) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export function ScoreDisplay({ scores, type, feedback, corrections, transcription }: ScoreDisplayProps) {
  const speakingMetrics = ["pronunciation", "fluency", "content"];
  const writingMetrics = ["grammar", "spelling", "content", "structure", "vocabulary"];
  const metrics = type === "speaking" ? speakingMetrics : writingMetrics;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="overflow-hidden">
        <div className={`${scoreBg(scores.overall)} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Score</p>
              <p className={`text-4xl font-bold ${scoreColor(scores.overall)}`}>
                {scores.overall}
                <span className="text-lg text-gray-400">/90</span>
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <ScoreIcon score={scores.overall} />
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const value = scores[metric] ?? 0;
              return (
                <div key={metric} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium capitalize text-gray-500">{metric}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className={`text-xl font-bold ${scoreColor(value)}`}>{value}</p>
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            value >= 79 ? "bg-green-500" :
                            value >= 65 ? "bg-blue-500" :
                            value >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${(value / 90) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Word count for writing */}
          {type === "writing" && scores.wordCount !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">Word count: {scores.wordCount}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcription (for speaking) */}
      {transcription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">{transcription}</p>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {feedback && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="flex gap-3 p-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-900">AI Feedback</p>
              <p className="mt-1 text-sm text-indigo-700">{feedback}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Corrections (for writing) */}
      {corrections && corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Corrections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {corrections.map((c, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                  <Badge variant="destructive" className="shrink-0 text-xs">{c.type}</Badge>
                  <div>
                    <p className="text-sm">
                      <span className="text-red-600 line-through">{c.original}</span>
                      {" → "}
                      <span className="font-medium text-green-700">{c.corrected}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
