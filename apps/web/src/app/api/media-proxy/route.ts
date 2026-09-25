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
  
  // Don't forward Range header to Vercel Blob to avoid conflicting stream states
  const upstream = await fetch(blobUrl, { headers });

  if (!upstream.ok) {
    console.error("[MediaProxy] Upstream fetch failed:", upstream.status, upstream.statusText, blobUrl);
    return NextResponse.json(
      { success: false, error: `Blob fetch failed: ${upstream.status}` },
      { status: upstream.status }
    );
  }

  // Load the entire file into memory (safe for small audio files)
  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") || "audio/mpeg";

  console.log(`[MediaProxy] Successfully fetched ${body.byteLength} bytes from ${blobUrl}`);

  // Manually handle Range requests for Safari/Chrome compatibility
  const range = req.headers.get("range");
  if (range) {
    console.log(`[MediaProxy] Handling Range request: ${range}`);
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : body.byteLength - 1;
    const chunksize = (end - start) + 1;
    const sliced = body.slice(start, end + 1);

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Range", `bytes ${start}-${end}/${body.byteLength}`);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Content-Length", chunksize.toString());
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    return new Response(sliced, {
      status: 206,
      headers: responseHeaders,
    });
  }

  console.log(`[MediaProxy] Serving full file (${body.byteLength} bytes)`);
  // Return the full file if no Range header was sent
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Length", body.byteLength.toString());
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", "private, max-age=3600");

  return new Response(body, {
    status: 200,
    headers: responseHeaders,
  });
}
