import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const maxDuration = 60;

// Vercel Cron Job — runs daily at 03:30 UTC (09:00 IST)
// Sends two types of re-engagement emails to STUDENT users:
//   1. Inactive 7 days  — last attempt was 7-8 days ago
//   2. Inactive 14 days — last attempt was 14-15 days ago (final nudge)
//   3. Improved this week — avg score up ≥5 pts vs prior week (Mondays only)
//
// Window-based detection means each user can only trigger each type once
// per 7-day cycle — no "last email sent" column needed.

function isCronAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev / local — allow without auth
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const APP_URL = process.env.NEXTAUTH_URL || "https://prepfly.in";

// ─── Email templates ──────────────────────────────────────────────────────────

function inactiveEmailHtml(name: string, days: 7 | 14, examDate: Date | null): string {
  const header = days === 7 ? "We miss you, " + name + "!" : "Don't let your exam prep slip";
  const subline =
    days === 7
      ? "It's been a week since your last practice session. Studies show consistent daily practice is the single biggest factor in PTE success."
      : "It's been 2 weeks since your last session. Your peers are practising — make sure you don't fall behind.";

  const examLine = examDate
    ? `<p style="margin:0 0 16px;color:#DC2626;font-size:14px;font-weight:600;">
         Your exam is on ${examDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
         Every day counts!
       </p>`
    : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#14B8A6,#4F46E5);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Prepfly</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">PTE Academic Practice Platform</p>
      </div>
      <div style="border:1px solid #E5E7EB;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${header}</h2>
        <p style="margin:0 0 16px;color:#6B7280;font-size:14px;line-height:1.6;">${subline}</p>
        ${examLine}
        <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin:0 0 24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Jump back in:</p>
          <ul style="margin:0;padding-left:20px;color:#6B7280;font-size:13px;line-height:1.8;">
            <li>Read Aloud — your most-practiced skill</li>
            <li>Repeat Sentence — quick wins every day</li>
            <li>Take a full Mock Test — see where you stand</li>
          </ul>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:linear-gradient(135deg,#14B8A6,#4F46E5);color:white;text-decoration:none;
                    padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            Resume Practice
          </a>
        </div>
        <div style="border-top:1px solid #E5E7EB;padding-top:16px;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">
            You're receiving this because you're enrolled on Prepfly.
            <a href="${APP_URL}/settings" style="color:#6B7280;">Manage notifications</a>
          </p>
        </div>
      </div>
    </div>`;
}

function improvedEmailHtml(
  name: string,
  improvementBySection: Array<{ section: string; delta: number; newAvg: number }>
): string {
  const best = improvementBySection[0];
  const sectionLabel = best.section.charAt(0) + best.section.slice(1).toLowerCase();

  const rows = improvementBySection
    .map(
      ({ section, delta, newAvg }) =>
        `<tr>
          <td style="padding:8px 12px;font-size:14px;color:#374151;">${section.charAt(0) + section.slice(1).toLowerCase()}</td>
          <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#059669;">+${delta} pts</td>
          <td style="padding:8px 12px;font-size:14px;color:#6B7280;">now ${newAvg}/90</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#059669,#14B8A6);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Prepfly</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Weekly Progress Report</p>
      </div>
      <div style="border:1px solid #E5E7EB;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Great progress this week, ${name}!</h2>
        <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
          Your ${sectionLabel} score improved by <strong style="color:#059669;">+${best.delta} points</strong> compared to last week. Keep going — you're on the right track!
        </p>
        <table style="width:100%;border-collapse:collapse;background:#F0FDF4;border-radius:8px;overflow:hidden;margin:0 0 24px;">
          <thead>
            <tr style="background:#DCFCE7;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#166534;">Section</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#166534;">Improvement</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#166534;">Current Avg</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin:28px 0;">
          <a href="${APP_URL}/progress"
             style="display:inline-block;background:linear-gradient(135deg,#059669,#14B8A6);color:white;text-decoration:none;
                    padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            View My Progress
          </a>
        </div>
        <div style="border-top:1px solid #E5E7EB;padding-top:16px;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">
            You're receiving this because you're enrolled on Prepfly.
            <a href="${APP_URL}/settings" style="color:#6B7280;">Manage notifications</a>
          </p>
        </div>
      </div>
    </div>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isCronAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const results = { inactive7: 0, inactive14: 0, improved: 0, errors: 0 };

  // ── 1. Inactive 7-day nudge ────────────────────────────────────────────────
  // Students whose last attempt was between 7 and 8 days ago (±1 day window)
  const sevenStart = daysAgo(8);
  const sevenEnd = daysAgo(7);

  const inactive7Users = await db.user.findMany({
    where: {
      role: "STUDENT",
      attempts: {
        some: { createdAt: { gte: sevenStart, lt: sevenEnd } },
        none: { createdAt: { gte: sevenEnd } },
      },
    },
    select: { email: true, name: true, examDate: true },
    take: 50,
  });

  for (const u of inactive7Users) {
    const name = u.name.split(" ")[0] || "there";
    try {
      await sendEmail({
        to: u.email,
        subject: "You haven't practised in a week — let's fix that",
        html: inactiveEmailHtml(name, 7, u.examDate),
      });
      results.inactive7++;
    } catch { results.errors++; }
  }

  // ── 2. Inactive 14-day final nudge ────────────────────────────────────────
  const fourteenStart = daysAgo(15);
  const fourteenEnd = daysAgo(14);

  const inactive14Users = await db.user.findMany({
    where: {
      role: "STUDENT",
      attempts: {
        some: { createdAt: { gte: fourteenStart, lt: fourteenEnd } },
        none: { createdAt: { gte: fourteenEnd } },
      },
    },
    select: { email: true, name: true, examDate: true },
    take: 50,
  });

  for (const u of inactive14Users) {
    const name = u.name.split(" ")[0] || "there";
    try {
      await sendEmail({
        to: u.email,
        subject: "2 weeks without practice — your exam prep needs you",
        html: inactiveEmailHtml(name, 14, u.examDate),
      });
      results.inactive14++;
    } catch { results.errors++; }
  }

  // ── 3. Weekly improvement email (Mondays only) ─────────────────────────────
  if (isMonday) {
    const thisWeekStart = daysAgo(7);
    const lastWeekStart = daysAgo(14);

    // Load students who have scored attempts in the last 14 days
    const activeStudents = await db.user.findMany({
      where: {
        role: "STUDENT",
        attempts: { some: { createdAt: { gte: lastWeekStart }, overallScore: { not: null } } },
      },
      select: {
        email: true,
        name: true,
        attempts: {
          where: { createdAt: { gte: lastWeekStart }, overallScore: { not: null } },
          select: { overallScore: true, createdAt: true, question: { select: { section: true } } },
        },
      },
      take: 200,
    });

    for (const u of activeStudents) {
      const thisWeek = u.attempts.filter(a => a.createdAt >= thisWeekStart);
      const lastWeek = u.attempts.filter(a => a.createdAt < thisWeekStart);

      if (thisWeek.length < 3 || lastWeek.length < 3) continue;

      const avgBySection = (attempts: typeof u.attempts) => {
        const map: Record<string, number[]> = {};
        for (const a of attempts) {
          const s = a.question.section;
          if (!map[s]) map[s] = [];
          map[s].push(a.overallScore!);
        }
        return Object.fromEntries(
          Object.entries(map).map(([s, scores]) => [
            s,
            Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          ])
        );
      };

      const thisAvg = avgBySection(thisWeek);
      const lastAvg = avgBySection(lastWeek);

      const improvements = Object.entries(thisAvg)
        .map(([section, avg]) => ({
          section,
          delta: avg - (lastAvg[section] ?? avg),
          newAvg: avg,
        }))
        .filter(d => d.delta >= 5)
        .sort((a, b) => b.delta - a.delta);

      if (improvements.length === 0) continue;

      const name = u.name.split(" ")[0] || "there";
      try {
        await sendEmail({
          to: u.email,
          subject: `Your PTE scores improved this week! +${improvements[0].delta} pts`,
          html: improvedEmailHtml(name, improvements),
        });
        results.improved++;
      } catch { results.errors++; }
    }
  }

  console.log("[cron/re-engagement]", results);
  return NextResponse.json({ success: true, ...results });
}
