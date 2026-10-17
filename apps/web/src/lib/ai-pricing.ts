import { db } from "@/lib/db";

// ponytail: fixed USD→INR rate, not live-fetched — the super-admin cost
// dashboard will drift a few percent from the actual billed amount as the
// real rate moves. Upgrade path: pull from an FX API if exact billing
// reconciliation is ever needed.
const USD_TO_INR = 87;

// USD list pricing per OpenAI's published rates for the models this app calls.
// Upgrade path: move to env vars if pricing changes often enough to be painful.
const PRICING = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 }, // USD per 1M tokens
  "whisper-1": { perMinute: 0.006 }, // USD per minute of audio
  "tts-1": { per1MChars: 15 }, // USD per 1M characters
} as const;

type UsageInput =
  | { model: "gpt-4o-mini"; promptTokens: number; completionTokens: number }
  | { model: "whisper-1"; audioSeconds: number }
  | { model: "tts-1"; characters: number };

function costUsd(usage: UsageInput): number {
  switch (usage.model) {
    case "gpt-4o-mini": {
      const p = PRICING["gpt-4o-mini"];
      return (usage.promptTokens / 1_000_000) * p.inputPer1M + (usage.completionTokens / 1_000_000) * p.outputPer1M;
    }
    case "whisper-1":
      return (usage.audioSeconds / 60) * PRICING["whisper-1"].perMinute;
    case "tts-1":
      return (usage.characters / 1_000_000) * PRICING["tts-1"].per1MChars;
  }
}

/**
 * Logs one billed OpenAI call for the super-admin usage/cost dashboard.
 * Never throws — a logging failure must not break scoring or TTS generation.
 */
export async function recordAiUsage(
  userId: string,
  endpoint: "score-writing" | "score-speaking" | "tts",
  usage: UsageInput
): Promise<void> {
  try {
    const usd = costUsd(usage);
    await db.aiUsageLog.create({
      data: {
        userId,
        endpoint,
        model: usage.model,
        promptTokens: "promptTokens" in usage ? usage.promptTokens : 0,
        completionTokens: "completionTokens" in usage ? usage.completionTokens : 0,
        units: "audioSeconds" in usage ? usage.audioSeconds : "characters" in usage ? usage.characters : 0,
        costInrPaise: Math.round(usd * USD_TO_INR * 100),
      },
    });
  } catch (err) {
    console.error("Failed to record AI usage:", err);
  }
}
