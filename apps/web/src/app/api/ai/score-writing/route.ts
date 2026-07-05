import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// POST /api/ai/score-writing — AI scoring for writing responses
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Throttle expensive OpenAI calls per user.
  const limited = await enforceRateLimit("ai", user!.id);
  if (limited) return limited;

  const body = await req.json();
  const { questionId, responseText, questionType, prompt: questionPrompt, modelAnswer } = body;

  if (!questionId || !responseText) {
    return NextResponse.json(
      { success: false, error: "questionId and responseText are required" },
      { status: 400 }
    );
  }

  try {
    const scores = await scoreWriting(responseText, questionType, questionPrompt, modelAnswer);

    // Save attempt
    const attempt = await db.attempt.create({
      data: {
        userId: user!.id,
        questionId,
        responseText,
        scores,
        rawPointsEarned: scores.rawPointsEarned,
        maxPointsPossible: scores.maxPointsPossible,
        overallScore: scores.overall,
        feedback: scores.feedback,
      },
    });

    return NextResponse.json({
      success: true,
      data: { scores, attemptId: attempt.id },
    });
  } catch (err) {
    console.error("Writing scoring error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to score your response" },
      { status: 500 }
    );
  }
}

async function scoreWriting(
  responseText: string,
  questionType: string,
  questionPrompt: string,
  _modelAnswer?: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;

  // Pre-Evaluation Gate Checks
  if (questionType === "SUMMARIZE_WRITTEN_TEXT") {
    // Check if exactly one terminal period and length 5-75
    const periods = (responseText.match(/[.!?]/g) || []).length;
    if (periods !== 1 || wordCount < 5 || wordCount > 75) {
      return {
        grammar: 0, spelling: 0, content: 0, structure: 0, vocabulary: 0,
        wordCount, overall: 0, rawPointsEarned: 0, maxPointsPossible: 7,
        feedback: "Format Failure: Your response must be a single sentence containing between 5 and 75 words. Zero points awarded.",
        corrections: []
      };
    }
  } else if (questionType === "WRITE_ESSAY") {
    if (wordCount < 120 || wordCount > 380) {
      return {
        grammar: 0, spelling: 0, content: 0, structure: 0, vocabulary: 0,
        wordCount, overall: 0, rawPointsEarned: 0, maxPointsPossible: 15,
        feedback: "Format Failure: Your essay must be between 120 and 380 words. Zero points awarded.",
        corrections: []
      };
    }
  }

  let systemPrompt: string;
  let userPrompt: string;
  let maxPointsPossible = 0;

  if (questionType === "SUMMARIZE_SPOKEN_TEXT") {
    maxPointsPossible = 10;
    systemPrompt = `You are an expert PTE evaluator for Summarize Spoken Text. Return ONLY a flat JSON object with single-digit integer values for the scores.`;
    userPrompt = `
PTE Summarize Spoken Text Scoring:
Audio topic: "${questionPrompt}"
Student's summary (${wordCount} words):
"${responseText}"

Evaluate based on PTE raw traits (Single-digit integers):
- content (0-2)
- form (0-2): 2 if 50-70 words, 1 if 40-49 or 71-100, 0 otherwise
- grammar (0-2)
- vocabulary (0-2)
- spelling (0-2)

Return JSON: { "grammar": int, "spelling": int, "content": int, "form": int, "vocabulary": int, "feedback": "2-3 short sentences" }`;
  } else if (questionType === "WRITE_ESSAY") {
    maxPointsPossible = 15;
    systemPrompt = `You are an expert PTE essay evaluator. Return ONLY a flat JSON object with single-digit integer values for the scores.`;
    userPrompt = `
PTE Write Essay Scoring:
Prompt: "${questionPrompt}"
Student's essay (${wordCount} words):
"${responseText}"

Evaluate based on PTE raw traits (Single-digit integers):
- content (0-3)
- form (0-2): 2 if 200-300 words
- structure (0-2)
- grammar (0-2)
- vocabulary (0-2)
- spelling (0-2)
- general_linguistic_range (0-2)

Return JSON: { "grammar": int, "spelling": int, "content": int, "structure": int, "vocabulary": int, "form": int, "general_linguistic_range": int, "feedback": "2-3 short sentences" }`;
  } else {
    // SUMMARIZE_WRITTEN_TEXT
    maxPointsPossible = 7;
    systemPrompt = `You are an expert PTE evaluator for Summarize Written Text. Return ONLY a flat JSON object with single-digit integer values for the scores.`;
    userPrompt = `
PTE Summarize Written Text Scoring:
ORIGINAL PASSAGE:
"""
${questionPrompt}
"""
STUDENT'S SUMMARY (${wordCount} words):
"${responseText}"

Evaluate based on PTE raw traits (Single-digit integers):
- content (0-2)
- form (0-1): 1 if exactly one sentence and 5-75 words, else 0
- grammar (0-2)
- vocabulary (0-2)

Return JSON: { "grammar": int, "content": int, "form": int, "vocabulary": int, "feedback": "2-3 short sentences" }`;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // Low temperature + fixed seed → far more consistent scores for the same
      // answer (students lose trust when identical responses score differently).
      temperature: 0.2,
      seed: 7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`GPT API error: ${response.statusText}`);

  const data = await response.json();
  let result: any;
  try {
    result = JSON.parse(data?.choices?.[0]?.message?.content ?? "");
  } catch {
    throw new Error("Scoring service returned an invalid response");
  }

  // Calculate raw points earned by summing the values
  const rawPointsEarned = (result.content || 0) + 
                          (result.form || 0) + 
                          (result.grammar || 0) + 
                          (result.vocabulary || 0) + 
                          (result.spelling || 0) + 
                          (result.structure || 0) + 
                          (result.general_linguistic_range || 0);

  // Convert to legacy 0-90 scale for display in UI
  const overall = maxPointsPossible > 0 ? Math.round((rawPointsEarned / maxPointsPossible) * 90) : 0;

  return {
    grammar: Math.round((result.grammar || 0) / 2 * 90), // fake 90 scale mapping
    spelling: Math.round((result.spelling || 0) / 2 * 90),
    content: Math.round((result.content || 0) / (questionType === "WRITE_ESSAY" ? 3 : 2) * 90),
    structure: Math.round((result.structure || 0) / 2 * 90),
    vocabulary: Math.round((result.vocabulary || 0) / 2 * 90),
    wordCount,
    overall,
    rawPointsEarned,
    maxPointsPossible,
    feedback: result.feedback || "Keep practicing!",
    corrections: result.corrections || [],
  };
}
