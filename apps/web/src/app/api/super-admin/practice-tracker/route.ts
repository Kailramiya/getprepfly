import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// Admin data must always be fresh — never cache this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Time helpers — India Standard Time (Asia/Kolkata) is a fixed UTC+5:30 with no
// DST, so a constant offset is safe for bucketing attempts into calendar days.
// Bucketing in IST (not UTC) keeps late-night practice on the correct local day
// and makes "active days" / "streak" match what students actually experience.
// ---------------------------------------------------------------------------
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day string (YYYY-MM-DD) in IST for a given instant. */
function istDayKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight IST for the day containing `now`, returned as a UTC instant. */
function istStartOfToday(now: Date): Date {
  return new Date(`${istDayKey(now)}T00:00:00.000+05:30`);
}

type RangeKey = "today" | "7d" | "30d" | "all";
const RANGES: RangeKey[] = ["today", "7d", "30d", "all"];

/** Inclusive lower bound for the selected range (null = all time). */
function resolveSince(range: RangeKey, now: Date): Date | null {
  switch (range) {
    case "today":
      return istStartOfToday(now);
    case "7d":
      return new Date(now.getTime() - 7 * DAY_MS);
    case "30d":
      return new Date(now.getTime() - 30 * DAY_MS);
    case "all":
    default:
      return null;
  }
}

/**
 * Current consecutive-day practice streak (in IST days).
 * Counts back from today; if there was no activity today but there was
 * yesterday, the streak still counts (grace for "haven't practised yet today").
 * Returns 0 if the most recent activity is older than yesterday.
 */
function computeStreak(dayKeys: Set<string>, now: Date): number {
  if (dayKeys.size === 0) return 0;
  const todayKey = istDayKey(now);
  const yesterdayKey = istDayKey(new Date(now.getTime() - DAY_MS));

  let anchorKey: string;
  if (dayKeys.has(todayKey)) anchorKey = todayKey;
  else if (dayKeys.has(yesterdayKey)) anchorKey = yesterdayKey;
  else return 0;

  let streak = 0;
  const cursor = new Date(`${anchorKey}T00:00:00.000+05:30`);
  while (dayKeys.has(istDayKey(cursor))) {
    streak++;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  return streak;
}

interface UserAgg {
  attempts: number;
  timeSeconds: number;
  sumScore: number;
  scoredCount: number;
  rangeDayKeys: Set<string>; // distinct active days within the selected range
  streakDayKeys: Set<string>; // distinct active days across the streak window
}

interface UserOut {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  attempts: number;
  timeSeconds: number;
  activeDays: number;
  streak: number;
  avgScore: number | null;
  mockTests: number;
  lastActive: string | null;
}

interface CentreAgg {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
  isPremiumCentre: boolean;
  premiumUntil: Date | null;
  users: UserOut[];
  studentCount: number;
  activeStudents: number;
  attempts: number;
  timeSeconds: number;
  sumScore: number;
  scoredCount: number;
  mockTests: number;
  lastActive: Date | null;
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get("range") as RangeKey | null;
  const range: RangeKey = rangeParam && RANGES.includes(rangeParam) ? rangeParam : "30d";

  const now = new Date();
  const since = resolveSince(range, now);

  // Streak & recency need day-level history that can predate the selected range,
  // so we always pull at least the last 120 days of attempts (or everything for
  // "all"). Range-scoped metrics are then computed from the subset with
  // createdAt >= since. For this platform's scale (~hundreds of users) pulling
  // minimal columns is inexpensive; revisit with a SQL rollup if data grows.
  const streakWindowStart = new Date(now.getTime() - 120 * DAY_MS);
  const attemptsSince =
    range === "all" ? null : since && since < streakWindowStart ? since : streakWindowStart;

  const [centres, students, attemptRows, lastActiveRows, mockRows] = await Promise.all([
    db.centre.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        isActive: true,
        isPremiumCentre: true,
        premiumUntil: true,
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        centreId: true,
      },
    }),
    db.attempt.findMany({
      where: attemptsSince ? { createdAt: { gte: attemptsSince } } : {},
      select: {
        userId: true,
        createdAt: true,
        timeTaken: true,
        overallScore: true,
      },
    }),
    // All-time last activity per user (cheap — one row per user).
    db.attempt.groupBy({
      by: ["userId"],
      _max: { createdAt: true },
    }),
    // Completed mock tests taken within the selected range, per user.
    db.mockTest.groupBy({
      by: ["userId"],
      where: {
        status: "COMPLETED",
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _count: { _all: true },
    }),
  ]);

  const studentById = new Map<string, (typeof students)[number]>();
  for (const s of students) studentById.set(s.id, s);

  const lastActiveByUser = new Map<string, Date>();
  for (const r of lastActiveRows) {
    if (r._max.createdAt) lastActiveByUser.set(r.userId, r._max.createdAt);
  }

  const mockCountByUser = new Map<string, number>();
  for (const r of mockRows) mockCountByUser.set(r.userId, r._count._all);

  // Aggregate attempts per student.
  const aggById = new Map<string, UserAgg>();
  for (const row of attemptRows) {
    if (!studentById.has(row.userId)) continue; // students only
    let a = aggById.get(row.userId);
    if (!a) {
      a = {
        attempts: 0,
        timeSeconds: 0,
        sumScore: 0,
        scoredCount: 0,
        rangeDayKeys: new Set<string>(),
        streakDayKeys: new Set<string>(),
      };
      aggById.set(row.userId, a);
    }
    const dayKey = istDayKey(row.createdAt);
    a.streakDayKeys.add(dayKey);

    const inRange = !since || row.createdAt >= since;
    if (inRange) {
      a.attempts++;
      if (typeof row.timeTaken === "number") a.timeSeconds += row.timeTaken;
      if (typeof row.overallScore === "number") {
        a.sumScore += row.overallScore;
        a.scoredCount++;
      }
      a.rangeDayKeys.add(dayKey);
    }
  }

  // Build centre buckets (include every centre, even dormant ones).
  const centreAggById = new Map<string, CentreAgg>();
  for (const c of centres) {
    centreAggById.set(c.id, {
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      isActive: c.isActive,
      isPremiumCentre: c.isPremiumCentre,
      premiumUntil: c.premiumUntil,
      users: [],
      studentCount: 0,
      activeStudents: 0,
      attempts: 0,
      timeSeconds: 0,
      sumScore: 0,
      scoredCount: 0,
      mockTests: 0,
      lastActive: null,
    });
  }
  const unassigned: CentreAgg = {
    id: "unassigned",
    name: "No centre",
    city: null,
    state: null,
    isActive: true,
    isPremiumCentre: false,
    premiumUntil: null,
    users: [],
    studentCount: 0,
    activeStudents: 0,
    attempts: 0,
    timeSeconds: 0,
    sumScore: 0,
    scoredCount: 0,
    mockTests: 0,
    lastActive: null,
  };

  // Platform totals.
  let totalAttempts = 0;
  let totalTime = 0;
  let totalSumScore = 0;
  let totalScored = 0;
  let totalMocks = 0;
  let activeStudents = 0;

  for (const s of students) {
    const a = aggById.get(s.id);
    const attempts = a?.attempts ?? 0;
    const timeSeconds = a?.timeSeconds ?? 0;
    const scoredCount = a?.scoredCount ?? 0;
    const sumScore = a?.sumScore ?? 0;
    const activeDays = a?.rangeDayKeys.size ?? 0;
    const streak = a ? computeStreak(a.streakDayKeys, now) : 0;
    const avgScore = scoredCount > 0 ? sumScore / scoredCount : null;
    const mockTests = mockCountByUser.get(s.id) ?? 0;
    const lastActive = lastActiveByUser.get(s.id) ?? null;

    const userOut: UserOut = {
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      isActive: s.isActive,
      attempts,
      timeSeconds,
      activeDays,
      streak,
      avgScore: avgScore != null ? Math.round(avgScore * 10) / 10 : null,
      mockTests,
      lastActive: lastActive ? lastActive.toISOString() : null,
    };

    const bucket =
      s.centreId && centreAggById.has(s.centreId)
        ? centreAggById.get(s.centreId)!
        : unassigned;

    bucket.users.push(userOut);
    bucket.studentCount++;
    if (attempts > 0) bucket.activeStudents++;
    bucket.attempts += attempts;
    bucket.timeSeconds += timeSeconds;
    bucket.sumScore += sumScore;
    bucket.scoredCount += scoredCount;
    bucket.mockTests += mockTests;
    if (lastActive && (!bucket.lastActive || lastActive > bucket.lastActive)) {
      bucket.lastActive = lastActive;
    }

    if (attempts > 0) activeStudents++;
    totalAttempts += attempts;
    totalTime += timeSeconds;
    totalSumScore += sumScore;
    totalScored += scoredCount;
    totalMocks += mockTests;
  }

  const centreList = Array.from(centreAggById.values());
  if (unassigned.users.length > 0) centreList.push(unassigned);

  const centresOut = centreList
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      isActive: c.isActive,
      isPremiumCentre: c.isPremiumCentre,
      premiumUntil: c.premiumUntil ? c.premiumUntil.toISOString() : null,
      studentCount: c.studentCount,
      activeStudents: c.activeStudents,
      attempts: c.attempts,
      timeSeconds: c.timeSeconds,
      avgScore: c.scoredCount > 0 ? Math.round((c.sumScore / c.scoredCount) * 10) / 10 : null,
      mockTests: c.mockTests,
      lastActive: c.lastActive ? c.lastActive.toISOString() : null,
      users: c.users.sort((a, b) => b.attempts - a.attempts),
    }))
    .sort((a, b) => b.attempts - a.attempts || b.studentCount - a.studentCount);

  const totals = {
    centres: centres.length,
    activeCentres: centresOut.filter((c) => c.id !== "unassigned" && c.attempts > 0).length,
    students: students.length,
    activeStudents,
    attempts: totalAttempts,
    timeSeconds: totalTime,
    avgScore: totalScored > 0 ? Math.round((totalSumScore / totalScored) * 10) / 10 : null,
    mockTests: totalMocks,
  };

  return NextResponse.json({
    success: true,
    data: {
      range,
      since: since ? since.toISOString() : null,
      generatedAt: now.toISOString(),
      totals,
      centres: centresOut,
    },
  });
}
