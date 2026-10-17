"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Megaphone, Plus, Trash2, Pencil } from "lucide-react";

interface Announcement { id: string; title: string; message: string; isGlobal: boolean; createdAt: string }

export default function AnnouncementsPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Set while editing an existing announcement instead of creating a new
  // one — previously the only way to fix a typo was delete + recreate,
  // which loses the original post's position/date.
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchList = () => {
    fetch("/api/announcements").then(r => r.json()).then(d => { if (d.success) setList(d.data); }).finally(() => setLoading(false));
  };
  useEffect(() => { fetchList(); }, []);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setMessage("");
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setMessage(a.message);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, title, message } : { title, message }),
      });
      const data = await res.json();
      if (data.success) {
        setList(prev => editingId ? prev.map(a => a.id === editingId ? data.data : a) : [data.data, ...prev]);
        closeForm();
      } else {
        toast("error", data.error || `Failed to ${editingId ? "update" : "post"} announcement`);
      }
    } catch {
      toast("error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ description: "Delete this announcement? Students will no longer see it.", confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    const res = await fetch("/api/announcements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if ((await res.json()).success) {
      setList(prev => prev.filter(a => a.id !== id));
      toast("success", "Announcement deleted");
    } else {
      toast("error", "Failed to delete announcement");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Announcements</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">Send messages to all your students</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : setShowForm(true))} size="lg" className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide"><Plus className="h-5 w-5" /> New</Button>
      </div>

      {showForm && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-indigo-500/10 backdrop-blur-xl ring-1 ring-indigo-500/20">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input className="w-full rounded-2xl border-none bg-background/40 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground" placeholder="Title (e.g. Holiday schedule)" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea
                className="min-h-[80px] w-full rounded-2xl border-none bg-background/40 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground placeholder:text-slate-500"
                placeholder="Message for your students..."
                value={message} onChange={e => setMessage(e.target.value)} required
              />
              <div className="flex gap-2">
                <Button type="submit" loading={submitting} className="rounded-full shadow-sm hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid">{editingId ? "Save Changes" : "Post Announcement"}</Button>
                <Button type="button" variant="outline" onClick={closeForm} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
          ) : list.length === 0 ? (
            <div className="py-20 text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><Megaphone className="h-10 w-10 text-primary" /></div><p className="text-lg font-medium text-muted-foreground">No announcements yet.</p></div>
          ) : (
            <div className="divide-y divide-white/5">
              {list.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-4 p-6 transition-colors duration-500 hover:bg-white/5 group">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-foreground">{a.title}</p>
                      {a.isGlobal && <Badge variant="secondary">Global</Badge>}
                    </div>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{a.message}</p>
                    <p className="mt-4 text-xs font-bold tracking-widest uppercase text-muted-foreground/60">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  {!a.isGlobal && (
                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-fluid">
                      <button onClick={() => openEdit(a)} className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 hover:scale-110 transition-all duration-700 ease-fluid shadow-inner"><Pencil className="h-5 w-5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:scale-110 transition-all duration-700 ease-fluid shadow-inner"><Trash2 className="h-5 w-5" /></button>
                    </div>
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
