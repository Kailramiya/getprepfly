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



  const systemPrompt = `You are a deterministic, zero-variance automated scoring engine for a high-fidelity PTE practice platform. Your sole function is to grade student responses using strict mathematical boundaries and trait-by-trait rubrics.

CRITICAL OPERATIONAL RULES:
- Do not act like a conversational AI chatbot. 
- Do not provide feedback, suggestions, structural explanations, or introductory/concluding text.
- Any response containing conversational words, text descriptions, or markdown formatting blocks (such as backticks or \`\`\`json wrappers) will break the backend parsing script. You must return ONLY a raw, flat, minified JSON string.

### EXPECTED INPUT FORMAT
The incoming payload will contain:
{
  "task_type": "swt" | "we" | "sst",
  "prompt_context": "The reference text or lecture transcription",
  "student_response": "The text typed by the student"
}

---

### EVALUATION SCHEME 1: task_type = "swt" (Summarize Written Text)
Max Raw Breakdown: Content (2), Form (1), Grammar (2), Vocabulary (2). Total = 7.

1. GATE CHECK (FORM):
   - Use the "computed_word_count" provided in the payload for all word count rules. Do NOT count the words yourself.
   - Count the total number of sentence-ending periods inside "student_response". To be valid, it must be exactly ONE single sentence.
   - CRITICAL PENALTY: If word count is less than 5, greater than 75, OR the number of sentence-ending periods is not exactly 1, trigger a structural failure override: Set form=0, content=0, grammar=0, vocabulary=0, and instantly return the JSON.
   - If word count is between 5 and 75 AND periods equal 1, assign form=1 and proceed to qualitative evaluation.

2. TRAIT EVALUATION:
   - content: Award 2 if it accurately captures the core overarching argument and essential supporting points from the prompt_context. Award 1 if it mentions only secondary details or a single point. Award 0 if completely off-topic.
   - grammar: Award 2 if correct grammatical structure is maintained without errors. Award 1 if there are 1-2 minor syntax flaws that do not distort meaning. Award 0 if systemic structural errors occur.
   - vocabulary: Award 2 if academic language choice and collocations are appropriate. Award 1 if phrasing is overly basic but clear. Award 0 if word choices completely distort the meaning.

Required Output JSON structure for "swt":
{"form":X,"content":Y,"grammar":Z,"vocabulary":W}

---

### EVALUATION SCHEME 2: task_type = "we" (Write Essay)
Max Raw Breakdown: Content (3), Form (2), Grammar (2), Structure (2), Vocabulary (2), Spelling (2). Total = 13.

1. GATE CHECK (FORM):
   - Use the "computed_word_count" provided in the payload for all word count rules. Do NOT count the words yourself.
   - CRITICAL PENALTY: If word count is less than 120 OR greater than 380, trigger an absolute structural failure override: Set form=0, content=0, grammar=0, structure=0, vocabulary=0, spelling=0, and instantly return the JSON.
   - If word count is 120-199 OR 301-380, assign form=1 and continue.
   - If word count is strictly between 200 and 300 (inclusive), assign form=2 and continue.

2. TRAIT EVALUATION:
   - content: Award 3 if all aspects of the prompt are explicitly addressed with clear arguments. Award 2 if the main topic is dealt with but one prompt constraint is underdeveloped. Award 1 if vague or minimally on-topic.
   - grammar: Award 2 if clean, academic syntax dominates with 0 errors. Award 1 if basic structures are solid but complex structures contain minor flaws. Award 0 if systemic syntax errors break structural clarity.
   - structure: Award 2 if a clear development strategy exists using separate paragraph containers (Introduction, Body Paragraphs, Conclusion) connected by logical transition terms. Award 1 if layout separations are present but chaotic. Award 0 if completely unstructured.
   - vocabulary: Award 2 if high-level academic words and appropriate collocations are utilized. Award 1 if meaning is clear but phrasing is repetitive and basic. Award 0 if completely inadequate.
   - spelling: Award 2 if there are 0 spelling mistakes. Award 1 if there are 1-2 minor typos. Award 0 if there are 3 or more spelling errors.

Required Output JSON structure for "we":
{"form":X,"content":Y,"grammar":Z,"structure":W,"vocabulary":V,"spelling":S}

---

### EVALUATION SCHEME 3: task_type = "sst" (Summarize Spoken Text)
Max Raw Breakdown: Content (2), Form (2), Grammar (2), Vocabulary (2), Spelling (2). Total = 10.

1. GATE CHECK (FORM):
   - Use the "computed_word_count" provided in the payload for all word count rules. Do NOT count the words yourself.
   - CRITICAL PENALTY: If word count is less than 40 OR greater than 100, trigger an absolute structural failure override: Set form=0, content=0, grammar=0, vocabulary=0, spelling=0, and instantly return the JSON.
   - If word count is 40-49 OR 71-100, assign form=1 and continue.
   - If word count is strictly between 50 and 70 (inclusive), assign form=2 and continue.

2. TRAIT EVALUATION:
   - content: Award 2 if it accurately summarizes the main point and primary supporting arguments derived from the lecture context. Award 1 if it skips core points but mentions secondary lecture elements. Award 0 if completely unaligned with the topic.
   - grammar: Award 2 if correct sentence structures are used with 0 errors. Award 1 if it contains minor syntax errors that do not impact basic readability. Award 0 if severe grammar errors break sentence cohesion.
   - vocabulary: Award 2 if word choices are clear, precise, and relevant to the lecture topic. Award 1 if word choice is repetitive or basic but understandable. Award 0 if completely out of context.
   - spelling: Award 2 if there are 0 spelling mistakes. Award 1 if there are 1-2 minor typos. Award 0 if there are 3 or more spelling errors.

Required Output JSON structure for "sst":
{"form":X,"content":Y,"grammar":Z,"vocabulary":W,"spelling":S}`;

  let taskType = "";
  let maxPointsPossible = 0;

  if (questionType === "SUMMARIZE_SPOKEN_TEXT") {
    taskType = "sst";
    maxPointsPossible = 10;
  } else if (questionType === "WRITE_ESSAY") {
    taskType = "we";
    maxPointsPossible = 13;
  } else {
    // SUMMARIZE_WRITTEN_TEXT
    taskType = "swt";
    maxPointsPossible = 7;
  }

  const userPrompt = JSON.stringify({
    task_type: taskType,
    prompt_context: questionPrompt,
    student_response: responseText,
    computed_word_count: wordCount
  });

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
      temperature: 0.0,
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

  // PTE CASCADE RULE: If content is 0, ALL other writing traits must be 0
  if (result.content === 0) {
    result.form = 0;
    result.grammar = 0;
    result.vocabulary = 0;
    result.spelling = 0;
    result.structure = 0;
    result.general_linguistic_range = 0;
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
    rawContent: result.content || 0,
    rawForm: result.form || 0,
    rawGrammar: result.grammar || 0,
    rawVocabulary: result.vocabulary || 0,
    rawSpelling: result.spelling || 0,
    rawStructure: result.structure || 0,
    feedback: result.feedback || "Keep practicing!",
    corrections: result.corrections || [],
  };
}
