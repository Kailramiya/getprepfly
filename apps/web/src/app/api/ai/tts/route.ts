import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export const maxDuration = 30;

// POST /api/ai/tts — generate audio for a question using OpenAI TTS
// Admin-only. Calls OpenAI TTS, uploads to Vercel Blob, saves URL to question.
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const { questionId, text, voice = "nova" } = await req.json();
  if (!questionId || !text) {
    return NextResponse.json({ success: false, error: "questionId and text required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, error: "OpenAI not configured" }, { status: 500 });

  // Call OpenAI TTS
  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", input: text, voice, response_format: "mp3" }),
  });

  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    return NextResponse.json({ success: false, error: `TTS failed: ${err}` }, { status: 500 });
  }

  // Upload audio to Vercel Blob
  const { put } = await import("@vercel/blob");
  const audioBuffer = await ttsRes.arrayBuffer();
  const blob = await put(`tts/${questionId}.mp3`, audioBuffer, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
  });

  // Save URL to question
  await db.question.update({
    where: { id: questionId },
    data: { audioUrl: blob.url },
  });

  return NextResponse.json({ success: true, data: { audioUrl: blob.url } });
}
