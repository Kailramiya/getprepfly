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

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  
  // Forward Range header for Safari/Chrome audio playback
  const range = req.headers.get("range");
  if (range) {
    headers.set("Range", range);
  }

  const upstream = await fetch(blobUrl, { headers });

  if (!upstream.ok) {
    return NextResponse.json(
      { success: false, error: `Blob fetch failed: ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, max-age=3600");

  if (upstream.headers.has("content-length")) {
    responseHeaders.set("Content-Length", upstream.headers.get("content-length")!);
  }
  if (upstream.headers.has("content-range")) {
    responseHeaders.set("Content-Range", upstream.headers.get("content-range")!);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
