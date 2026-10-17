"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  Activity,
  CalendarDays,
  TrendingUp,
  Building2,
  Database,
  Megaphone,
  Globe,
  Gauge,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700 ${className ?? ""}`} />;
}

interface StaffData {
  scope: "centre" | "platform";
  centreName: string | null;
  totalStudents: number;
  activeStudents7d: number;
  attemptsToday: number;
  attemptsThisWeek: number;
  avgScore30d: number | null;
  batchCount: number;
  recentActivity: Array<{
    id: string;
    studentName: string;
    questionType: string;
    section: string;
    title: string;
    score: number | null;
    createdAt: string;
  }>;
}

function formatType(t: string): string {
  return t
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Centre admins manage their own centre; super admins manage the platform —
// same page shape, different link targets and headline copy.
const CENTRE_LINKS = [
  { label: "Students", href: "/admin/students", icon: Users, color: "indigo" },
  { label: "Batches", href: "/admin/batches", icon: Building2, color: "teal" },
  { label: "Questions", href: "/admin/questions", icon: Database, color: "purple" },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, color: "amber" },
] as const;

const PLATFORM_LINKS = [
  { label: "Centres", href: "/super-admin/centres", icon: Building2, color: "indigo" },
  { label: "Users", href: "/super-admin/users", icon: Users, color: "teal" },
  { label: "Practice Tracker", href: "/super-admin/practice-tracker", icon: Activity, color: "purple" },
  { label: "AI Usage & Cost", href: "/super-admin/usage", icon: Gauge, color: "amber" },
] as const;

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

export function StaffDashboard({ name }: { name: string }) {
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isPlatform = data?.scope === "platform";
  const links = isPlatform ? PLATFORM_LINKS : CENTRE_LINKS;

  const stats = [
    { label: "Total Students", value: data?.totalStudents, icon: Users, color: "text-indigo-600 dark:text-indigo-400", bgLight: "bg-indigo-100 dark:bg-indigo-950/40" },
    { label: "Active (7 days)", value: data?.activeStudents7d, icon: UserCheck, color: "text-teal-600 dark:text-teal-400", bgLight: "bg-teal-100 dark:bg-teal-950/40" },
    { label: "Attempts Today", value: data?.attemptsToday, icon: Activity, color: "text-amber-600 dark:text-amber-400", bgLight: "bg-amber-100 dark:bg-amber-950/40" },
    { label: "Avg Score (30d)", value: data?.avgScore30d != null ? `${data.avgScore30d}/90` : "--", icon: TrendingUp, color: "text-purple-600 dark:text-purple-400", bgLight: "bg-purple-100 dark:bg-purple-950/40" },
  ];

  return (
    <div className="space-y-10 pb-32">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
          Welcome back, {name.split(" ")[0]}!
        </h1>
        <p className="mt-2 text-lg font-medium text-muted-foreground/80 flex items-center gap-2">
          {isPlatform ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          {isPlatform ? "Platform overview" : data?.centreName ?? "Your centre"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 hover:shadow-float transition-all duration-700 ease-fluid hover:-translate-y-1">
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] shadow-inner ${stat.bgLight}`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <div>
                {loading ? <Sk className="h-8 w-16" /> : (
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value ?? 0}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-muted-foreground/80 uppercase tracking-widest">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((link) => {
            const c = COLOR_CLASSES[link.color];
            return (
              <Link key={link.href} href={link.href}>
                <Card className="group cursor-pointer rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float">
                  <CardContent className="flex flex-col items-center text-center gap-4 p-8">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid ${c.bg} ${c.text}`}>
                      <link.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight text-foreground">{link.label}</h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent student activity */}
      {loading ? (
        <div>
          <Sk className="mb-6 h-8 w-48 rounded-full" />
          <div className="space-y-3">{[0, 1, 2].map((i) => <Sk key={i} className="h-20 rounded-[1.5rem]" />)}</div>
        </div>
      ) : data && data.recentActivity.length === 0 ? (
        <Card className="rounded-[2rem] border border-dashed border-muted-foreground/20 bg-background/30 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="text-xl font-extrabold tracking-tight text-foreground">No student activity yet</p>
            <p className="text-sm font-medium text-muted-foreground/80">
              {isPlatform ? "Practice attempts across the platform will show up here." : "Once your students start practising, their activity will show up here."}
            </p>
          </CardContent>
        </Card>
      ) : data && data.recentActivity.length > 0 && (
        <div>
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Recent Student Activity</h2>
            <Link
              href={isPlatform ? "/super-admin/practice-tracker" : "/admin/students"}
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group"
            >
              View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentActivity.map((a) => (
              <Card key={a.id} className="rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/5">
                <CardContent className="flex items-center justify-between p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white shadow-inner ${
                        a.section === "SPEAKING" ? "bg-gradient-to-br from-teal-400 to-teal-600" :
                        a.section === "WRITING" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                        a.section === "READING" ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-orange-400 to-orange-600"
                      }`}
                    >
                      {a.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-extrabold tracking-tight text-foreground">{a.studentName}</p>
                      <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mt-0.5">
                        {formatType(a.questionType)} <span className="mx-1 opacity-50">·</span> {a.title}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {a.score !== null ? (
                      <p className={`text-xl font-extrabold tracking-tight ${a.score >= 70 ? "text-green-500" : a.score >= 40 ? "text-amber-500" : "text-red-500"}`}>
                        {a.score}<span className="text-sm font-bold text-muted-foreground/50">/90</span>
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-muted-foreground/50">Pending</p>
                    )}
                    <p className="text-xs font-medium text-muted-foreground/60 mt-1 flex items-center justify-end gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
