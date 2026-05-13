import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";

// GET /api/debug/blob-status — diagnostic endpoint for super admin to check Vercel Blob
// Returns whether the token is set + whether the @vercel/blob package can be imported.
// Hitting this requires SUPER_ADMIN to avoid leaking config status.
export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const tokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;
  let packageOk = false;
  let listOk: { ok: boolean; reason?: string; sampleCount?: number } = { ok: false };

  if (tokenSet) {
    try {
      const blob = await import("@vercel/blob");
      packageOk = true;
      // Try a real call: list (cheap, doesn't upload anything)
      try {
        const result = await blob.list({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          limit: 1,
        });
        listOk = { ok: true, sampleCount: result.blobs?.length ?? 0 };
      } catch (err: any) {
        listOk = { ok: false, reason: err?.message || String(err) };
      }
    } catch (err: any) {
      packageOk = false;
      listOk = { ok: false, reason: `Package import failed: ${err?.message}` };
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      tokenSet,
      packageInstalled: packageOk,
      blobApiReachable: listOk.ok,
      details: listOk,
      tokenPreview: tokenSet
        ? `${process.env.BLOB_READ_WRITE_TOKEN!.slice(0, 12)}...${process.env.BLOB_READ_WRITE_TOKEN!.slice(-4)}`
        : null,
    },
  });
}
