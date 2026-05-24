"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  resolved: boolean;
  createdAt: string;
  question: { id: string; title: string; type: string; section: string };
  user: { name: string; email: string };
}

const REASON_LABELS: Record<string, string> = {
  WRONG_ANSWER: "Wrong Answer",
  BAD_AUDIO: "Bad Audio",
  UNCLEAR_QUESTION: "Unclear Question",
  BROKEN_IMAGE: "Broken Image",
  OTHER: "Other",
};

export default function QuestionReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const fetchReports = () => {
    setLoading(true);
    fetch(`/api/questions/report?resolved=${showResolved}`)
      .then(r => r.json())
      .then(d => { if (d.success) setReports(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, [showResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolve = async (id: string) => {
    await fetch("/api/questions/report", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Question Reports</h1>
          <p className="text-gray-500 dark:text-slate-400">Student-reported issues with questions</p>
        </div>
        <div className="flex gap-2">
          <Button variant={!showResolved ? "default" : "outline"} size="sm" onClick={() => setShowResolved(false)}>Open</Button>
          <Button variant={showResolved ? "default" : "outline"} size="sm" onClick={() => setShowResolved(true)}>Resolved</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
              <p className="mt-3 text-gray-500">{showResolved ? "No resolved reports." : "No open reports — all clear!"}</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {reports.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-4 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 truncate dark:text-slate-100">{r.question.title}</p>
                      <Badge variant="secondary" className="text-xs">{r.question.section}</Badge>
                      <Badge variant="warning" className="text-xs">{REASON_LABELS[r.reason] || r.reason}</Badge>
                    </div>
                    {r.details && <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">&ldquo;{r.details}&rdquo;</p>}
                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      by {r.user.name} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {!r.resolved && (
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id)} className="shrink-0 text-green-600 border-green-200 hover:bg-green-50">
                      Mark Resolved
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
