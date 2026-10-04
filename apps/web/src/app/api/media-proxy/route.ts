import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/media-proxy?url=<encoded_blob_url>
// Proxies private Vercel Blob files to the browser using the server-side token.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ success: false, error: "Missing url parameter" }, { status: 400 });
  }

  // Only proxy Vercel Blob hosts. Compare the parsed hostname: a substring check let
  // "https://evil.example/?blob.vercel-storage.com" through and sent our token to it.
  let host = "";
  try {
    const u = new URL(blobUrl);
    if (u.protocol === "https:") host = u.hostname;
  } catch {}
  if (host !== "blob.vercel-storage.com" && !host.endsWith(".blob.vercel-storage.com")) {
    return NextResponse.json({ success: false, error: "Invalid blob URL" }, { status: 400 });
  }

  // Student recordings live under student-audio/<userId>/ (see attempts/upload-audio): only the
  // owner, super admins, or staff of the owner's centre may play them. Other blobs are question
  // assets, which every signed-in user may load.
  const owner = /^\/student-audio\/([^/]+)\//.exec(new URL(blobUrl).pathname)?.[1];
  if (owner && owner !== user!.id && user!.role !== "SUPER_ADMIN") {
    const isStaff = user!.role === "CENTRE_ADMIN" || user!.role === "TEACHER";
    const student = isStaff && user!.centreId
      ? await db.user.findFirst({ where: { id: owner, centreId: user!.centreId }, select: { id: true } })
      : null;
    if (!student) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: "Blob token not configured" }, { status: 500 });
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  
  // Don't forward Range header to Vercel Blob to avoid conflicting stream states
  const upstream = await fetch(blobUrl, { headers, redirect: "error" });

  if (!upstream.ok) {
    console.error("[MediaProxy] Upstream fetch failed:", upstream.status, upstream.statusText);
    return NextResponse.json(
      { success: false, error: `Blob fetch failed: ${upstream.status}` },
      { status: upstream.status }
    );
  }

  // Load the entire file into memory (safe for small audio files)
  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") || "audio/mpeg";

  // Manually handle Range requests for Safari/Chrome compatibility
  const range = req.headers.get("range");
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const last = body.byteLength - 1;
    let start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : last;
    if (Number.isNaN(start)) { // suffix form "bytes=-N": the last N bytes
      start = Math.max(0, body.byteLength - end);
      end = last;
    }
    end = Math.min(end, last);
    if (Number.isNaN(end) || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${body.byteLength}` } });
    }
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
