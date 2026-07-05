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



  let systemPrompt: string;
  let userPrompt: string;
  let maxPointsPossible = 0;

  if (questionType === "SUMMARIZE_SPOKEN_TEXT") {
    maxPointsPossible = 10;
    systemPrompt = `You are a deterministic, automated scoring engine for a PTE practice platform. Your purpose is to evaluate user responses strictly against specific mathematical constraints and official rubrics. Do not act as a standard conversational chatbot. Do not provide stylistic feedback, encouragement, or preambles. Your entire output must consist exclusively of a single, raw, minified JSON block containing specified keys mapping to clean integers.`;
    userPrompt = `
### TASK SELECTION CONFIGURATION
task_type: "sst"

### RULESET
The official maximum points are: Content (2), Form (2), Grammar (2), Vocabulary (2), Spelling (2).
Evaluate based on PTE raw traits (Single-digit integers):
- content: 2 if captures the central argument and key supporting points accurately. 1 if covers partial main point. 0 if misses main topic entirely.
- form: 2 if 50-70 words, 1 if 40-49 or 71-100, 0 otherwise
- grammar: 2 if correct grammatical structure is fully maintained. 1 if there are 1-2 minor syntax flaws. 0 if systemic structural errors occur.
- vocabulary: 2 if academic language choice is precise. 1 if word choice is overly basic but clear. 0 if inappropriate phrasing distorts meaning.
- spelling: 2 if 0 spelling mistakes. 1 if 1-2 minor typos. 0 if 3 or more spelling errors.

Audio topic: "${questionPrompt}"
Student's summary (${wordCount} words):
"${responseText}"

Required Output Format for "sst":
{"form": X, "content": Y, "grammar": Z, "vocabulary": W, "spelling": V}
`;
  } else if (questionType === "WRITE_ESSAY") {
    maxPointsPossible = 13;
    systemPrompt = `You are a deterministic, automated scoring engine for a PTE practice platform. Your purpose is to evaluate user responses strictly against specific mathematical constraints and official rubrics. Do not act as a standard conversational chatbot. Do not provide stylistic feedback, encouragement, or preambles. Your entire output must consist exclusively of a single, raw, minified JSON block containing specified keys mapping to clean integers.`;
    userPrompt = `
### TASK SELECTION CONFIGURATION
task_type: "we"

### RULESET 2: TASK_TYPE = "we" (Write Essay)
The official maximum points are: Content (3), Form (2), Grammar (2), Structure/Cohesion (2), Vocabulary (2), Spelling (2).

1. STEP 1 - HARD LENGTH GATE CHECK (FORM):
   - Track total words in the student response.
   - If word count < 120 OR word count > 380, trigger an absolute structural failure override: Set form = 0, content = 0, grammar = 0, structure = 0, vocabulary = 0, spelling = 0, and immediately output the JSON.
   - If word count is between 120-199 OR between 301-380, set form = 1 and continue.
   - If word count is strictly between 200 and 300 (inclusive), set form = 2 and continue.

2. STEP 2 - QUALITATIVE EVALUATION (Only if Form > 0):
   - content: Award 3 if all aspects of the prompt are explicitly addressed with deep development. Award 2 if the main topic is dealt with but one prompt parameter is thin. Award 1 if it is vague/minimally on-topic.
   - grammar: Award 2 if clean, correct syntax dominates with no errors. Award 1 if basic structures are solid but complex structures contain flaws. Award 0 if systemic errors break clarity.
   - structure: Award 2 if clear paragraph structures exist (Introduction, Body Paragraphs, Conclusion) connected by appropriate logical transition terms. Award 1 if paragraph separation is chaotic. Award 0 if unstructured.
   - vocabulary: Award 2 if academic words/collocations are utilized. Award 1 if meaning is clear but phrasing is repetitive. Award 0 if completely inadequate.
   - spelling: Award 2 if there are 0 spelling mistakes. Award 1 if there are 1-2 minor typos. Award 0 if there are 3 or more spelling errors.

Prompt: "${questionPrompt}"
Student's essay (${wordCount} words):
"${responseText}"

Required Output Format for "we":
{"form": X, "content": Y, "grammar": Z, "structure": W, "vocabulary": V, "spelling": S}
`;
  } else {
    // SUMMARIZE_WRITTEN_TEXT
    maxPointsPossible = 7;
    systemPrompt = `You are a deterministic, automated scoring engine for a PTE practice platform. Your purpose is to evaluate user responses strictly against specific mathematical constraints and official rubrics. Do not act as a standard conversational chatbot. Do not provide stylistic feedback, encouragement, or preambles. Your entire output must consist exclusively of a single, raw, minified JSON block containing specified keys mapping to clean integers.`;
    userPrompt = `
### TASK SELECTION CONFIGURATION
task_type: "swt"

### RULESET 1: TASK_TYPE = "swt" (Summarize Written Text)
The official maximum points are: Content (2), Form (1), Grammar (2), Vocabulary (2).

1. STEP 1 - HARD FORMAT GATE CHECK (FORM):
   - Track total words in the student response.
   - Count the total number of terminal periods inside the response. The text must be EXACTLY ONE single sentence ending with a single terminal period.
   - If word count < 5 OR word count > 75, or terminal periods != 1, you MUST trigger a structural failure override: Set form = 0, content = 0, grammar = 0, vocabulary = 0, and immediately output the JSON.
   - If word count is between 5 and 75 AND terminal periods == 1, set form = 1 and proceed to qualitative evaluation.

2. STEP 2 - QUALITATIVE EVALUATION (Only if Form = 1):
   - content: Award 2 if it captures the central argument and key supporting points accurately. Award 1 if it only covers a partial main point. Award 0 if it misses the main topic entirely.
   - grammar: Award 2 if correct grammatical structure is fully maintained. Award 1 if there are 1-2 minor syntax flaws. Award 0 if systemic structural errors occur.
   - vocabulary: Award 2 if academic language choice is precise. Award 1 if word choice is overly basic but clear. Award 0 if inappropriate phrasing distorts meaning.

ORIGINAL PASSAGE:
"""
${questionPrompt}
"""

STUDENT'S SUMMARY (${wordCount} words):
"${responseText}"

Required Output Format for "swt":
{"form": X, "content": Y, "grammar": Z, "vocabulary": W}
`;
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
