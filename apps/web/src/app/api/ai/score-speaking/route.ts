import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUserAccess, FREE_DAILY_SPEAKING_SCORINGS } from "@/lib/access";

// POST /api/ai/score-speaking — AI scoring for speaking responses
// Accepts: audio blob (as base64 or URL) + expected text
// Returns: pronunciation, fluency, content scores + feedback
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { questionId, audioBase64, expectedText, questionType } = body;

  if (!questionId || !audioBase64) {
    return NextResponse.json(
      { success: false, error: "questionId and audioBase64 are required" },
      { status: 400 }
    );
  }

  // Enforce daily AI scoring limit for non-premium, post-trial users
  const access = await getUserAccess(user!.id);
  const hasUnlimitedScoring = access.hasAllAccess || access.isTrial;
  if (!hasUnlimitedScoring && access.freeSpeakingScoringsRemaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Daily limit reached. You get ${FREE_DAILY_SPEAKING_SCORINGS} free AI scorings per day. Upgrade to unlock unlimited scoring.`,
        limitReached: true,
        limit: FREE_DAILY_SPEAKING_SCORINGS,
      },
      { status: 403 }
    );
  }

  try {
    // Step 1: Transcribe audio using OpenAI Whisper
    const transcription = await transcribeAudio(audioBase64);

    // Step 2: Score using GPT based on question type
    const scores = await scoreSpeaking(transcription, expectedText, questionType);

    // Step 3: Save attempt
    const attempt = await db.attempt.create({
      data: {
        userId: user!.id,
        questionId,
        responseText: transcription,
        scores,
        overallScore: scores.overall,
        feedback: scores.feedback,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transcription,
        scores,
        attemptId: attempt.id,
      },
    });
  } catch (err) {
    console.error("Speaking scoring error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to score your response. Please try again." },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioBase64: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Convert base64 to buffer
  const audioBuffer = Buffer.from(audioBase64, "base64");

  // Create form data for Whisper API
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("response_format", "text");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.statusText}`);
  }

  return (await response.text()).trim();
}

async function scoreSpeaking(
  transcription: string,
  expectedText: string,
  questionType: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = buildScoringPrompt(transcription, expectedText, questionType);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert PTE Academic speaking evaluator. Score the student's response on a scale of 0-90 for each criterion. Be fair but constructive. Return ONLY valid JSON.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    pronunciation: Math.min(90, Math.max(0, result.pronunciation || 0)),
    fluency: Math.min(90, Math.max(0, result.fluency || 0)),
    content: Math.min(90, Math.max(0, result.content || 0)),
    overall: Math.min(90, Math.max(0, result.overall || 0)),
    feedback: result.feedback || "Keep practicing!",
    details: result.details || null,
  };
}

function buildScoringPrompt(transcription: string, expectedText: string, questionType: string): string {
  if (questionType === "READ_ALOUD") {
    return `
PTE Read Aloud Scoring:
Expected text: "${expectedText}"
Student's transcription: "${transcription}"

Score on 0-90 scale:
- pronunciation: How accurately words are pronounced (compare transcription to expected)
- fluency: Smooth delivery, natural rhythm (inferred from transcription completeness)
- content: How much of the expected text was covered
- overall: Weighted average (content 40%, pronunciation 30%, fluency 30%)

Also provide:
- feedback: 2-3 sentences of constructive feedback
- details: specific words or areas to improve

Return JSON: { pronunciation, fluency, content, overall, feedback, details }`;
  }

  if (questionType === "REPEAT_SENTENCE") {
    return `
PTE Repeat Sentence Scoring:
Expected sentence: "${expectedText}"
Student said: "${transcription}"

Score on 0-90 scale:
- pronunciation: Accuracy of word pronunciation
- fluency: Natural flow and rhythm
- content: How many words match the expected sentence (word-for-word comparison)
- overall: Weighted average

Return JSON: { pronunciation, fluency, content, overall, feedback, details }`;
  }

  if (questionType === "DESCRIBE_IMAGE" || questionType === "RETELL_LECTURE") {
    return `
PTE ${questionType.replace("_", " ")} Scoring:
${expectedText ? `Reference content: "${expectedText}"` : ""}
Student's response: "${transcription}"

Score on 0-90 scale:
- pronunciation: Clarity of speech
- fluency: Smooth delivery, appropriate pace, minimal pauses/fillers
- content: Relevance, key points covered, vocabulary used
- overall: Weighted average (content 45%, fluency 30%, pronunciation 25%)

Return JSON: { pronunciation, fluency, content, overall, feedback, details }`;
  }

  // Default scoring prompt
  return `
PTE Speaking Scoring for ${questionType}:
${expectedText ? `Expected: "${expectedText}"` : ""}
Student said: "${transcription}"

Score on 0-90 scale: pronunciation, fluency, content, overall.
Provide feedback and details.
Return JSON: { pronunciation, fluency, content, overall, feedback, details }`;
}
