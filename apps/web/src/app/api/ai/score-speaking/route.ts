import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUserAccess, canAccessQuestion, FREE_DAILY_SPEAKING_SCORINGS } from "@/lib/access";
import { enforceRateLimit, isRateLimited, reserveAiCall } from "@/lib/rate-limit";
import { diffWords, diffStats, toWords, UNCLEAR_MATCH_RATIO } from "@/lib/word-diff";

export const maxDuration = 60; // seconds — required for Whisper + GPT pipeline

// Speaking answers are at most ~2 min; Whisper itself caps uploads at 25 MB.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// POST /api/ai/score-speaking — AI scoring for speaking responses
// Accepts: audio blob (as base64 or URL) + expected text
// Returns: pronunciation, fluency, content scores + feedback
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Throttle expensive OpenAI calls per user.
  const limited = await enforceRateLimit("ai", user!.id);
  if (limited) return limited;

  const formData = await req.formData();
  const questionId = formData.get("questionId") as string;
  const audioFile = formData.get("audio");

  if (!questionId || !(audioFile instanceof File)) {
    return NextResponse.json(
      { success: false, error: "questionId and audio file are required" },
      { status: 400 }
    );
  }
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ success: false, error: "Recording is too large" }, { status: 413 });
  }

  // The reference text and type come from the DB, never the client: a caller who controls
  // them could submit the expected text as the "reference" and earn full content marks.
  const question = await db.question.findUnique({ where: { id: questionId } });
  if (!question || !question.isActive || question.section !== "SPEAKING" || !(await canAccessQuestion(user!, question))) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }
  const questionType = question.type;
  const qContent = (question.content as any) || {};
  const expectedText: string =
    (questionType === "ANSWER_SHORT_QUESTION" ? qContent.correctText : undefined) || qContent.text || "";

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

  const spend = user!.role === "SUPER_ADMIN" ? null : await reserveAiCall(user!.id);
  if (spend && !spend.ok) return spend.response;

  try {
    // Step 1: Transcribe audio using OpenAI Whisper (verbose_json)
    const transcriptionObj = await transcribeAudio(audioFile);
    const transcriptionText = transcriptionObj.text || "";

    // Silence or noise comes back from Whisper as made-up words. If a Read Aloud / Repeat
    // Sentence recording barely resembles the text, it wasn't an attempt: don't grade it, don't
    // save a 0-mark attempt, and give the call back (a few per hour; past that it counts, so
    // this can't be used for free Whisper calls).
    const expectedWords = toWords(expectedText);
    if ((questionType === "READ_ALOUD" || questionType === "REPEAT_SENTENCE") && expectedWords.length > 0) {
      const stats = diffStats(diffWords(expectedWords, toWords(transcriptionText)));
      if (stats.ratio < UNCLEAR_MATCH_RATIO) {
        if (spend && !(await isRateLimited("unclear", user!.id))) await spend.release();
        return NextResponse.json(
          {
            success: false,
            code: "UNCLEAR_AUDIO",
            error: "We couldn't hear a clear reading of the passage. Check your microphone and try again.",
          },
          { status: 422 }
        );
      }
    }

    // Step 2: Score using programmatic methods + GPT for content
    const scores = await scoreSpeaking(transcriptionObj, expectedText, questionType);

    // Step 3: Save attempt
    const attempt = await db.attempt.create({
      data: {
        userId: user!.id,
        questionId,
        responseText: transcriptionText,
        scores,
        rawPointsEarned: scores.rawPointsEarned,
        maxPointsPossible: scores.maxPointsPossible,
        overallScore: scores.overall,
        feedback: scores.feedback,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transcription: transcriptionText,
        scores,
        attemptId: attempt.id,
      },
    });
  } catch (err) {
    await spend?.release();
    console.error("Speaking scoring error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to score your response. Please try again." },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioFile: File): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Create form data for Whisper API
  const formData = new FormData();
  formData.append("file", audioFile, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

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

  return await response.json();
}

async function scoreSpeaking(
  transcriptionObj: any,
  expectedText: string,
  questionType: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const transcriptionText = transcriptionObj.text || "";
  const words = transcriptionObj.words || [];
  const duration = transcriptionObj.duration || 1; // seconds

  // --- Programmatic Fluency Calculation ---
  const durationMinutes = duration / 60;
  const wpm = words.length / durationMinutes;
  // Target WPM: 130-150. Base score out of 5.
  let baseFluency = 5;
  if (wpm < 130) {
    baseFluency = Math.max(0, 5 - Math.round((130 - wpm) / 20));
  } else if (wpm > 160) {
    baseFluency = Math.max(0, 5 - Math.round((wpm - 160) / 20)); // Too fast penalty
  }

  let unnaturalPauses = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 1.2) unnaturalPauses++;
  }
  const fluencyScore = Math.max(0, baseFluency - unnaturalPauses);

  // --- Programmatic Pronunciation Calculation ---
  let totalConfidence = 0;
  for (const w of words) {
    // 'probability' is not always perfectly available depending on the exact OpenAI version/model
    // but we use it if present, otherwise default to a high baseline.
    totalConfidence += (w.probability || w.confidence || 0.85);
  }
  const avgConfidence = words.length > 0 ? totalConfidence / words.length : 0;
  const pronScore = Math.max(0, Math.round(avgConfidence * 5));

  // --- GPT-4 for Content Scoring Only ---
  const isASQ = questionType === "ANSWER_SHORT_QUESTION";
  let maxContent = 5;
  if (questionType === "REPEAT_SENTENCE" || isASQ) maxContent = 3;

  const prompt = `
PTE Speaking - Content Score Only.
Question Type: ${questionType}
Expected Text/Reference: "${expectedText}"
Student's Transcription: "${transcriptionText}"

Score ONLY Content (0-${maxContent}):
Return ONLY a JSON object: { "content": int, "feedback": "1-2 sentences" }
  `;

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
          content: `You are an expert PTE Academic speaking evaluator. Return ONLY valid JSON with single-digit integer content score and short feedback.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
      seed: 7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT API error: ${response.statusText}`);
  }

  const data = await response.json();
  let result: any;
  try {
    result = JSON.parse(data?.choices?.[0]?.message?.content ?? "");
  } catch {
    throw new Error("Scoring service returned an invalid response");
  }

  const contentScore = Math.min(maxContent, Math.max(0, result.content || 0));
  
  // FIXED: If task is ASQ, strip fluency and pronunciation traits completely
  // PTE CASCADE RULE: If content is 0, ALL other speaking traits must be 0
  const finalFluency = contentScore === 0 ? 0 : (isASQ ? 0 : fluencyScore);
  const finalPron = contentScore === 0 ? 0 : (isASQ ? 0 : pronScore);
  
  const rawPointsEarned = finalPron + finalFluency + contentScore;
  const maxPointsPossible = isASQ ? 3 : (5 + 5 + maxContent);
  const overall = maxPointsPossible > 0 ? Math.round((rawPointsEarned / maxPointsPossible) * 90) : 0;

  return {
    pronunciation: isASQ ? 0 : Math.round((finalPron / 5) * 90), // Fake 0-90 mapping for UI backward compatibility
    fluency: isASQ ? 0 : Math.round((finalFluency / 5) * 90),
    content: Math.round((contentScore / maxContent) * 90),
    overall,
    rawPointsEarned,
    maxPointsPossible,
    rawPronunciation: finalPron,
    rawFluency: finalFluency,
    rawContent: contentScore,
    wpm: Math.round(wpm),
    unnaturalPauses,
    feedback: result.feedback || "Good effort!",
    details: null,
  };
}

// buildScoringPrompt removed as it is no longer needed since GPT only scores content now.
