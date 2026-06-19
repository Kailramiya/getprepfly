"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Users, Search, Shield, Building2, GraduationCap, Trash2, Hash, Copy, CheckCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  centre: { name: string; slug: string } | null;
}

const ROLE_CONFIG: Record<string, { icon: any; color: string }> = {
  SUPER_ADMIN: { icon: Shield, color: "bg-red-100 text-red-700" },
  CENTRE_ADMIN: { icon: Building2, color: "bg-blue-100 text-blue-700" },
  TEACHER: { icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
  STUDENT: { icon: Users, color: "bg-green-100 text-green-700" },
};

export default function SuperAdminUsersPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const PAGE_SIZE = 50;
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDelete = async (userId: string, userName: string) => {
    const ok = await confirm({ title: `Delete ${userName}?`, description: "All their attempts, scores, and mock tests will be permanently removed.", confirmLabel: "Delete permanently", variant: "danger" });
    if (!ok) return;
    setDeleting(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast("success", `${userName} deleted`);
      } else {
        toast("error", data.error || "Failed to delete user");
      }
    } catch {
      toast("error", "Failed to delete user. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  // Reset to the first page whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
      });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data?.items || data.data || []);
        setTotal(data.data?.total ?? 0);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [search, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">All Users</h1>
        <p className="text-gray-500 dark:text-slate-400">{total} users across all centres</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {users.map((u) => {
                const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.STUDENT;
                const RoleIcon = roleConfig.icon;
                const referralLabel =
                  u.role === "CENTRE_ADMIN"
                    ? "Their centre's referral code"
                    : u.role === "STUDENT"
                      ? "Enrolled via"
                      : "Centre";
                return (
                  <div key={u.id} className="flex flex-col gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/40 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{u.email}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                          <Phone className="h-3 w-3" />
                          {u.phone ? (
                            <a href={`tel:${u.phone}`} className="hover:text-indigo-600">{u.phone}</a>
                          ) : (
                            <span className="italic text-gray-400 dark:text-slate-500">No phone</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {u.centre ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                              {referralLabel}
                            </span>
                            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{u.centre.name}</span>
                          </div>
                          <button
                            onClick={() => copySlug(u.centre!.slug)}
                            className="group flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 font-mono text-xs text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-950/50"
                            title="Click to copy referral code"
                          >
                            <Hash className="h-3 w-3" />
                            {u.centre.slug}
                            {copiedSlug === u.centre.slug ? (
                              <CheckCheck className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      ) : u.role === "CENTRE_ADMIN" ? (
                        <Badge className="bg-amber-100 text-amber-700">
                          ⚠ No centre — will auto-create on next login
                        </Badge>
                      ) : u.role === "STUDENT" ? (
                        <span className="text-xs italic text-gray-400 dark:text-slate-500">Not enrolled in any centre</span>
                      ) : null}
                      <Badge className={roleConfig.color}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {u.role}
                      </Badge>
                      {u.role !== "SUPER_ADMIN" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id, u.name)}
                          disabled={deleting === u.id}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        >
                          {deleting === u.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
