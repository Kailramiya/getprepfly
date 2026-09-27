import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 30;
const TIME_BUDGET_MS = 45_000;

// Vercel Cron — daily. Deletes student speaking recordings older than RETENTION_DAYS from
// Vercel Blob and clears Attempt.responseAudio so no dead links remain. Scores are untouched.
// Add ?dryRun=1 to see what would be deleted without changing anything.
function isCronAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthed(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ success: true, skipped: "Blob storage not configured" });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const { list, del } = await import("@vercel/blob");
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const startedAt = Date.now();

  let scanned = 0;
  let expired = 0;
  let bytes = 0;
  let cursor: string | undefined;
  let finished = true;

  // ponytail: list() is alphabetical, so a very large store needs several runs; the time
  // budget keeps one run under the function limit and the next run continues from a
  // smaller store.
  do {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      finished = false;
      break;
    }
    const page = await list({ prefix: "student-audio/", limit: 1000, cursor });
    scanned += page.blobs.length;
    const old = page.blobs.filter((b) => b.uploadedAt.getTime() < cutoff);
    expired += old.length;
    bytes += old.reduce((n, b) => n + b.size, 0);

    if (!dryRun) {
      for (let i = 0; i < old.length; i += 100) {
        const urls = old.slice(i, i + 100).map((b) => b.url);
        // Clear DB links first so a failed delete never leaves a link to a missing file.
        await db.attempt.updateMany({
          where: {
            responseAudio: {
              in: [...urls, ...urls.map((u) => `/api/media-proxy?url=${encodeURIComponent(u)}`)],
            },
          },
          data: { responseAudio: null },
        });
        await del(urls);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return NextResponse.json({
    success: true,
    data: { dryRun, retentionDays: RETENTION_DAYS, scanned, expired, freedMB: Math.round(bytes / 1048576), finished },
  });
}
