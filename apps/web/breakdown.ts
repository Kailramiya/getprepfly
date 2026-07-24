import { PrismaClient } from '@prisma/client';
import { SKILL_CONTRIBUTIONS, SKILL_KEYS } from './src/lib/pte-scoring';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const mockTestId = 'cmrkdboll000126wf359lpmte';

  const mockTest = await prisma.mockTest.findUnique({
    where: { id: mockTestId },
    include: {
      questions: {
        include: {
          question: { select: { id: true, type: true, section: true, title: true, marks: true } }
        },
        orderBy: { order: "asc" }
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

  let md = `# Deep Dive: Mock Test Section Score Calculation\n\n`;
  md += `**Mock Test ID:** \`${mockTestId}\`\n\n`;
  md += `The platform calculates section scores by accumulating **raw points**, not percentages, across all questions. Here is exactly how every single question contributed to the final section scores. If the coaching owner says the section scores are wrong, this document will prove exactly where every point came from mathematically.\n\n`;

  const earned = { speaking: 0, listening: 0, reading: 0, writing: 0 };
  const possible = { speaking: 0, listening: 0, reading: 0, writing: 0 };

  const sections = {
    SPEAKING: [] as string[],
    WRITING: [] as string[],
    READING: [] as string[],
    LISTENING: [] as string[]
  };

  for (const q of mockTest.questions) {
    const a = attemptByQ.get(q.question.id);
    let scoresObj = a?.scores;
    if (typeof scoresObj === 'string') {
      try { scoresObj = JSON.parse(scoresObj); } catch(e){}
    }

    const t = q.question.type;
    const s = scoresObj || {};
    const rawEarned = a ? a.rawPointsEarned : 0;
    const maxPossible = a ? a.maxPointsPossible : (q.question.marks ?? 0);

    let breakdown = `* **${t}** ("${q.question.title}"): `;
    if (!a) {
      breakdown += `*(Skipped)* 0 / ${maxPossible} raw points.\n`;
    } else {
      breakdown += `${rawEarned} / ${maxPossible} raw points. (Attempt Display Score: ${Math.max(10, a.overallScore ?? 10)}/90)\n`;
    }

    const contrib = SKILL_CONTRIBUTIONS[t];
    if (contrib) {
      let routeLog = "";
      if (t === "READ_ALOUD") {
        const rC = s.rawContent || 0; const pR = 5;
        const rS = (s.rawFluency || 0) + (s.rawPronunciation || 0); const pS = 10;
        earned.reading += rC; possible.reading += pR;
        earned.speaking += rS; possible.speaking += pS;
        routeLog = `  - ➔ Reading: +${rC}/${pR} points\n  - ➔ Speaking: +${rS}/${pS} points\n`;
      } else if (t === "REPEAT_SENTENCE") {
        const rL = s.rawContent || 0; const pL = 3;
        const rS = (s.rawFluency || 0) + (s.rawPronunciation || 0); const pS = 10;
        earned.listening += rL; possible.listening += pL;
        earned.speaking += rS; possible.speaking += pS;
        routeLog = `  - ➔ Listening: +${rL}/${pL} points\n  - ➔ Speaking: +${rS}/${pS} points\n`;
      } else if (t === "RETELL_LECTURE" || t === "SUMMARIZE_GROUP_DISCUSSION") {
        const rL = s.rawContent || 0; const pL = 5;
        const rS = (s.rawFluency || 0) + (s.rawPronunciation || 0); const pS = 10;
        earned.listening += rL; possible.listening += pL;
        earned.speaking += rS; possible.speaking += pS;
        routeLog = `  - ➔ Listening: +${rL}/${pL} points\n  - ➔ Speaking: +${rS}/${pS} points\n`;
      } else if (t === "ANSWER_SHORT_QUESTION") {
        const rL = s.rawContent || 0; const pL = 3;
        earned.listening += rL; possible.listening += pL;
        routeLog = `  - ➔ Listening: +${rL}/${pL} points\n`;
      } else if (t === "SUMMARIZE_WRITTEN_TEXT") {
        const rR = s.rawContent || 0; const pR = 2;
        const rW = (s.rawForm || 0) + (s.rawGrammar || 0) + (s.rawVocabulary || 0); const pW = 5;
        earned.reading += rR; possible.reading += pR;
        earned.writing += rW; possible.writing += pW;
        routeLog = `  - ➔ Reading: +${rR}/${pR} points\n  - ➔ Writing: +${rW}/${pW} points\n`;
      } else if (t === "SUMMARIZE_SPOKEN_TEXT") {
        const rL = s.rawContent || 0; const pL = 2;
        const rW = (s.rawForm || 0) + (s.rawGrammar || 0) + (s.rawVocabulary || 0) + (s.rawSpelling || 0); const pW = 8;
        earned.listening += rL; possible.listening += pL;
        earned.writing += rW; possible.writing += pW;
        routeLog = `  - ➔ Listening: +${rL}/${pL} points\n  - ➔ Writing: +${rW}/${pW} points\n`;
      } else {
        for (const skill of SKILL_KEYS) {
          if (contrib[skill] > 0) {
            earned[skill] += rawEarned;
            possible[skill] += maxPossible;
            routeLog += `  - ➔ ${skill.charAt(0).toUpperCase() + skill.slice(1)}: +${rawEarned}/${maxPossible} points\n`;
          }
        }
      }
      breakdown += routeLog;
    }
    
    if (sections[q.question.section as keyof typeof sections]) {
      sections[q.question.section as keyof typeof sections].push(breakdown);
    }
  }

  md += `## Question-by-Question Point Accumulation\n`;
  for (const [sec, items] of Object.entries(sections)) {
    md += `### ${sec} Section Questions\n`;
    md += items.join('\n');
    md += `\n`;
  }

  md += `\n## Final Score Calculation Math\n`;
  md += `The platform uses the official PTE linear scaling formula: \`10 + (Earned / Possible) * 80\`.\n\n`;

  for (const skill of SKILL_KEYS) {
    const fraction = possible[skill] === 0 ? 0 : earned[skill] / possible[skill];
    const finalScore = Math.max(10, Math.min(90, 10 + Math.round(fraction * 80)));
    
    md += `### ${skill.toUpperCase()} Score\n`;
    md += `- **Total Raw Points Earned:** ${earned[skill]}\n`;
    md += `- **Total Raw Points Possible:** ${possible[skill]}\n`;
    md += `- **Percentage:** ${Math.round(fraction * 100)}%\n`;
    md += `- **Math:** 10 + Math.round((${earned[skill]} / ${possible[skill]}) * 80) = **${finalScore}**\n\n`;
  }

  const outPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/9a7abaee-ff4c-4b3d-ae1d-93d80bcbcea1/score_breakdown.md';
  fs.writeFileSync(outPath, md);
  console.log("Done");
}

main().catch(console.error);
