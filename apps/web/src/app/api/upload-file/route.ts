import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";

// Max file sizes (bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15 MB

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
    const isAudio = file.type.startsWith("audio/");

    if (!isImage && !isAudio) {
      return NextResponse.json(
        { success: false, error: "Only image and audio files are allowed" },
        { status: 400 }
      );
    }

    // Normalize obscure audio MIME types to browser-friendly ones.
    // Some recording apps tag AAC files as audio/vnd.dlna.adts, which browsers
    // refuse to play even though the underlying data is just AAC.
    let normalizedType = file.type;
    const audioMimeRemap: Record<string, string> = {
      "audio/vnd.dlna.adts": "audio/aac",
      "audio/x-aac": "audio/aac",
      "audio/x-m4a": "audio/mp4",
      "audio/x-wav": "audio/wav",
      "audio/x-mpeg": "audio/mpeg",
      "audio/x-mp3": "audio/mpeg",
    };
    if (audioMimeRemap[file.type]) {
      normalizedType = audioMimeRemap[file.type];
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

    const SAFE_FALLBACK_LIMIT = 500 * 1024; // 500 KB
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

    // ---- Option 1: Vercel Blob Storage (preferred when configured) ----
    if (blobConfigured) {
      try {
        const { put } = await import("@vercel/blob");
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await put(fileName, file, {
          access: "public",
          contentType: normalizedType,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return NextResponse.json({
          success: true,
          data: {
            url: blob.url,
            method: "vercel-blob",
            size: file.size,
            type: normalizedType,
            originalType: file.type,
          },
        });
      } catch (err: any) {
        // Vercel Blob is configured but upload failed — surface the real error.
        // Don't silently fall back to base64 (that would mislead the user).
        const reason = err?.message || String(err) || "unknown error";
        console.error("Vercel Blob upload failed:", reason);

        // Only allow base64 fallback for tiny files (< 500KB) — for larger files,
        // surface the actual Blob error so admin can fix it.
        if (file.size > SAFE_FALLBACK_LIMIT) {
          return NextResponse.json(
            {
              success: false,
              error: `Vercel Blob upload failed: ${reason}. Please check the storage configuration and try again.`,
              blobError: reason,
            },
            { status: 502 }
          );
        }
        // Otherwise fall through to base64 (small file, harmless)
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
        warning: blobConfigured
          ? "Vercel Blob upload failed for this file — stored inline as fallback."
          : "File stored inline (no cloud storage). Enable Vercel Blob for better performance.",
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

