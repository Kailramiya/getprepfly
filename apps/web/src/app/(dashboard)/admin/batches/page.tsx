"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, BarChart2 } from "lucide-react";
import Link from "next/link";

interface Batch {
  id: string;
  name: string;
  createdAt: string;
  _count: { members: number };
  members: { user: { id: string; name: string; email: string } }[];
}

export default function BatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.centreId) return;
    const loadBatches = async () => {
      const res = await fetch(`/api/centres/${user.centreId}/batches`);
      const data = await res.json();
      if (data.success) setBatches(data.data);
      setLoading(false);
    };
    loadBatches();
  }, [user?.centreId]);

  const fetchBatches = async () => {
    const res = await fetch(`/api/centres/${user?.centreId}/batches`);
    const data = await res.json();
    if (data.success) setBatches(data.data);
    setLoading(false);
  };

  const createBatch = async () => {
    if (!newBatchName.trim() || !user?.centreId) return;
    setCreating(true);
    const res = await fetch(`/api/centres/${user.centreId}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBatchName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setNewBatchName("");
      setShowCreate(false);
      fetchBatches();
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Batches</h1>
          <p className="text-base font-medium text-muted-foreground mt-2">Organize students into batches</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2 font-bold tracking-wide">
          <Plus className="h-5 w-5" /> Create Batch
        </Button>
      </div>

      {/* Create Batch Inline Form */}
      {showCreate && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-gradient-to-br from-indigo-500/10 to-teal-500/10 backdrop-blur-xl ring-1 ring-white/10 mt-4">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-6">
            <Input
              placeholder="Batch name (e.g., Morning Batch, Weekend Batch)"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="max-w-md rounded-2xl border-none bg-background/40 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid"
              onKeyDown={(e) => e.key === "Enter" && createBatch()}
            />
            <div className="flex gap-2">
              <Button onClick={createBatch} loading={creating} size="sm" className="rounded-full shadow-sm hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid">Create</Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : batches.length === 0 ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardContent className="py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-inner mb-6"><Layers className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-bold text-foreground">No batches created yet.</p>
            <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">Create batches to organize students by timing or level.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-2 hover:shadow-float transition-all duration-700 ease-fluid flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg font-bold">
                  <span>{batch.name}</span>
                  <Badge variant="secondary">{batch._count.members} students</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {batch.members.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground">No students in this batch yet</p>
                ) : (
                  <div className="space-y-3">
                    {batch.members.slice(0, 5).map((m) => (
                      <div key={m.user.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary shadow-inner">
                          {m.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{m.user.name}</p>
                          <p className="text-xs font-medium text-muted-foreground">{m.user.email}</p>
                        </div>
                      </div>
                    ))}
                    {batch.members.length > 5 && (
                      <p className="text-xs font-bold tracking-widest text-muted-foreground/60 uppercase mt-2">+{batch.members.length - 5} more</p>
                    )}
                  </div>
                )}
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-xs font-bold tracking-widest text-muted-foreground/60 uppercase">
                    Created {new Date(batch.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  <Link
                    href={`/admin/batches/${batch.id}/progress`}
                    className="flex items-center gap-1 text-xs font-bold tracking-wide text-primary hover:text-primary/80 transition-colors uppercase"
                  >
                    <BarChart2 className="h-4 w-4" />
                    Progress
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
