"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, BarChart3, Clock,
  ArrowUp, ArrowDown, Trophy,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.centreId) return;
    const fetchData = async () => {
      try {
        const [studentsRes] = await Promise.all([
          fetch(`/api/centres/${user.centreId}/students?pageSize=100`),
        ]);
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          const items = studentsData.data.items || [];
          setStudents(items);

          // Calculate stats from student data
          const totalStudents = items.length;
          const activeStudents = items.filter((s: any) => s._count.attempts > 0).length;
          const totalAttempts = items.reduce((sum: number, s: any) => sum + s._count.attempts, 0);
          const totalMockTests = items.reduce((sum: number, s: any) => sum + s._count.mockTests, 0);
          const vipStudents = items.filter((s: any) => s.studentPlan?.planType !== "FREE").length;

          setStats({
            totalStudents,
            activeStudents,
            totalAttempts,
            totalMockTests,
            vipStudents,
            inactiveStudents: totalStudents - activeStudents,
          });
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user?.centreId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Centre Analytics</h1>
        <p className="text-base font-medium text-muted-foreground mt-2">{user?.centreName} — Performance Overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Students", value: stats?.totalStudents || 0, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: "Active Students", value: stats?.activeStudents || 0, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/40" },
          { label: "Total Practice", value: stats?.totalAttempts || 0, icon: BarChart3, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40" },
          { label: "Mock Tests Taken", value: stats?.totalMockTests || 0, icon: Clock, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-2 hover:shadow-float transition-all duration-700 ease-fluid">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VIP vs Free */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-muted-foreground">Free</span>
                  <span className="text-sm font-extrabold text-foreground">{(stats?.totalStudents || 0) - (stats?.vipStudents || 0)}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary shadow-inner">
                  <div
                    className="h-full rounded-full bg-muted-foreground"
                    style={{ width: stats?.totalStudents > 0 ? `${((stats.totalStudents - stats.vipStudents) / stats.totalStudents) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-muted-foreground">VIP</span>
                  <span className="text-sm font-extrabold text-green-500">{stats?.vipStudents || 0}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary shadow-inner">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: stats?.totalStudents > 0 ? `${(stats.vipStudents / stats.totalStudents) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="text-base">Activity Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-sm font-bold text-green-500"><ArrowUp className="h-3 w-3" /> Active</span>
                  <span className="text-sm font-extrabold text-foreground">{stats?.activeStudents || 0}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary shadow-inner">
                  <div
                    className="h-full rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    style={{ width: stats?.totalStudents > 0 ? `${(stats.activeStudents / stats.totalStudents) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-sm text-red-500"><ArrowDown className="h-3 w-3" /> Inactive</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{stats?.inactiveStudents || 0}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary shadow-inner">
                  <div
                    className="h-full rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    style={{ width: stats?.totalStudents > 0 ? `${(stats.inactiveStudents / stats.totalStudents) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="h-5 w-5 text-amber-500" />
            Student Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No students yet</p>
          ) : (
            <div className="space-y-2">
              {students
                .sort((a: any, b: any) => b._count.attempts - a._count.attempts)
                .slice(0, 10)
                .map((student: any, i: number) => (
                  <div key={student.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 shadow-glass border border-white/5 transition-all duration-700 ease-fluid hover:bg-white/10 hover:shadow-float group hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                        i === 0 ? "bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5)]" :
                        i === 1 ? "bg-gray-300/20 text-gray-300 ring-1 ring-gray-300/50 shadow-[0_0_15px_rgba(209,213,219,0.3)]" :
                        i === 2 ? "bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]" :
                        "bg-secondary text-muted-foreground"
                      }`}>{i + 1}</span>
                      <div>
                        <p className="text-base font-bold text-foreground">{student.name}</p>
                        <p className="text-sm font-medium text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      <span>{student._count.attempts} practice</span>
                      <span>{student._count.mockTests} tests</span>
                      <Badge variant={student.studentPlan?.planType === "FREE" ? "secondary" : "success"}>
                        {student.studentPlan?.planType || "FREE"}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
