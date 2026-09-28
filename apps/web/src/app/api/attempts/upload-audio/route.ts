import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { isR2Configured, putToR2 } from "@/lib/r2";

const MAX_AUDIO_SIZE = 2 * 1024 * 1024; // 2 MB — a 3-min speech recording at 32kbps opus is ~0.7 MB

// POST /api/attempts/upload-audio — upload student speaking recording to Cloudflare R2.
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
        { success: false, error: "Audio file too large (max 2 MB)" },
        { status: 400 }
      );
    }

    if (!isR2Configured()) {
      // Storage not configured — return gracefully so the attempt still saves
      return NextResponse.json(
        { success: false, error: "Audio storage not configured. Scores still saved.", notConfigured: true },
        { status: 503 }
      );
    }

    const ext = audioFile.name.split(".").pop() || "webm";
    // Namespace by userId so recordings are easily identifiable
    const key = `student-audio/${user!.id}/${questionId}-${Date.now()}.${ext}`;
    const audioUrl = await putToR2(key, Buffer.from(await audioFile.arrayBuffer()), audioFile.type || "audio/webm");

    return NextResponse.json({ success: true, data: { audioUrl } });
  } catch (err: any) {
    console.error("Student audio upload error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
