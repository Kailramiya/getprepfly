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
- vocabulary: Range and appropriateness of vocabulary used. Note: picking key phrases/sentences directly from the spoken content and joining them with connectors is a VALID, commonly-taught strategy — do NOT penalise this. Only penalise genuinely poor or repetitive word choice.
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

IMPORTANT — VALID STUDENT STRATEGY:
A common, officially-acceptable technique is to pick 2-4 key sentences/clauses DIRECTLY from the passage above (e.g. the topic sentence of each paragraph, or the main claim + key supporting points) and join them into a single sentence using connectors (e.g. "while", "moreover", "in addition", "as a result", "although", "which"). This is NOT plagiarism or weak paraphrasing — treat it as a legitimate, well-scoring approach. Do NOT penalise vocabulary or content just because the wording matches the passage. Score this approach highly as long as:
  - The selected lines collectively represent the passage's main idea + key supporting points (not just minor/random details).
  - The connectors join them into ONE grammatically correct sentence.

CRITICAL: Score each criterion INDEPENDENTLY. A weakness in one criterion (e.g. grammar) must NOT drag down the score of another criterion (e.g. content, vocabulary, spelling). Base every score on the official PTE point bands below, converted to the 0-90 scale (0/2→0-10, 1/2→45-65, 2/2→80-90; 0/1→0-30, 1/1→80-90).

Form check FIRST:
- Should be exactly ONE sentence (ends with a single full stop). If the response has multiple sentences/full stops, do NOT zero out structure — instead apply a partial penalty proportional to how many extra sentences there are (e.g. 2 sentences: moderate penalty; 3+ sentences: larger penalty), and reduce overall moderately. Still award content/grammar/vocabulary marks normally for what was written.
- Ideal length is 50-75 words (PTE allows 5-75, but 50-75 using the copy+connect technique is the expected target). Outside the 5-75 range: penalise overall significantly.

Score each on 0-90, using these official PTE descriptors as anchors:

- content (weight 40%) — PTE "Content" (0-2 pts):
  * 2/2 (≈80-90): Captures the main idea AND at least one key supporting point from the passage. Verbatim lines from the passage count fully — do not require paraphrasing.
  * 1/2 (≈45-65): Captures the main idea but misses most supporting points, OR only captures supporting details without the main idea.
  * 0/2 (≈0-10): Main idea is missing or misrepresented; only trivial/irrelevant details included.

- grammar (weight 25%) — PTE "Grammar" (0-2 pts), judge ONLY the grammatical correctness of the sentence(s) actually written:
  * 2/2 (≈80-90): No grammatical errors, or none that a careful reader would notice.
  * 1/2 (≈45-65): Occasional errors (e.g. one subject-verb agreement slip, a missing article, an awkward connector) but the sentence structure is still correct and meaning is clear.
  * 0/2 (≈0-15): Multiple/serious errors that make the sentence structurally broken or hard to understand.

- vocabulary (weight 20%) — PTE "Vocabulary" (0-2 pts):
  * 2/2 (≈80-90): Word choice is appropriate and academic — including vocabulary copied directly from the passage via the copy+connect technique.
  * 1/2 (≈45-65): Occasional inappropriate/awkward word choice, but meaning still clear.
  * 0/2 (≈0-15): Frequent inappropriate or incorrect word choice that obscures meaning.

- structure (weight 15%) — PTE "Form" (0-1 pt): Is it ONE sentence, 5-75 words (ideally 50-75), using connectors/subordination to merge ideas?
  * (≈80-90): Single sentence within the word limit, connectors used to join ideas — score this highly even if grammar/vocabulary elsewhere has issues.
  * (≈0-30): Not a single sentence (apply the proportional penalty above), or badly outside the word limit.

- spelling: Score based ONLY on actual misspelled words present in the response (≈80-90 if zero spelling errors, regardless of other issues; reduce roughly 15-20 points per misspelled word).

- overall: Weighted sum: content*0.40 + grammar*0.25 + vocabulary*0.20 + structure*0.15. Then apply form/word-count penalties if applicable.

CALIBRATION EXAMPLE (apply this same standard): A 50-word single-sentence response that joins 2-3 lines copied/lightly adapted from the passage with simple connectors ("and", "also", "while"), covers the main idea plus a supporting point, has zero spelling errors, and contains exactly one minor grammar slip (e.g. a subject-verb agreement error) should score approximately: content ~85, grammar ~55, vocabulary ~85, structure ~85, spelling ~90, overall ~78. Do NOT score such a response below 50 overall.

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
