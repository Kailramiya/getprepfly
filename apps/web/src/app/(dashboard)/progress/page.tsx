"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Target, Clock, Flame,
  ArrowUp, ArrowDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.success) setData(result.data);
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const radarData = useMemo(() => {
    if (!data) return [];
    return [
      { subject: "Speaking", A: data.scoresBySection.SPEAKING || 0, fullMark: 90 },
      { subject: "Reading", A: data.scoresBySection.READING || 0, fullMark: 90 },
      { subject: "Listening", A: data.scoresBySection.LISTENING || 0, fullMark: 90 },
      { subject: "Writing", A: data.scoresBySection.WRITING || 0, fullMark: 90 },
    ];
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.scoreTrend) return [];
    return data.scoreTrend.map((d: any) => {
      // Date formatting from "2026-07-08" to "Jul 08"
      const dateObj = new Date(d.date);
      const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: formattedDate,
        score: d.score,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!data) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const pteScore = data.estimatedPTEScore || 0;
  const scoreColor = pteScore >= 79 ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" 
                   : pteScore >= 65 ? "text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" 
                   : pteScore >= 50 ? "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" 
                   : "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Hero Section: Estimated Score */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 shadow-2xl ring-1 ring-white/10 isolate">
        {/* Abstract background mesh */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"></div>

        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Progress Overview</h1>
            <p className="text-slate-400 text-lg mb-8">
              Keep pushing forward! Here is a snapshot of your estimated performance.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Streak</span>
                </div>
                <p className="text-2xl font-semibold text-white">{data.streak} <span className="text-sm text-slate-500 font-normal">days</span></p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Time</span>
                </div>
                <p className="text-2xl font-semibold text-white">{formatTime(data.totalPracticeTime)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-slate-900/50 p-2 shadow-inner ring-1 ring-white/10">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
              {/* Fake SVG Circle Progress */}
              <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className="fill-transparent stroke-indigo-500 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={`${(pteScore / 90) * 289} 289`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center z-10">
                <p className={`text-6xl font-black tabular-nums tracking-tighter ${scoreColor}`}>
                  {pteScore > 0 ? pteScore : "--"}
                </p>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mt-1">Est. Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Score Trend Area Chart */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 overflow-hidden shadow-lg backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Performance Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length < 2 ? (
              <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500">Practice more on different days to generate a trend!</p>
              </div>
            ) : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis domain={[10, 90]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Section Radar Chart */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-lg backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Skill Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[270px] w-full max-w-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" opacity={0.6} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[10, 90]} tick={false} axisLine={false} />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="#a855f7"
                    fillOpacity={0.4}
                    animationDuration={1500}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Weak & Strong Areas */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent dark:from-red-950/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <ArrowDown className="h-5 w-5" />
              Critical Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weakAreas.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Practice more to identify weak areas.</p>
            ) : (
              <div className="space-y-5">
                {data.weakAreas.map((area: any) => (
                  <div key={area.type} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-4 group-hover:text-red-500 transition-colors">
                        {area.type.replace(/_/g, " ")}
                      </p>
                      <Badge variant="outline" className="text-xs font-bold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 bg-white dark:bg-slate-950 shadow-sm">
                        {area.averageScore}/90
                      </Badge>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(area.averageScore / 90) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{area.count} attempts</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent dark:from-green-950/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
              <ArrowUp className="h-5 w-5" />
              Strongest Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strongAreas.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Practice more to identify strong areas.</p>
            ) : (
              <div className="space-y-5">
                {data.strongAreas.map((area: any) => (
                  <div key={area.type} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-4 group-hover:text-green-500 transition-colors">
                        {area.type.replace(/_/g, " ")}
                      </p>
                      <Badge variant="outline" className="text-xs font-bold text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 bg-white dark:bg-slate-950 shadow-sm">
                        {area.averageScore}/90
                      </Badge>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(area.averageScore / 90) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{area.count} attempts</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
