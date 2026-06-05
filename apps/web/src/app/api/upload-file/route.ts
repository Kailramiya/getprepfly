import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";

// Max file sizes (bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB

// POST /api/upload-file — upload file (image or audio) for questions.
// Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is configured,
// otherwise falls back to base64 data URL (smaller files only).
export async function POST(req: NextRequest) {
  // Only admins/teachers can upload files
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "questions";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith("image/");

    // Browsers sometimes report audio files (especially .mpeg) as video/mpeg or video/mp4.
    // Also accept by file extension as a fallback when MIME is generic/wrong.
    const AUDIO_EXTENSIONS = new Set([
      ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
      ".mpeg", ".mpg", ".weba", ".wma", ".opus", ".aiff", ".aif", ".mp4",
    ]);
    const fileExt = "." + (file.name.split(".").pop() || "").toLowerCase();
    const isAudio =
      file.type.startsWith("audio/") ||
      file.type === "video/mpeg" ||
      file.type === "video/mp4" ||
      file.type === "video/x-m4v" ||
      (!isImage && AUDIO_EXTENSIONS.has(fileExt));

    if (!isImage && !isAudio) {
      return NextResponse.json(
        { success: false, error: "Only image and audio files are allowed" },
        { status: 400 }
      );
    }

    // Normalize non-standard / browser-inconsistent audio MIME types to
    // browser-friendly equivalents so the player can handle them.
    let normalizedType = file.type;
    const audioMimeRemap: Record<string, string> = {
      // Standard alias fixes
      "audio/mp3": "audio/mpeg",
      "audio/x-mp3": "audio/mpeg",
      "audio/x-mpeg": "audio/mpeg",
      "audio/mpeg3": "audio/mpeg",
      // AAC variants
      "audio/vnd.dlna.adts": "audio/aac",
      "audio/x-aac": "audio/aac",
      // M4A / MP4 audio
      "audio/x-m4a": "audio/mp4",
      // WAV variants
      "audio/x-wav": "audio/wav",
      "audio/wave": "audio/wav",
      // Video MIME types that carry audio-only content (.mpeg files)
      "video/mpeg": "audio/mpeg",
      "video/mp4": "audio/mp4",
      "video/x-m4v": "audio/mp4",
      // OGG variants
      "audio/x-ogg": "audio/ogg",
    };
    if (audioMimeRemap[file.type]) {
      normalizedType = audioMimeRemap[file.type];
    }
    // If still unknown (e.g. application/octet-stream) and extension is known audio, guess from ext
    if (!normalizedType.startsWith("audio/") && !normalizedType.startsWith("image/") && isAudio) {
      const extMimeMap: Record<string, string> = {
        ".mp3": "audio/mpeg", ".mpeg": "audio/mpeg", ".mpg": "audio/mpeg",
        ".wav": "audio/wav", ".ogg": "audio/ogg", ".aac": "audio/aac",
        ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".flac": "audio/flac",
        ".opus": "audio/opus", ".weba": "audio/webm", ".wma": "audio/x-ms-wma",
        ".aiff": "audio/aiff", ".aif": "audio/aiff",
      };
      normalizedType = extMimeMap[fileExt] || "audio/mpeg";
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max ${isImage ? "5 MB" : "15 MB"} allowed.`,
        },
        { status: 400 }
      );
    }

    const SAFE_FALLBACK_LIMIT = isImage ? 2 * 1024 * 1024 : 500 * 1024; // 2 MB for images, 500 KB for audio
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

    // ---- Option 1: Vercel Blob Storage (preferred when configured) ----
    if (blobConfigured) {
      try {
        const { put } = await import("@vercel/blob");
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();

        // Try public access first; if the store is private, fall back to private access.
        let blob: Awaited<ReturnType<typeof put>> | null = null;
        let isPrivate = false;

        try {
          blob = await put(fileName, arrayBuffer, {
            access: "public",
            contentType: normalizedType,
          });
        } catch (pubErr: any) {
          if (pubErr?.message?.includes("private")) {
            // Store is configured as private — retry with private access
            blob = await put(fileName, arrayBuffer, {
              access: "private",
              contentType: normalizedType,
            });
            isPrivate = true;
          } else {
            throw pubErr;
          }
        }

        // For private blobs the raw URL requires the token to access.
        // Wrap it in our proxy route so audio/images load in the browser.
        const serveUrl = isPrivate
          ? `/api/media-proxy?url=${encodeURIComponent(blob!.url)}`
          : blob!.url;

        return NextResponse.json({
          success: true,
          data: {
            url: serveUrl,
            method: "vercel-blob",
            size: file.size,
            type: normalizedType,
          },
        });
      } catch (err: any) {
        const reason = err?.message || String(err) || "unknown error";
        console.error("Vercel Blob upload failed:", reason);

        // If Blob fails and file is too large for base64 fallback, return error
        if (file.size > SAFE_FALLBACK_LIMIT) {
          return NextResponse.json(
            {
              success: false,
              error: `Upload failed: ${reason}. Check that BLOB_READ_WRITE_TOKEN is set correctly in Vercel → Settings → Environment Variables.`,
            },
            { status: 502 }
          );
        }
        // Small file — fall through to base64 silently
      }
    }

    // ---- Option 2: Base64 data URL fallback (no cloud storage configured) ----
    if (file.size > SAFE_FALLBACK_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: blobConfigured
            ? `Vercel Blob is configured but upload failed for this file (${(file.size / 1024 / 1024).toFixed(2)} MB). Check Vercel dashboard for storage status.`
            : `File too large for inline storage (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum 500 KB without Vercel Blob. Enable it from Vercel dashboard → Storage → Blob, then redeploy.`,
          needsCloudStorage: !blobConfigured,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${normalizedType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUrl,
        method: "data-url",
        size: file.size,
        type: normalizedType,
        warning: blobConfigured ? undefined : "File stored inline. Enable Vercel Blob for better performance.",
      },
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

