import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 20;

// POST /api/ai/tts/preview — stream TTS audio to any authenticated user.
// Used for "Listen to model answer" shadowing on speaking questions.
// Does NOT save to Blob — audio is returned directly and discarded after playback.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const limited = await enforceRateLimit("ai", user!.id);
  if (limited) return limited;

  const { text, voice = "nova" } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ success: false, error: "text required" }, { status: 400 });
  }
  // Cap length to control cost
  const trimmed = text.slice(0, 600);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, error: "TTS not configured" }, { status: 500 });

  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", input: trimmed, voice, response_format: "mp3" }),
  });

  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    return NextResponse.json({ success: false, error: `TTS failed: ${err}` }, { status: 500 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
