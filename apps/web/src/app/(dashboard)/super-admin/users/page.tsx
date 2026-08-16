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
  moduleAccess?: { section: string | null; expiresAt: string; isActive: boolean }[];
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">All Users</h1>
        <p className="text-base font-medium text-muted-foreground">{total} users across all centres</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 w-full rounded-2xl border-none bg-white/5 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-inner transition-all duration-700 ease-fluid text-foreground"
        />
      </div>

      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
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
                  <div key={u.id} className="flex flex-col gap-3 p-4 hover:bg-white/5 dark:hover:bg-slate-700/40 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-sm font-bold text-indigo-500">
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
                      <div className="flex flex-col items-end gap-1">
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
                              className="group flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-1 font-mono text-xs text-teal-500 hover:bg-teal-500/20 transition-all duration-300"
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
                        
                        {u.moduleAccess && u.moduleAccess.filter(m => m.isActive && new Date(m.expiresAt) > new Date()).length > 0 && (
                          <div className="flex flex-wrap justify-end gap-1 mt-1">
                             {u.moduleAccess.filter(m => m.isActive && new Date(m.expiresAt) > new Date()).map((m, idx) => (
                               <Badge key={idx} variant="outline" className="text-[10px] uppercase border-indigo-200 text-indigo-600 bg-indigo-50/50">
                                 {m.section ? m.section : 'ALL MODULES'} PRO
                               </Badge>
                             ))}
                          </div>
                        )}
                      </div>
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
                          className="h-8 w-8 p-0 rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
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
              className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10"
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
              className="rounded-full shadow-glass hover:-translate-y-1 hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
