import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const WORD_REGEX = /^[a-zA-Z'-]{1,40}$/;

// GET /api/vocabulary/lookup?word=xxx — look up a word's meaning (English + Hindi)
// with an example sentence. Checks the Vocabulary table first, then falls back
// to AI and caches the result for future lookups.
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const raw = (url.searchParams.get("word") || "").trim();
  if (!WORD_REGEX.test(raw)) {
    return NextResponse.json({ success: false, error: "Invalid word" }, { status: 400 });
  }
  const word = raw.toLowerCase();

  const existing = await db.vocabulary.findFirst({
    where: { word: { equals: word, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      data: { word: existing.word, meaning: existing.meaning, meaningHi: existing.meaningHi, example: existing.example },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Word lookup is not available right now" }, { status: 503 });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly English-Hindi dictionary for PTE Academic students. Given a single English word, respond with a JSON object containing: " +
            '"meaning" (a clear, detailed explanation of the word in simple, easy-to-understand English, 1-2 sentences), ' +
            '"meaningHi" (the same meaning explained in simple, everyday Hindi, written in Devanagari script), and ' +
            '"example" (one natural example sentence using the word). Keep the language simple and student-friendly.',
        },
        { role: "user", content: `Word: "${raw}"` },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ success: false, error: "Word lookup failed" }, { status: 502 });
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Cache for future lookups (best-effort — ignore failures, e.g. a race with another request)
  db.vocabulary
    .create({
      data: {
        word,
        meaning: result.meaning,
        meaningHi: result.meaningHi || null,
        example: result.example,
        category: "auto",
        difficulty: "MEDIUM",
      },
    })
    .catch(() => {});

  return NextResponse.json({
    success: true,
    data: { word: raw, meaning: result.meaning, meaningHi: result.meaningHi || null, example: result.example },
  });
}
