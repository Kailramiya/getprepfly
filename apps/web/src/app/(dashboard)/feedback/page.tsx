"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // available if needed
import { MessageSquare, Send, CheckCircle2, Star } from "lucide-react";

const CATEGORIES = [
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "feature", label: "Feature Request", emoji: "💡" },
  { value: "question", label: "Question / Content Issue", emoji: "❓" },
  { value: "scoring", label: "AI Scoring Feedback", emoji: "🎯" },
  { value: "general", label: "General Feedback", emoji: "💬" },
];

const RATINGS = [1, 2, 3, 4, 5];

export default function FeedbackPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          rating: rating || undefined,
          userEmail: user?.email,
          userName: user?.name,
          centreName: user?.centreName,
        }),
      });
      setSubmitted(true);
    } catch {
      alert("Failed to submit. Please try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-slate-100">Thank you!</h2>
        <p className="mt-2 text-gray-500 dark:text-slate-400">Your feedback has been submitted. We will use it to improve the platform.</p>
        <Button className="mt-6" onClick={() => { setSubmitted(false); setMessage(""); setRating(0); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Send Feedback</h1>
        <p className="text-gray-500 dark:text-slate-400">Help us improve Prepfly. Your feedback matters!</p>
      </div>

      <Card className="border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30">
        <CardContent className="flex items-center gap-3 p-4">
          <MessageSquare className="h-5 w-5 text-teal-600" />
          <p className="text-sm text-teal-800 dark:text-teal-300">
            Prepfly is currently in <strong>free beta</strong>. We are collecting feedback to make the platform better before the paid launch. Everything is free during this period.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What type of feedback?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    category === cat.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Rating */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                How would you rate your experience so far?
              </label>
              <div className="flex gap-1">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className="rounded p-1 transition hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        r <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Your feedback
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-gray-300 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Tell us what is working, what is broken, or what you would like to see..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <Button type="submit" loading={loading} disabled={!message.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
