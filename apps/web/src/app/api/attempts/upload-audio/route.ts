import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB — 3-min recording at 48kbps webm

// POST /api/attempts/upload-audio — upload student speaking recording to Vercel Blob.
// Returns a persistent public URL to be stored in Attempt.responseAudio.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const questionId = formData.get("questionId") as string | null;

    if (!audioFile || !questionId) {
      return NextResponse.json(
        { success: false, error: "audio and questionId are required" },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { success: false, error: "Audio file too large (max 10 MB)" },
        { status: 400 }
      );
    }

    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobConfigured) {
      // Blob storage not configured — return gracefully so the attempt still saves
      return NextResponse.json(
        { success: false, error: "Audio storage not configured. Scores still saved.", notConfigured: true },
        { status: 503 }
      );
    }

    const { put } = await import("@vercel/blob");
    const ext = audioFile.name.split(".").pop() || "webm";
    // Namespace by userId so recordings are easily identifiable
    const fileName = `student-audio/${user!.id}/${questionId}-${Date.now()}.${ext}`;

    let audioUrl: string;
    try {
      const blob = await put(fileName, await audioFile.arrayBuffer(), {
        access: "public",
        contentType: audioFile.type || "audio/webm",
      });
      audioUrl = blob.url;
    } catch (pubErr: any) {
      // Private blob store fallback — proxy through media-proxy route
      if (pubErr?.message?.includes("private")) {
        const blob = await put(fileName, await audioFile.arrayBuffer(), {
          access: "private",
          contentType: audioFile.type || "audio/webm",
        });
        audioUrl = `/api/media-proxy?url=${encodeURIComponent(blob.url)}`;
      } else {
        throw pubErr;
      }
    }

    return NextResponse.json({ success: true, data: { audioUrl } });
  } catch (err: any) {
    console.error("Student audio upload error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
