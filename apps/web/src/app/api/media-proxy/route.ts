import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/media-proxy?url=<encoded_blob_url>
// Proxies private Vercel Blob files to the browser using the server-side token.
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ success: false, error: "Missing url parameter" }, { status: 400 });
  }

  // Only proxy Vercel Blob URLs for safety
  if (!blobUrl.startsWith("https://") || !blobUrl.includes("blob.vercel-storage.com")) {
    return NextResponse.json({ success: false, error: "Invalid blob URL" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: "Blob token not configured" }, { status: 500 });
  }

  const upstream = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { success: false, error: `Blob fetch failed: ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Cache for 1 hour in browser, revalidate via CDN for 24h
      "Cache-Control": "private, max-age=3600",
    },
  });
}
