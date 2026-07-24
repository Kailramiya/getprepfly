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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Batches</h1>
          <p className="text-gray-500 dark:text-slate-400">Organize students into batches</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-full shadow-sm hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid gap-2">
          <Plus className="h-4 w-4" /> Create Batch
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
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : batches.length === 0 ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardContent className="py-16 text-center">
            <Layers className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-slate-400">No batches created yet.</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">Create batches to organize students by timing or level.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-2 hover:shadow-float transition-all duration-700 ease-fluid flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{batch.name}</span>
                  <Badge variant="secondary">{batch._count.members} students</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {batch.members.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500">No students in this batch yet</p>
                ) : (
                  <div className="space-y-2">
                    {batch.members.slice(0, 5).map((m) => (
                      <div key={m.user.id} className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                          {m.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{m.user.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{m.user.email}</p>
                        </div>
                      </div>
                    ))}
                    {batch.members.length > 5 && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">+{batch.members.length - 5} more</p>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Created {new Date(batch.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  <Link
                    href={`/admin/batches/${batch.id}/progress`}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
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
