"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Database } from "lucide-react";

export default function SuperAdminAnalyticsPage() {
  const [stats, setStats] = useState({ centres: 0, users: 0, questions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [centresRes, usersRes, questionsRes] = await Promise.all([
          fetch("/api/centres"),
          fetch("/api/users?pageSize=1"),
          fetch("/api/questions?pageSize=1"),
        ]);
        const centresData = await centresRes.json();
        const usersData = await usersRes.json();
        const questionsData = await questionsRes.json();

        setStats({
          centres: Array.isArray(centresData.data) ? centresData.data.length : 0,
          users: usersData.data?.total || 0,
          questions: questionsData.data?.total || 0,
        });
      } catch {
        // silent fail
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Platform Analytics</h1>
        <p className="text-gray-500 dark:text-slate-400">Overall platform statistics</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Centres", value: stats.centres, icon: Building2, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
            { label: "Total Users", value: stats.users, icon: Users, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40" },
            { label: "Total Questions", value: stats.questions, icon: Database, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" },
          ].map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden rounded-[2rem] border-none shadow-glass backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-2 hover:shadow-float transition-all duration-700 ease-fluid bg-background/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
