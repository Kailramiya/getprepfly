"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Shield, Building2, GraduationCap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  name: string;
  email: string;
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
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete "${userName}"? This will remove all their data (attempts, mock tests, etc.) and cannot be undone.`)) {
      return;
    }
    setDeleting(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Failed to delete user. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: "50", ...(search && { search }) });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.data?.items || data.data || []);
      setLoading(false);
    };
    fetchUsers();
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
        <p className="text-gray-500">{users.length} users across all centres</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
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
            <div className="divide-y divide-gray-100">
              {users.map((u) => {
                const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.STUDENT;
                const RoleIcon = roleConfig.icon;
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.centre && (
                        <span className="text-xs text-gray-400">{u.centre.name}</span>
                      )}
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
    </div>
  );
}
