"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search, Users, Trash2, Mail, Send, Clock, CheckCircle2, UserPlus,
  XCircle, RotateCcw, Link2, Copy, Check, Download, AlertTriangle,
  RefreshCw,
} from "lucide-react";

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

interface SeatUsage {
  used: number;
  total: number;
  expiring7: number;
  expiring30: number;
  planName: string | null;
  subscriptionEndDate: string | null;
}

type ExpiryFilter = "all" | "active" | "expiring7" | "expiring30" | "expired";

const FILTER_LABELS: Record<ExpiryFilter, string> = {
  all: "All",
  active: "Active",
  expiring7: "Expiring ≤7d",
  expiring30: "Expiring ≤30d",
  expired: "Expired / No seat",
};

function seatStatus(student: Student): "active" | "expiring7" | "expiring30" | "expired" | "none" {
  const seat = student.centreSeats[0];
  if (!seat || seat.status === "CANCELLED") return "none";
  const end = new Date(seat.endDate);
  const now = new Date();
  if (end < now) return "expired";
  const diff = end.getTime() - now.getTime();
  if (diff < 7 * 86400000) return "expiring7";
  if (diff < 30 * 86400000) return "expiring30";
  return "active";
}

function matchesFilter(student: Student, filter: ExpiryFilter): boolean {
  if (filter === "all") return true;
  const s = seatStatus(student);
  if (filter === "active") return s === "active" || s === "expiring30" || s === "expiring7";
  if (filter === "expiring7") return s === "expiring7";
  if (filter === "expiring30") return s === "expiring7" || s === "expiring30";
  if (filter === "expired") return s === "expired" || s === "none";
  return true;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
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
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);

  const centreId = user?.centreId ?? null;

  const fetchStudents = useCallback(async (cid: string, q: string, signal: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: "1", pageSize: "200" });
      const res = await fetch(`/api/centres/${cid}/students?${params}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.items);
        setSelectedIds(new Set());
      }
    } catch { /* AbortError — ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchPendingInvites = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/centres/invite-student", { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setPendingInvites(data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchSeatUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/centres/seat-usage");
      const data = await res.json();
      if (data.success) setSeatUsage(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!centreId) { setLoading(false); return; }
    const controller = new AbortController();
    fetchStudents(centreId, search, controller.signal);
    fetchPendingInvites(controller.signal);
    fetchSeatUsage();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId, search]);

  // Filtered view (client-side by expiry)
  const visibleStudents = students.filter(s => matchesFilter(s, expiryFilter));

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === visibleStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleStudents.map(s => s.id)));
    }
  };

  const bulkRenew = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Renew access for ${selectedIds.size} student(s) for 30 days each?`)) return;
    setBulkRenewing(true);
    setBulkMsg(null);
    try {
      const res = await fetch("/api/centres/students/bulk-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkMsg({ type: "success", text: data.data.message });
        setSelectedIds(new Set());
        const c = new AbortController();
        fetchStudents(centreId!, search, c.signal);
        fetchSeatUsage();
      } else {
        setBulkMsg({ type: "error", text: data.error || "Bulk renew failed" });
      }
    } catch {
      setBulkMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setBulkRenewing(false);
    }
  };

  const exportCSV = async () => {
    if (!centreId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/centres/${centreId}/students/export`);
      if (!res.ok) { alert("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Export failed. Please try again."); }
    finally { setExporting(false); }
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete "${studentName}"? This will remove all their data and cannot be undone.`)) return;
    setDeleting(studentId);
    try {
      const res = await fetch(`/api/users/${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(studentId); return n; });
      } else alert(data.error || "Failed to delete student");
    } catch { alert("Failed to delete student. Please try again."); }
    finally { setDeleting(null); }
  };

  const renewSeat = async (studentId: string, studentName: string) => {
    if (!confirm(`Renew access for "${studentName}" for 1 month (30 days)?`)) return;
    setRenewingSeat(studentId);
    try {
      const res = await fetch(`/api/centres/students/${studentId}/renew`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const c = new AbortController();
        fetchStudents(centreId!, search, c.signal);
        fetchSeatUsage();
      } else alert(data.error || "Failed to renew access");
    } catch { alert("Failed to renew. Please try again."); }
    finally { setRenewingSeat(null); }
  };

  const cancelSeat = async (studentId: string, studentName: string) => {
    if (!confirm(`Cancel access for "${studentName}"?\nThis will revoke their access immediately.`)) return;
    setCancelingSeat(studentId);
    try {
      const res = await fetch(`/api/centres/students/${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, centreSeats: s.centreSeats.map(seat => ({ ...seat, status: "CANCELLED" })) } : s
        ));
        fetchSeatUsage();
      } else alert(data.error || "Failed to cancel access");
    } catch { alert("Failed to cancel access. Please try again."); }
    finally { setCancelingSeat(null); }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
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
    } catch { setInviteMsg({ type: "error", text: "Something went wrong. Please try again." }); }
    finally { setInviting(false); }
  };

  const generateLink = async () => {
    setGeneratingLink(true); setInviteMsg(null); setInviteLink(null);
    try {
      const res = await fetch("/api/centres/invite-link", { method: "POST" });
      const data = await res.json();
      if (data.success) { setInviteLink(data.data.url); setLinkCopied(false); }
      else setInviteMsg({ type: "error", text: data.error || "Failed to generate link" });
    } catch { setInviteMsg({ type: "error", text: "Something went wrong. Please try again." }); }
    finally { setGeneratingLink(false); }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Seat gauge metrics
  const gaugePercent = seatUsage ? Math.min(100, Math.round((seatUsage.used / seatUsage.total) * 100)) : 0;
  const gaugeColor = gaugePercent >= 90 ? "bg-red-500" : gaugePercent >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Students</h1>
          <p className="text-gray-500 dark:text-slate-400">Manage your coaching centre students</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={exporting} className="gap-2">
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      {/* Seat Usage Gauge */}
      {seatUsage && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="sm:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Seat Usage</p>
                <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {seatUsage.used} / {seatUsage.total === -1 ? "∞" : seatUsage.total}
                </span>
              </div>
              {seatUsage.total !== -1 && (
                <>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                    <div className={`h-full rounded-full transition-all ${gaugeColor}`} style={{ width: `${gaugePercent}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                    {seatUsage.total - seatUsage.used} seats remaining
                    {seatUsage.planName && ` · ${seatUsage.planName} plan`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className={seatUsage.expiring7 > 0 ? "border-red-200 dark:border-red-900" : ""}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Expiring ≤7 days</p>
              <p className={`text-2xl font-bold mt-1 ${seatUsage.expiring7 > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-slate-100"}`}>
                {seatUsage.expiring7}
              </p>
              {seatUsage.expiring7 > 0 && (
                <button
                  onClick={() => setExpiryFilter("expiring7")}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  View &rarr;
                </button>
              )}
            </CardContent>
          </Card>
          <Card className={seatUsage.expiring30 > 0 ? "border-amber-200 dark:border-amber-900" : ""}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Expiring ≤30 days</p>
              <p className={`text-2xl font-bold mt-1 ${seatUsage.expiring30 > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-slate-100"}`}>
                {seatUsage.expiring30}
              </p>
              {seatUsage.expiring30 > 0 && (
                <button
                  onClick={() => setExpiryFilter("expiring30")}
                  className="mt-1 text-xs text-amber-500 hover:underline"
                >
                  View &rarr;
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                Enter the student&apos;s email. They&apos;ll receive an invitation link and will be automatically linked to your centre.
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
                  inviteMsg.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                  {inviteMsg.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {inviteMsg.text}
                </div>
              )}
              <div className="mt-4 border-t border-gray-200 dark:border-slate-600 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-slate-400">Email not arriving? Generate a single-use link.</p>
                  <Button variant="outline" onClick={generateLink} loading={generatingLink} className="gap-2 shrink-0">
                    <Link2 className="h-4 w-4" />
                    {generatingLink ? "Generating..." : "Generate invite link"}
                  </Button>
                </div>
                {inviteLink && (
                  <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-700 p-3">
                    <div className="flex items-center gap-2">
                      <input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()}
                        className="w-full rounded-md border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-700 dark:text-slate-300"
                      />
                      <Button size="sm" onClick={copyLink} className="gap-1 shrink-0">
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      ⏱ Single use — expires in 1 hour. Generate a fresh link for each student.
                    </p>
                  </div>
                )}
              </div>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search + Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(FILTER_LABELS) as ExpiryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setExpiryFilter(f); setSelectedIds(new Set()); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                expiryFilter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {FILTER_LABELS[f]}
              {f === "expiring7" && seatUsage?.expiring7 ? ` (${seatUsage.expiring7})` : ""}
              {f === "expiring30" && seatUsage?.expiring30 ? ` (${seatUsage.expiring30})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} student{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button size="sm" onClick={bulkRenew} disabled={bulkRenewing} loading={bulkRenewing} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            {bulkRenewing ? "Renewing…" : "Renew selected (30 days)"}
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            Clear
          </button>
          {bulkMsg && (
            <span className={`text-sm ${bulkMsg.type === "success" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {bulkMsg.text}
            </span>
          )}
        </div>
      )}

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            {loading ? "Loading…" : `Students (${visibleStudents.length}${expiryFilter !== "all" ? ` of ${students.length}` : ""})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : visibleStudents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
              <p className="mt-4 text-gray-500 dark:text-slate-400">
                {students.length === 0 ? "No students yet. Share your invite link to get started." : `No students match the "${FILTER_LABELS[expiryFilter]}" filter.`}
              </p>
            </div>
          ) : (
            <>
            {/* ── Mobile cards (< md) ── */}
            <div className="space-y-3 md:hidden">
              {visibleStudents.map((student) => {
                const status = seatStatus(student);
                const isExpiringSoon = status === "expiring7" || status === "expiring30";
                return (
                  <div key={student.id}
                    className={`rounded-xl border p-4 ${selectedIds.has(student.id) ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => toggleSelect(student.id)}
                          className="mt-0.5 rounded border-gray-300 text-indigo-600 shrink-0" aria-label={`Select ${student.name}`} />
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/students/${student.id}`} className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline truncate block">
                            {student.name}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {(status === "none" || status === "expired") && (
                          <button onClick={() => renewSeat(student.id, student.name)} disabled={renewingSeat === student.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Renew">
                            {renewingSeat === student.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                        )}
                        {(status === "active" || status === "expiring7" || status === "expiring30") && (
                          <button onClick={() => cancelSeat(student.id, student.name)} disabled={cancelingSeat === student.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Cancel seat">
                            {cancelingSeat === student.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" /> : <XCircle className="h-4 w-4" />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(student.id, student.name)} disabled={deleting === student.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                          {deleting === student.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {status === "active" && <Badge variant="success">Active</Badge>}
                      {status === "expiring7" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Expiring soon</Badge>}
                      {status === "expiring30" && <Badge variant="warning">Expiring</Badge>}
                      {status === "expired" && <Badge variant="warning">Expired</Badge>}
                      {status === "none" && <Badge variant="secondary">No Seat</Badge>}
                      {student.centreSeats[0]?.status === "ACTIVE" && (
                        <span className={isExpiringSoon ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-500 dark:text-slate-400"}>
                          Expires {new Date(student.centreSeats[0].endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      <span className="text-gray-400 dark:text-slate-500 ml-auto">{student._count.attempts} attempts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-3 pr-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === visibleStudents.length && visibleStudents.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600"
                        aria-label="Select all"
                      />
                    </th>
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
                  {visibleStudents.map((student) => {
                    const status = seatStatus(student);
                    const isExpiringSoon = status === "expiring7" || status === "expiring30";

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/40 ${selectedIds.has(student.id) ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
                      >
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(student.id)}
                            onChange={() => toggleSelect(student.id)}
                            className="rounded border-gray-300 text-indigo-600"
                            aria-label={`Select ${student.name}`}
                          />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <Link href={`/admin/students/${student.id}`} className="font-medium text-indigo-700 dark:text-indigo-400 hover:underline">
                                {student.name}
                              </Link>
                              {student.phone && <p className="text-xs text-gray-400 dark:text-slate-500">{student.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-slate-400">{student.email}</td>
                        <td className="py-3">
                          {status === "active" && <Badge variant="success">Active</Badge>}
                          {status === "expiring7" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Expiring soon</Badge>}
                          {status === "expiring30" && <Badge variant="warning">Expiring</Badge>}
                          {status === "expired" && <Badge variant="warning">Expired</Badge>}
                          {status === "none" && <Badge variant="secondary">No Seat</Badge>}
                        </td>
                        <td className="py-3 text-sm">
                          {student.centreSeats[0] && student.centreSeats[0].status === "ACTIVE" ? (
                            <span className={isExpiringSoon ? "font-medium text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-slate-400"}>
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
                            {(status === "none" || status === "expired") && (
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
                            {(status === "active" || status === "expiring7" || status === "expiring30") && (
                              <Button variant="ghost" size="sm"
                                onClick={() => cancelSeat(student.id, student.name)}
                                disabled={cancelingSeat === student.id}
                                className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                                title="Cancel seat access"
                              >
                                {cancelingSeat === student.id
                                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" />
                                  : <XCircle className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm"
                              onClick={() => handleDelete(student.id, student.name)}
                              disabled={deleting === student.id}
                              className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete student permanently"
                            >
                              {deleting === student.id
                                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
