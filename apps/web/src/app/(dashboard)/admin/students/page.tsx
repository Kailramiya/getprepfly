"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Search, Users, Trash2, Mail, Send, Clock, CheckCircle2, UserPlus, XCircle, RotateCcw, Link2, Copy, Check } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  studentPlan: { planType: string; status: string } | null;
  centreSeats: Array<{ status: string; startDate: string; endDate: string }>;
  _count: { attempts: number; mockTests: number };
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cancelingSeat, setCancelingSeat] = useState<string | null>(null);
  const [renewingSeat, setRenewingSeat] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; createdAt: string }>>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const generateLink = async () => {
    setGeneratingLink(true);
    setInviteMsg(null);
    setInviteLink(null);
    try {
      const res = await fetch("/api/centres/invite-link", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setInviteLink(data.data.url);
        setLinkCopied(false);
      } else {
        setInviteMsg({ type: "error", text: data.error || "Failed to generate link" });
      }
    } catch {
      setInviteMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

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

  const renewSeat = async (studentId: string, studentName: string) => {
    if (!confirm(`Renew access for "${studentName}" for 1 month (30 days)?`)) return;
    setRenewingSeat(studentId);
    try {
      const res = await fetch(`/api/centres/students/${studentId}/renew`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.data.message);
        const c = new AbortController();
        fetchStudents(centreId!, search, c.signal);
      } else {
        alert(data.error || "Failed to renew access");
      }
    } catch { alert("Failed to renew. Please try again."); }
    finally { setRenewingSeat(null); }
  };

  const cancelSeat = async (studentId: string, studentName: string) => {
    if (!confirm(`Cancel access for "${studentName}"?\n\nThis will revoke their current month's access immediately. No refund will be issued.`)) return;
    setCancelingSeat(studentId);
    try {
      const res = await fetch(`/api/centres/students/${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.map((s) =>
          s.id === studentId
            ? { ...s, centreSeats: s.centreSeats.map((seat) => ({ ...seat, status: "CANCELLED" })) }
            : s
        ));
      } else {
        alert(data.error || "Failed to cancel access");
      }
    } catch {
      alert("Failed to cancel access. Please try again.");
    } finally {
      setCancelingSeat(null);
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
        const c = new AbortController();
        fetchPendingInvites(c.signal);
        if (data.data.status === "linked") fetchStudents(centreId!, search, c.signal);
      } else {
        setInviteMsg({ type: "error", text: data.error || "Failed to send invite" });
      }
    } catch {
      setInviteMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setInviting(false);
    }
  };

  const centreId = user?.centreId ?? null;

  const fetchStudents = async (cid: string, q: string, signal: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: "1", pageSize: "50" });
      const res = await fetch(`/api/centres/${cid}/students?${params}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setStudents(data.data.items);
    } catch {
      // AbortError or network error — silently ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/centres/invite-student", { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setPendingInvites(data.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!centreId) { setLoading(false); return; }
    const controller = new AbortController();
    fetchStudents(centreId, search, controller.signal);
    fetchPendingInvites(controller.signal);
    return () => controller.abort(); // cancel on unmount or dep change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Students</h1>
          <p className="text-gray-500 dark:text-slate-400">Manage your coaching centre students</p>
        </div>
      </div>

      {/* Invite Student Card */}
      <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-teal-50 dark:from-slate-800 dark:to-slate-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Invite a Student</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
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
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <Button onClick={sendInvite} disabled={!inviteEmail.trim() || inviting} loading={inviting} className="gap-2 shrink-0">
                  <Send className="h-4 w-4" />
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </div>

              {inviteMsg && (
                <div className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  inviteMsg.type === "success"
                    ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                  {inviteMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                  {inviteMsg.text}
                </div>
              )}

              {/* Share-a-link fallback (for when invite emails don't arrive) */}
              <div className="mt-4 border-t border-gray-200 dark:border-slate-600 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Email not arriving? Generate a single-use link and send it to the student yourself.
                  </p>
                  <Button variant="outline" onClick={generateLink} loading={generatingLink} className="gap-2 shrink-0">
                    <Link2 className="h-4 w-4" />
                    {generatingLink ? "Generating..." : "Generate invite link"}
                  </Button>
                </div>

                {inviteLink && (
                  <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-700 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteLink}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full rounded-md border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-700 dark:text-slate-300"
                      />
                      <Button size="sm" onClick={copyLink} className="gap-1 shrink-0">
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      ⏱ Single use — works for one student and expires in 1 hour. Generate a fresh link for each student.
                    </p>
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {pendingInvites.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Pending Invitations ({pendingInvites.length})</p>
                  <div className="mt-2 space-y-1.5">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-700 px-3 py-2 text-sm border border-gray-100 dark:border-slate-600">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="flex-1 text-gray-700 dark:text-slate-300">{invite.email}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {new Date(invite.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-md bg-white/60 dark:bg-slate-700/60 p-3">
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">How it works:</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-gray-600 dark:text-slate-400">
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
              <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
              <p className="mt-4 text-gray-500 dark:text-slate-400">No students yet. Share your invite link to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Name</th>
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Email</th>
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Access</th>
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Expires</th>
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Practice</th>
                    <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Joined</th>
                    <th className="pb-3 text-right font-medium text-gray-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/admin/students/${student.id}`} className="font-medium text-indigo-700 dark:text-indigo-400 hover:underline">{student.name}</Link>
                            {student.phone && (
                              <p className="text-xs text-gray-400 dark:text-slate-500">{student.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600 dark:text-slate-400">{student.email}</td>
                      <td className="py-3">
                        {student.centreSeats[0] ? (
                          <Badge variant={
                            student.centreSeats[0].status === "CANCELLED" ? "destructive" :
                            new Date(student.centreSeats[0].endDate) < new Date() ? "warning" : "success"
                          }>
                            {student.centreSeats[0].status === "CANCELLED" ? "Cancelled" :
                             new Date(student.centreSeats[0].endDate) < new Date() ? "Expired" : "Active"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No Seat</Badge>
                        )}
                      </td>
                      <td className="py-3 text-sm">
                        {student.centreSeats[0] && student.centreSeats[0].status === "ACTIVE" ? (
                          <span className={
                            new Date(student.centreSeats[0].endDate) < new Date(Date.now() + 7 * 86400000)
                              ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-600 dark:text-slate-400"
                          }>
                            {new Date(student.centreSeats[0].endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-slate-400">{student._count.attempts} attempts</td>
                      <td className="py-3 text-gray-500 dark:text-slate-500">
                        {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Renew: show when expired or cancelled */}
                          {(!student.centreSeats[0] || student.centreSeats[0].status === "CANCELLED" || new Date(student.centreSeats[0].endDate) <= new Date()) && (
                            <Button variant="ghost" size="sm"
                              onClick={() => renewSeat(student.id, student.name)}
                              disabled={renewingSeat === student.id}
                              className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400"
                              title="Renew access for 1 month"
                            >
                              {renewingSeat === student.id
                                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
                                : <RotateCcw className="h-4 w-4" />}
                            </Button>
                          )}
                          {/* Cancel: show when active */}
                          {student.centreSeats[0]?.status === "ACTIVE" && new Date(student.centreSeats[0].endDate) > new Date() && (
                            <Button variant="ghost" size="sm"
                              onClick={() => cancelSeat(student.id, student.name)}
                              disabled={cancelingSeat === student.id}
                              className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                              title="Cancel seat access (no refund)"
                            >
                              {cancelingSeat === student.id
                                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" />
                                : <XCircle className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(student.id, student.name)}
                            disabled={deleting === student.id}
                            className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete student permanently"
                          >
                            {deleting === student.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
