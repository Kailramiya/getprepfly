"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, Copy, CheckCheck, Trash2 } from "lucide-react";

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

  const centreCode = user?.centreSlug || "";
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?centre=${centreCode}`;

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

      {/* Invite Card */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-teal-900">Invite students to join your centre</p>
              <p className="text-xs text-teal-600">Share this link — students auto-join your centre on signup</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 text-xs text-teal-800">
              Centre code: <strong>{centreCode}</strong>
            </code>
            <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5">
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
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
            {students.length} Students
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
