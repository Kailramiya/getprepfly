"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, Copy, CheckCheck, Trash2, Share2, MessageCircle, Mail } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const [codeCopied, setCodeCopied] = useState(false);
  const centreCode = user?.centreSlug || "";
  const centreName = user?.centreName || "our coaching centre";
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?centre=${centreCode}`;
  const shareMessage = `Join ${centreName} on PrepFly for AI-powered PTE practice! Use my referral link to auto-enroll: ${inviteLink}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const emailLink = `mailto:?subject=${encodeURIComponent("Join " + centreName + " on PrepFly")}&body=${encodeURIComponent(shareMessage)}`;

  const copyCode = () => {
    navigator.clipboard.writeText(centreCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  useEffect(() => {
    if (!user?.centreId) return;
    const fetchStudents = async () => {
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
    fetchStudents();
  }, [user?.centreId, search]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">Manage your coaching centre students</p>
        </div>
      </div>

      {/* Referral Program Card */}
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">Your Referral Program</h3>
              <p className="mt-1 text-sm text-gray-600">
                Share your referral code or link with students — they will auto-enroll into your centre when they sign up.
              </p>

              {/* Referral Code Display */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Referral Code</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-teal-300 bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-teal-700">
                      {centreCode || "Loading..."}
                    </div>
                    <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5">
                      {codeCopied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {codeCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Referral Link</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                      {inviteLink}
                    </div>
                    <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5">
                      {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Share on WhatsApp
                    </Button>
                  </a>
                  <a href={emailLink}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Share via Email
                    </Button>
                  </a>
                </div>

                <div className="mt-2 rounded-md bg-white/60 p-3">
                  <p className="text-xs font-medium text-gray-700">How it works:</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
                    <li>Share your referral code or link with students</li>
                    <li>Students click the link or enter the code during signup</li>
                    <li>They automatically join your centre — visible in the list below</li>
                  </ol>
                </div>
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
            Students Enrolled via Your Referral ({students.length})
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
