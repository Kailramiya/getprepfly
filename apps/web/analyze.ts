import { PrismaClient } from '@prisma/client';
import { calculateSkillScores } from './src/lib/pte-scoring';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const mockTestId = 'cmrkdboll000126wf359lpmte';

  const mockTest = await prisma.mockTest.findUnique({
    where: { id: mockTestId },
    include: {
      questions: {
        include: {
          question: {
            select: { id: true, type: true, section: true, marks: true }
          }
        }
      }
    }
  });

  if (!mockTest) return;

  const attempts = await prisma.attempt.findMany({
    where: { mockTestId: mockTestId },
    select: { questionId: true, overallScore: true, rawPointsEarned: true, maxPointsPossible: true, scores: true },
    orderBy: { createdAt: "desc" }
  });

  const attemptByQ = new Map<string, any>();
  for (const a of attempts) {
    if (!attemptByQ.has(a.questionId)) {
      attemptByQ.set(a.questionId, a);
    }
  }

  const scoringInput = (mockTest.questions ?? []).map((q) => {
    const a = attemptByQ.get(q.question.id);
    let scoresObj = a?.scores;
    if (typeof scoresObj === 'string') {
      try { scoresObj = JSON.parse(scoresObj); } catch(e){}
    }
    return {
      overallScore: a ? (a.overallScore ?? 0) : 0,
      rawPointsEarned: a ? a.rawPointsEarned : 0,
      maxPointsPossible: a ? a.maxPointsPossible : (q.question.marks ?? 0),
      scores: scoresObj ?? null,
      questionType: q.question.type,
      questionSection: q.question.section,
    };
  });

  const rawSkill = calculateSkillScores(scoringInput);
  
  const floor = (s: number) => Math.max(s, 10);
  const skillScores = {
    speaking:  floor(rawSkill.speaking),
    writing:   floor(rawSkill.writing),
    reading:   floor(rawSkill.reading),
    listening: floor(rawSkill.listening),
  };

  const SKILL_KEYS_ORDERED = ["speaking", "writing", "reading", "listening"] as const;
  const relevantScores = Object.values(skillScores);
  const overall = Math.round(relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length);

  const analysisResult = {
    storedScores: {
      speaking: mockTest.speakingScore,
      writing: mockTest.writingScore,
      reading: mockTest.readingScore,
      listening: mockTest.listeningScore,
      overall: mockTest.overallScore
    },
    calculatedScores: {
      speaking: skillScores.speaking,
      writing: skillScores.writing,
      reading: skillScores.reading,
      listening: skillScores.listening,
      overall: overall
    },
    discrepancy: false,
    answeredCount: attempts.length,
    totalQuestions: mockTest.questions.length
  };

  analysisResult.discrepancy = (
    analysisResult.storedScores.speaking !== analysisResult.calculatedScores.speaking ||
    analysisResult.storedScores.writing !== analysisResult.calculatedScores.writing ||
    analysisResult.storedScores.reading !== analysisResult.calculatedScores.reading ||
    analysisResult.storedScores.listening !== analysisResult.calculatedScores.listening ||
    analysisResult.storedScores.overall !== analysisResult.calculatedScores.overall
  );

  fs.writeFileSync('score-check2.json', JSON.stringify(analysisResult, null, 2));
  console.log("Score check complete 2. Discrepancy:", analysisResult.discrepancy);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
