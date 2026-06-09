import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export const maxDuration = 60;

// POST /api/ai/score-writing — AI scoring for writing responses
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

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
  modelAnswer?: string
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
${modelAnswer ? `Reference model answer (ideal summary):\n"${modelAnswer}"\n` : ""}Student's written summary (${wordCount} words):
"${responseText}"

Required: 50-70 words, written summary of spoken audio.
Score on 0-90:
- grammar: Grammatical accuracy and sentence structure
- spelling: Spelling accuracy
- content: Captures the main points of the spoken text, key ideas covered. If a model answer is provided, compare coverage of key ideas against it.
- structure: Clear organization, logical flow, appropriate use of linking words
- vocabulary: Range and appropriateness of vocabulary used. Penalise for copying exact phrases when paraphrasing was possible.
- overall: Weighted average (content 40%, grammar 25%, vocabulary 20%, structure 15%)

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
    systemPrompt = `You are an expert PTE Academic writing evaluator for Summarize Written Text. Score strictly on the official PTE rubric (0-90 scale). Return ONLY valid JSON.`;
    userPrompt = `
PTE Summarize Written Text Scoring

ORIGINAL PASSAGE:
"""
${questionPrompt}
"""
${modelAnswer ? `\nREFERENCE MODEL ANSWER (ideal summary for this passage):\n"${modelAnswer}"\n` : ""}
STUDENT'S SUMMARY (${wordCount} words):
"${responseText}"

SCORING RULES (PTE Academic official rubric):
Form check FIRST:
- Must be exactly ONE sentence (ends with a single full stop). If multiple sentences: structure = 0, penalise overall heavily.
- Must be 5-75 words. Outside range: penalise overall significantly.

Score each on 0-90:
- content (weight 40%): Does the summary capture the MAIN idea/thesis of the passage above? Compare against the passage text directly — not just topic keywords. Award high marks if the central argument is present, even if phrased differently. Penalise if only minor details are mentioned or the main point is missing.
- grammar (weight 25%): Grammatical accuracy, correct use of tense, subject-verb agreement, clause structure.
- vocabulary (weight 20%): Range and appropriateness of vocabulary. Award marks for academic/varied word choice. Penalise for repeated use of exact passage phrases (shows no paraphrasing skill).
- structure (weight 15%): Single-sentence format, logical flow, appropriate use of connectors/subordination.
- spelling: Spelling accuracy (minor weight).
- overall: Weighted sum: content*0.40 + grammar*0.25 + vocabulary*0.20 + structure*0.15. Then apply form penalties if applicable.

Provide:
- feedback: 2-3 specific, actionable sentences. Mention if main idea was captured or missed. Suggest vocabulary improvements if needed.
- corrections: Array of up to 3 {original, corrected, type} for specific errors.

Return JSON: { grammar, spelling, content, structure, vocabulary, wordCount: ${wordCount}, overall, feedback, corrections }`;
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
