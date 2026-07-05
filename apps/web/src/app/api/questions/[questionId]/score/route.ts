import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// Normalize a fill-in-the-blank answer for fair matching
function normAns(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

// POST /api/questions/:questionId/score
// Server-side scoring for all objective question types.
// Returns scoreResult + the revealed answer keys (for client-side display only, post-submit).
export async function POST(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { answer, mockTestId, timeTaken } = body;

  const question = await db.question.findUnique({ where: { id: params.questionId } });
  if (!question || !question.isActive) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }

  const content = (question.content as any) || {};
  const totalMarks = question.marks || 1;
  const type = question.type;

  type Mistake = { position: number; yourAnswer: string; correctAnswer: string };
  interface ScoreResult {
    marksEarned: number;
    marksTotal: number;
    correct: number;
    total: number;
    mistakes: Mistake[];
    message?: string;
  }

  let scoreResult: ScoreResult | null = null;
  // revealedContent is what we send back to the client so it can highlight correct/wrong options
  let revealedContent: Record<string, unknown> = {};

  // ---- MCQ SINGLE (Reading + Listening + Select Missing Word + Highlight Correct Summary) ----
  if (
    type === "READING_MCQ_SINGLE" ||
    type === "LISTENING_MCQ_SINGLE" ||
    type === "SELECT_MISSING_WORD" ||
    type === "HIGHLIGHT_CORRECT_SUMMARY"
  ) {
    const correctIdx: number = content.correctAnswer ?? content.correctAnswers?.[0] ?? -1;
    const isCorrect = answer === correctIdx;
    scoreResult = {
      marksEarned: isCorrect ? totalMarks : 0,
      marksTotal: totalMarks,
      correct: isCorrect ? 1 : 0,
      total: 1,
      mistakes: isCorrect ? [] : [{ position: 1, yourAnswer: content.options?.[answer] ?? "—", correctAnswer: content.options?.[correctIdx] ?? "" }],
    };
    revealedContent = { correctAnswer: correctIdx, options: content.options ?? [] };
  }

  // ---- MCQ MULTIPLE (Reading + Listening) ----
  else if (type === "READING_MCQ_MULTIPLE" || type === "LISTENING_MCQ_MULTIPLE") {
    const correct: number[] = content.correctAnswers || [];
    const selected: number[] = Array.isArray(answer) ? answer : [];
    const correctSet = new Set(correct);
    const selectedSet = new Set<number>(selected);
    const correctCount = selected.filter((i) => correctSet.has(i)).length;
    const wrongSelected = selected.filter((i) => !correctSet.has(i));
    const missed = correct.filter((i) => !selectedSet.has(i));
    
    // Negative marking: +1 for correct selected, -1 for incorrect selected
    const rawScore = Math.max(0, correctCount - wrongSelected.length);
    const maxScore = correct.length;

    scoreResult = {
      marksEarned: rawScore, // raw points
      marksTotal: maxScore,
      correct: correctCount,
      total: maxScore,
      mistakes: [
        ...wrongSelected.map((i) => ({ position: i + 1, yourAnswer: content.options?.[i] ?? "—", correctAnswer: "(Should not have selected this)" })),
        ...missed.map((i) => ({ position: i + 1, yourAnswer: "(Missed)", correctAnswer: content.options?.[i] ?? "" })),
      ],
    };
    revealedContent = { correctAnswers: correct, options: content.options ?? [] };
  }

  // ---- REORDER PARAGRAPHS ----
  else if (type === "REORDER_PARAGRAPHS") {
    const paragraphs: string[] = content.paragraphs || [];
    const correctOrder: number[] = (() => {
      if (question.modelAnswer) {
        const parts = question.modelAnswer
          .split(/[,\s]+/)
          .map((s: string) => parseInt(s.trim(), 10) - 1)
          .filter((n: number) => !isNaN(n));
        if (parts.length === paragraphs.length) return parts;
      }
      return (content.correctOrder as number[]) || paragraphs.map((_: string, i: number) => i);
    })();

    const order: number[] = Array.isArray(answer) ? answer : paragraphs.map((_, i) => i);
    const n = correctOrder.length;
    
    // Adjacent Tuple Matching
    const maxPairs = Math.max(0, n - 1);
    let matchedPairs = 0;
    
    const correctPairs = new Set<string>();
    for (let i = 0; i < n - 1; i++) {
      correctPairs.add(`${correctOrder[i]}-${correctOrder[i+1]}`);
    }
    
    for (let i = 0; i < order.length - 1; i++) {
      if (correctPairs.has(`${order[i]}-${order[i+1]}`)) {
        matchedPairs++;
      }
    }
    
    const mistakes: Mistake[] = [];
    order.forEach((paraIdx, pos) => {
      if (correctOrder[pos] !== paraIdx) {
        mistakes.push({
          position: pos + 1,
          yourAnswer: `Paragraph ${paraIdx + 1} placed at position ${pos + 1}`,
          correctAnswer: `Paragraph ${correctOrder[pos] + 1} should be at position ${pos + 1}`,
        });
      }
    });

    scoreResult = {
      marksEarned: matchedPairs,
      marksTotal: maxPairs,
      correct: matchedPairs,
      total: maxPairs,
      mistakes,
    };
    revealedContent = { correctOrder, paragraphs };
  }

  // ---- HIGHLIGHT INCORRECT WORDS ----
  else if (type === "HIGHLIGHT_INCORRECT_WORDS") {
    const transcript: string = content.transcript || content.text || "";
    const correctIncorrectIndices: number[] = Array.isArray(content.incorrectIndices) ? content.incorrectIndices : [];
    const tokens = transcript.split(/(\s+)/);
    const selected: number[] = Array.isArray(answer) ? answer : [];
    const selectedSet = new Set(selected);
    const correctSet = new Set(correctIncorrectIndices);
    let correctCount = 0;
    const mistakes: Mistake[] = [];
    correctIncorrectIndices.forEach((idx) => {
      if (selectedSet.has(idx)) {
        correctCount++;
      } else {
        mistakes.push({ position: idx, yourAnswer: "(not selected)", correctAnswer: tokens[idx] || "" });
      }
    });
    const falsePositives = selected.filter((i) => !correctSet.has(i));
    falsePositives.forEach((idx) => {
      mistakes.push({ position: idx, yourAnswer: tokens[idx] || "", correctAnswer: "(should not have selected this)" });
    });
    const totalCorrect = correctIncorrectIndices.length || 1;
    const netScore = Math.max(0, correctCount - falsePositives.length);
    scoreResult = {
      marksEarned: Math.round(totalMarks * (netScore / totalCorrect) * 10) / 10,
      marksTotal: totalMarks,
      correct: correctCount,
      total: totalCorrect,
      mistakes,
    };
    revealedContent = { incorrectIndices: correctIncorrectIndices, transcript };
  }

  // ---- WRITE FROM DICTATION ----
  else if (type === "WRITE_FROM_DICTATION") {
    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
    
    const studentWords = normalize(answer || "");
    const correctWords = normalize(content.correctText || "");
    
    let matchedCount = 0;
    const studentPool = [...studentWords]; // mutable pool to prevent double counting
    
    const mistakes: Mistake[] = [];
    
    correctWords.forEach((correctWord, idx) => {
      const poolIndex = studentPool.indexOf(correctWord);
      if (poolIndex !== -1) {
        matchedCount++;
        studentPool.splice(poolIndex, 1); // remove from pool
      } else {
        mistakes.push({ position: idx + 1, yourAnswer: "(missed)", correctAnswer: correctWord });
      }
    });
    
    const m = correctWords.length;
    
    scoreResult = {
      marksEarned: matchedCount,
      marksTotal: m,
      correct: matchedCount,
      total: m,
      mistakes,
      message: `${matchedCount}/${m} words matched`,
    };
    revealedContent = { correctText: content.correctText };
  }

  // ---- LISTENING FILL BLANKS ----
  else if (type === "LISTENING_FILL_BLANKS") {
    const blanks: Array<{ answer: string; options?: string[] }> = content.blanks || [];
    const userAnswers: Array<string | null> = Array.isArray(answer) ? answer : [];
    let correctCount = 0;
    const mistakes: Mistake[] = [];
    blanks.forEach((blank, i) => {
      const ua = normAns(userAnswers[i]);
      const ca = normAns(blank.answer);
      if (ua === ca) {
        correctCount++;
      } else {
        mistakes.push({ position: i + 1, yourAnswer: userAnswers[i] || "(blank)", correctAnswer: blank.answer });
      }
    });
    const total = blanks.length || 1;
    scoreResult = {
      marksEarned: Math.round(totalMarks * (correctCount / total) * 10) / 10,
      marksTotal: totalMarks,
      correct: correctCount,
      total,
      mistakes,
    };
    // Reveal the correct answer per blank for display
    revealedContent = { blanks };
  }

  if (!scoreResult) {
    return NextResponse.json({ success: false, error: "Question type not supported for server scoring" }, { status: 400 });
  }

  // Save attempt (fire-and-forget; don't block the response)
  const overallScore = scoreResult.marksTotal > 0
    ? Math.round((scoreResult.marksEarned / scoreResult.marksTotal) * 90)
    : 0;

  // Save attempt + compute percentile in parallel (non-blocking save)
  const [, percentileResult] = await Promise.all([
    db.attempt.create({
      data: {
        userId: user!.id,
        questionId: params.questionId,
        responseText: typeof answer === "string" ? answer : JSON.stringify(answer),
        scores: {
          correct: scoreResult.correct,
          total: scoreResult.total,
          marksEarned: scoreResult.marksEarned,
          marksTotal: scoreResult.marksTotal,
          mistakes: scoreResult.mistakes,
        },
        rawPointsEarned: scoreResult.marksEarned,
        maxPointsPossible: scoreResult.marksTotal,
        overallScore,
        timeTaken: typeof timeTaken === "number" ? timeTaken : null,
        mockTestId: mockTestId || null,
      },
    }).catch(() => null),
    // Count other users who scored below this attempt on the same question
    db.attempt.findMany({
      where: { questionId: params.questionId, overallScore: { not: null } },
      select: { overallScore: true },
    }).catch(() => [] as Array<{ overallScore: number | null }>),
  ]);

  let percentile: number | null = null;
  const allScores = (percentileResult as Array<{ overallScore: number | null }>)
    .map((a) => a.overallScore)
    .filter((s): s is number => s !== null);
  if (allScores.length >= 5) {
    const below = allScores.filter((s) => s < overallScore).length;
    percentile = Math.round((below / allScores.length) * 100);
  }

  return NextResponse.json({
    success: true,
    data: { scoreResult, revealedContent, modelAnswer: question.modelAnswer, percentile },
  });
}
