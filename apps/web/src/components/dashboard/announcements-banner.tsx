"use client";

import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  isGlobal: boolean;
  createdAt: string;
}

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("dismissed_announcements");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    fetch("/api/announcements")
      .then(r => r.json())
      .then(data => { if (data.success) setAnnouncements(data.data); })
      .catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{a.title}</p>
            <p className="text-sm text-indigo-700 mt-0.5">{a.message}</p>
          </div>
          <button onClick={() => dismiss(a.id)} className="shrink-0 text-indigo-400 hover:text-indigo-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
