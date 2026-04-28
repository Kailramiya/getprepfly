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

    // Option 1: Vercel Blob Storage (if configured)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await put(fileName, file, {
          access: "public",
          contentType: file.type,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return NextResponse.json({
          success: true,
          data: {
            url: blob.url,
            method: "vercel-blob",
            size: file.size,
            type: file.type,
          },
        });
      } catch (err: any) {
        console.error("Vercel Blob upload failed:", err?.message);
        // Fall through to base64 fallback
      }
    }

    // Option 2: Base64 data URL fallback — only safe for SMALL files (< 500KB)
    // Larger files break because:
    //   - Base64 inflates size by ~33%
    //   - API request body limits (Vercel free tier: 4.5 MB)
    //   - Postgres TEXT field gets bloated, slow queries
    const SAFE_FALLBACK_LIMIT = 500 * 1024; // 500 KB

    if (file.size > SAFE_FALLBACK_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large for inline storage (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 500 KB allowed without cloud storage. Please ask the platform admin to enable Vercel Blob storage to upload larger files, OR paste a public URL instead.`,
          needsCloudStorage: true,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUrl,
        method: "data-url",
        size: file.size,
        type: file.type,
        warning: "File stored inline (no cloud storage). For better performance, ask admin to enable Vercel Blob storage.",
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

