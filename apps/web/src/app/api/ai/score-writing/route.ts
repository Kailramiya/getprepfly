import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export const maxDuration = 60;

// POST /api/ai/score-writing — AI scoring for writing responses
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { questionId, responseText, questionType, prompt: questionPrompt } = body;

  if (!questionId || !responseText) {
    return NextResponse.json(
      { success: false, error: "questionId and responseText are required" },
      { status: 400 }
    );
  }

  try {
    const scores = await scoreWriting(responseText, questionType, questionPrompt);

    // Save attempt
    const attempt = await db.attempt.create({
      data: {
        userId: user!.id,
        questionId,
        responseText,
        scores,
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
  questionPrompt: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;

  let systemPrompt: string;
  let userPrompt: string;

  if (questionType === "SUMMARIZE_SPOKEN_TEXT") {
    systemPrompt = `You are an expert PTE Academic evaluator for Summarize Spoken Text. Score on 0-90 scale. Return ONLY valid JSON.`;
    userPrompt = `
PTE Summarize Spoken Text Scoring:
Audio topic/context: "${questionPrompt}"
Student's written summary (${wordCount} words):
"${responseText}"

Required: 50-70 words, written summary of spoken audio.
Score on 0-90:
- grammar: Grammatical accuracy and sentence structure
- spelling: Spelling accuracy
- content: Captures the main points of the spoken text, key ideas covered
- structure: Clear organization, logical flow, appropriate use of linking words
- vocabulary: Range and appropriateness of vocabulary used
- overall: Weighted average (content 40%, grammar 25%, structure 15%, vocabulary 15%, spelling 5%)

Word count check:
- If < 50 or > 70 words: reduce overall by 10-15 points

Provide:
- feedback: 2-3 sentences of specific, actionable feedback
- corrections: Array of {original, corrected, type} for up to 3 errors

Return JSON: { grammar, spelling, content, structure, vocabulary, wordCount: ${wordCount}, overall, feedback, corrections }`;
  } else if (questionType === "WRITE_ESSAY") {
    systemPrompt = `You are an expert PTE Academic essay evaluator. Score strictly on the PTE rubric (0-90 scale). Be fair and constructive. Return ONLY valid JSON.`;
    userPrompt = `
PTE Write Essay Scoring:
Prompt: "${questionPrompt}"
Student's essay (${wordCount} words):
"${responseText}"

Required: 200-300 words. Score on 0-90 for each:
- grammar: Grammatical accuracy, sentence structure variety
- spelling: Spelling accuracy
- content: Relevance to prompt, argument development, examples
- structure: Introduction, body, conclusion. Paragraph organization, cohesion, linking words
- vocabulary: Range and appropriateness of vocabulary
- overall: Weighted average (content 30%, grammar 25%, structure 20%, vocabulary 15%, spelling 10%)

Also check:
- Word count penalty: if < 200 or > 300 words, reduce overall by 10-20 points
- Off-topic: if essay doesn't address the prompt, content score should be < 30

Provide:
- feedback: 3-4 sentences of specific, actionable feedback
- corrections: Array of {original, corrected, type} for up to 5 errors found

Return JSON: { grammar, spelling, content, structure, vocabulary, wordCount: ${wordCount}, overall, feedback, corrections }`;
  } else {
    // SUMMARIZE_WRITTEN_TEXT (default)
    systemPrompt = `You are an expert PTE Academic writing evaluator for Summarize Written Text. Score on 0-90 scale. Return ONLY valid JSON.`;
    userPrompt = `
PTE Summarize Written Text Scoring:
Original passage topic: "${questionPrompt}"
Student's summary (${wordCount} words):
"${responseText}"

Required: One sentence, 5-75 words.
Score on 0-90:
- grammar: Single complete sentence with correct grammar
- spelling: Spelling accuracy
- content: Captures the main idea of the passage
- structure: Single sentence format (penalty if multiple sentences)
- overall: Weighted average

Word count check:
- If < 5 or > 75 words: overall should be significantly penalized
- If multiple sentences: structure penalty

Provide feedback and up to 3 corrections.
Return JSON: { grammar, spelling, content, structure, vocabulary: 0, wordCount: ${wordCount}, overall, feedback, corrections }`;
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
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`GPT API error: ${response.statusText}`);

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    grammar: clampScore(result.grammar),
    spelling: clampScore(result.spelling),
    content: clampScore(result.content),
    structure: clampScore(result.structure),
    vocabulary: clampScore(result.vocabulary),
    wordCount,
    overall: clampScore(result.overall),
    feedback: result.feedback || "Keep practicing!",
    corrections: result.corrections || [],
  };
}

function clampScore(score: number): number {
  return Math.min(90, Math.max(0, Math.round(score || 0)));
}
