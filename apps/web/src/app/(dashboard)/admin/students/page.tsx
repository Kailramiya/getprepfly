"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Trash2, Mail, Send, Clock, CheckCircle2, UserPlus } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  studentPlan: { planType: string; status: string } | null;
  _count: { attempts: number; mockTests: number };
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; createdAt: string }>>([]);

  const handleDelete = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete "${studentName}"? This will remove all their data and cannot be undone.`)) {
      return;
    }
    setDeleting(studentId);
    try {
      const res = await fetch(`/api/users/${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
      } else {
        alert(data.error || "Failed to delete student");
      }
    } catch {
      alert("Failed to delete student. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/centres/invite-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteMsg({ type: "success", text: data.data.message });
        setInviteEmail("");
        // Refresh pending invites and students list
        fetchPendingInvites();
        if (data.data.status === "linked") fetchStudents();
      } else {
        setInviteMsg({ type: "error", text: data.error || "Failed to send invite" });
      }
    } catch {
      setInviteMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setInviting(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const res = await fetch("/api/centres/invite-student");
      const data = await res.json();
      if (data.success) setPendingInvites(data.data);
    } catch {}
  };

  const fetchStudents = async () => {
    if (!user?.centreId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: "1", pageSize: "50" });
      const res = await fetch(`/api/centres/${user.centreId}/students?${params}`);
      const data = await res.json();
      if (data.success) setStudents(data.data.items);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!user.centreId) { setLoading(false); return; }
    fetchStudents();
    fetchPendingInvites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">Manage your coaching centre students</p>
        </div>
      </div>

      {/* Invite Student Card */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-teal-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">Invite a Student</h3>
              <p className="mt-1 text-sm text-gray-600">
                Enter the student&apos;s email address. They will receive an invitation link to create their account and will be automatically linked to your centre.
              </p>

              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="student@email.com"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteMsg(null); }}
                    onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <Button onClick={sendInvite} disabled={!inviteEmail.trim() || inviting} loading={inviting} className="gap-2 shrink-0">
                  <Send className="h-4 w-4" />
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </div>

              {inviteMsg && (
                <div className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  inviteMsg.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                }`}>
                  {inviteMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                  {inviteMsg.text}
                </div>
              )}

              {/* Pending Invitations */}
              {pendingInvites.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Pending Invitations ({pendingInvites.length})</p>
                  <div className="mt-2 space-y-1.5">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm border border-gray-100">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="flex-1 text-gray-700">{invite.email}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(invite.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-md bg-white/60 p-3">
                <p className="text-xs font-medium text-gray-700">How it works:</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
                  <li>Enter student&apos;s email and click Send Invite</li>
                  <li>Student receives an email with a registration link</li>
                  <li>They sign up — automatically added to your centre</li>
                  <li>If they already have an account, they&apos;re linked instantly</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search students by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            {students.length === 0 ? "No Students Yet" : `Students (${students.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No students yet. Share your invite link to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left font-medium text-gray-500">Name</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Email</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Plan</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Practice</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Mock Tests</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Joined</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            {student.phone && (
                              <p className="text-xs text-gray-400">{student.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{student.email}</td>
                      <td className="py-3">
                        <Badge variant={student.studentPlan?.planType === "FREE" ? "secondary" : "success"}>
                          {student.studentPlan?.planType || "FREE"}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-600">{student._count.attempts} attempts</td>
                      <td className="py-3 text-gray-600">{student._count.mockTests} tests</td>
                      <td className="py-3 text-gray-500">
                        {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(student.id, student.name)}
                          disabled={deleting === student.id}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        >
                          {deleting === student.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
