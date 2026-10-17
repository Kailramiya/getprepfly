import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// Admin data must always be fresh — never cache this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// India Standard Time (Asia/Kolkata) is a fixed UTC+5:30 with no DST, so a
// constant offset is safe for bucketing usage into calendar months.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTH_RE = /^\d{4}-\d{2}$/;

/** Start/end (as UTC instants) of the IST calendar month for "YYYY-MM". */
function monthBounds(monthKey: string): { since: Date; until: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const since = new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS);
  const until = new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS);
  return { since, until };
}

function currentMonthKey(): string {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface UserAgg {
  calls: number;
  costInrPaise: number;
  promptTokens: number;
  completionTokens: number;
  audioSeconds: number;
  characters: number;
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonthKey();
  const { since, until } = monthBounds(month);

  const [centres, students, logs] = await Promise.all([
    db.centre.findMany({
      select: { id: true, name: true, city: true, state: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, centreId: true },
    }),
    db.aiUsageLog.findMany({
      where: { createdAt: { gte: since, lt: until } },
      select: {
        userId: true,
        model: true,
        endpoint: true,
        promptTokens: true,
        completionTokens: true,
        units: true,
        costInrPaise: true,
      },
    }),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));

  const aggByUser = new Map<string, UserAgg>();
  const modelTotals = new Map<string, { calls: number; costInrPaise: number }>();
  let totalCostInrPaise = 0;
  let totalCalls = 0;

  for (const log of logs) {
    let a = aggByUser.get(log.userId);
    if (!a) {
      a = { calls: 0, costInrPaise: 0, promptTokens: 0, completionTokens: 0, audioSeconds: 0, characters: 0 };
      aggByUser.set(log.userId, a);
    }
    a.calls++;
    a.costInrPaise += log.costInrPaise;
    a.promptTokens += log.promptTokens;
    a.completionTokens += log.completionTokens;
    if (log.model === "whisper-1") a.audioSeconds += log.units;
    if (log.model === "tts-1") a.characters += log.units;

    const mt = modelTotals.get(log.model) ?? { calls: 0, costInrPaise: 0 };
    mt.calls++;
    mt.costInrPaise += log.costInrPaise;
    modelTotals.set(log.model, mt);

    totalCalls++;
    totalCostInrPaise += log.costInrPaise;
  }

  interface CentreBucket {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    isActive: boolean;
    calls: number;
    costInrPaise: number;
    users: Array<{ id: string; name: string; email: string; role: string; isActive: boolean } & UserAgg>;
  }

  const centreById = new Map<string, CentreBucket>();
  for (const c of centres) {
    centreById.set(c.id, { ...c, calls: 0, costInrPaise: 0, users: [] });
  }
  const unassigned: CentreBucket = {
    id: "unassigned",
    name: "No centre",
    city: null,
    state: null,
    isActive: true,
    calls: 0,
    costInrPaise: 0,
    users: [],
  };

  for (const [userId, a] of aggByUser) {
    const s = studentById.get(userId);
    if (!s) continue; // usage from a since-deleted user
    const bucket = (s.centreId && centreById.get(s.centreId)) || unassigned;
    bucket.users.push({ id: s.id, name: s.name, email: s.email, role: s.role, isActive: s.isActive, ...a });
    bucket.calls += a.calls;
    bucket.costInrPaise += a.costInrPaise;
  }

  const centresOut = Array.from(centreById.values());
  if (unassigned.users.length > 0) centresOut.push(unassigned);
  centresOut.sort((a, b) => b.costInrPaise - a.costInrPaise);
  for (const c of centresOut) c.users.sort((a, b) => b.costInrPaise - a.costInrPaise);

  const now = currentMonthKey();

  return NextResponse.json({
    success: true,
    data: {
      month,
      isCurrentMonth: month === now,
      since: since.toISOString(),
      until: until.toISOString(),
      generatedAt: new Date().toISOString(),
      totals: {
        calls: totalCalls,
        costInrPaise: totalCostInrPaise,
        byModel: Array.from(modelTotals.entries()).map(([model, v]) => ({ model, ...v })),
      },
      centres: centresOut.filter((c) => c.users.length > 0),
    },
  });
}
