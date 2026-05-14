"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2 } from "lucide-react";

interface Announcement { id: string; title: string; message: string; isGlobal: boolean; createdAt: string }

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchList = () => {
    fetch("/api/announcements").then(r => r.json()).then(d => { if (d.success) setList(d.data); }).finally(() => setLoading(false));
  };
  useEffect(() => { fetchList(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    });
    const data = await res.json();
    if (data.success) { setList(prev => [data.data, ...prev]); setTitle(""); setMessage(""); setShowForm(false); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch("/api/announcements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if ((await res.json()).success) setList(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500">Send messages to all your students</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus className="h-4 w-4" /> New</Button>
      </div>

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input placeholder="Title (e.g. Holiday schedule)" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Message for your students..."
                value={message} onChange={e => setMessage(e.target.value)} required
              />
              <div className="flex gap-2">
                <Button type="submit" loading={submitting}>Post Announcement</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center"><Megaphone className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-3 text-gray-500">No announcements yet.</p></div>
          ) : (
            <div className="divide-y">
              {list.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{a.title}</p>
                      {a.isGlobal && <Badge variant="secondary">Global</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{a.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  {!a.isGlobal && (
                    <button onClick={() => handleDelete(a.id)} className="shrink-0 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
