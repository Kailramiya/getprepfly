import { db } from "./db";

export type PTESection = "SPEAKING" | "WRITING" | "READING" | "LISTENING";

// TRIAL DURATIONS
export const STUDENT_TRIAL_DAYS = 3;
export const CENTRE_TRIAL_DAYS = 7;
// DAILY FREE SPEAKING SCORINGS (after trial, for non-premium users)
export const FREE_DAILY_SPEAKING_SCORINGS = 7;

export interface UserAccess {
  hasAllAccess: boolean;
  modules: Set<PTESection>;
  expiresAt: Record<string, Date>; // per-section expiry
  isTrial: boolean;
  trialEndsAt: Date | null;
  trialExpired: boolean;
  // Speaking module — students can always PRACTICE speaking (recording), but AI scoring is limited
  canPracticeSpeaking: boolean;
  freeSpeakingScoringsUsedToday: number;
  freeSpeakingScoringsRemaining: number;
  reason?: string; // explanation for frontend
}

/**
 * Count today's AI-scored speaking attempts (for daily limit enforcement).
 */
async function getTodaySpeakingScoringCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return db.attempt.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      question: { section: "SPEAKING" },
      scores: { not: undefined }, // has AI scores stored
    },
  });
}

/**
 * Get all active module accesses for a user.
 * Priority: Premium Centre > Active Purchase > Trial > Free (limited)
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const now = new Date();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      role: true,
      centreId: true,
      centre: {
        select: {
          isPremiumCentre: true,
          premiumUntil: true,
          name: true,
          createdAt: true,
        },
      },
    },
  });

  const scoringsUsed = await getTodaySpeakingScoringCount(userId);

  const baseResult: UserAccess = {
    hasAllAccess: false,
    modules: new Set<PTESection>(),
    expiresAt: {},
    isTrial: false,
    trialEndsAt: null,
    trialExpired: false,
    canPracticeSpeaking: true, // speaking practice always allowed
    freeSpeakingScoringsUsedToday: scoringsUsed,
    freeSpeakingScoringsRemaining: Math.max(0, FREE_DAILY_SPEAKING_SCORINGS - scoringsUsed),
  };

  if (!user) return baseResult;

  // ---- Priority 0: Super Admin ----
  // Super admins manage the entire platform — unlimited access, no banners.
  // Centre admins and teachers still need to pay (or be in a Premium Centre).
  if (user.role === "SUPER_ADMIN") {
    baseResult.hasAllAccess = true;
    const farFuture = new Date("2099-12-31");
    baseResult.expiresAt["ALL"] = farFuture;
    ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
      baseResult.modules.add(s as PTESection);
      baseResult.expiresAt[s] = farFuture;
    });
    baseResult.freeSpeakingScoringsRemaining = Infinity;
    baseResult.reason = "Super admin — unlimited access";
    return baseResult;
  }

  // ---- Priority 1: Premium Centre ----
  if (user.centre?.isPremiumCentre) {
    const premiumUntil = user.centre.premiumUntil;
    const stillPremium = !premiumUntil || premiumUntil > now;
    if (stillPremium) {
      baseResult.hasAllAccess = true;
      const expiryDate = premiumUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      baseResult.expiresAt["ALL"] = expiryDate;
      ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
        baseResult.modules.add(s as PTESection);
        baseResult.expiresAt[s] = expiryDate;
      });
      baseResult.freeSpeakingScoringsRemaining = Infinity;
      baseResult.reason = "Premium Centre — unlimited access";
      return baseResult;
    }
  }

  // ---- Priority 2: Active Module Purchases ----
  const accesses = await db.moduleAccess.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: now },
    },
  });

  for (const a of accesses) {
    if (a.section === null) {
      baseResult.hasAllAccess = true;
      baseResult.expiresAt["ALL"] = a.expiresAt;
      ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
        baseResult.modules.add(s as PTESection);
        if (!baseResult.expiresAt[s]) baseResult.expiresAt[s] = a.expiresAt;
      });
    } else {
      baseResult.modules.add(a.section as PTESection);
      baseResult.expiresAt[a.section] = a.expiresAt;
    }
  }

  // If user has ANY purchase, they don't need trial/limited-access logic for those modules
  if (baseResult.hasAllAccess) {
    baseResult.freeSpeakingScoringsRemaining = Infinity;
    baseResult.reason = "Premium user — unlimited access";
    return baseResult;
  }

  // ---- Priority 3: Trial Period ----
  const isCentreAdmin = user.role === "CENTRE_ADMIN";
  const trialDays = isCentreAdmin ? CENTRE_TRIAL_DAYS : STUDENT_TRIAL_DAYS;
  // For centre admins, use centre creation date; for students, user creation date
  const trialStart = isCentreAdmin && user.centre?.createdAt ? user.centre.createdAt : user.createdAt;
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  if (now < trialEnd) {
    // Still in trial — grant full access
    baseResult.isTrial = true;
    baseResult.trialEndsAt = trialEnd;
    baseResult.hasAllAccess = true;
    baseResult.expiresAt["ALL"] = trialEnd;
    ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
      baseResult.modules.add(s as PTESection);
      baseResult.expiresAt[s] = trialEnd;
    });
    baseResult.freeSpeakingScoringsRemaining = Infinity;
    baseResult.reason = `Free trial: ${trialDays} days`;
    return baseResult;
  }

  // ---- Priority 4: Free Tier (post-trial, no purchase) ----
  baseResult.trialExpired = true;
  baseResult.trialEndsAt = trialEnd;
  // Add Speaking to modules but only for practice (no scoring beyond daily limit)
  // Other modules stay locked — only public questions visible
  baseResult.reason = isCentreAdmin
    ? "Centre trial expired — please purchase a plan"
    : "Trial expired — Speaking is free to practice (7 AI scorings/day). Other modules need purchase.";
  return baseResult;
}

/**
 * Check if user has access to a specific module.
 */
export async function hasModuleAccess(userId: string, section: PTESection): Promise<boolean> {
  const access = await getUserAccess(userId);
  return access.hasAllAccess || access.modules.has(section);
}

/**
 * Grant module access after successful payment.
 * Creates or extends existing ModuleAccess by 30 days.
 */
export async function grantModuleAccess(
  userId: string,
  section: PTESection | null, // null = all modules
  paymentId: string,
  days: number = 30
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Check if user already has access — extend instead of duplicate
  const existing = await db.moduleAccess.findFirst({
    where: { userId, section },
  });

  if (existing) {
    // Extend from whichever is later: now or current expiry
    const baseDate = existing.expiresAt > new Date() ? existing.expiresAt : new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + days);

    await db.moduleAccess.update({
      where: { id: existing.id },
      data: {
        expiresAt: newExpiry,
        isActive: true,
        paymentId,
      },
    });
  } else {
    await db.moduleAccess.create({
      data: {
        userId,
        section,
        expiresAt,
        paymentId,
        isActive: true,
      },
    });
  }
}

/**
 * Pricing (in paise — Razorpay uses smallest unit).
 */
export const MODULE_PRICING: Record<string, { amount: number; label: string; section: PTESection | null }> = {
  MODULE_SPEAKING: { amount: 9900, label: "Speaking Module", section: "SPEAKING" },
  MODULE_WRITING: { amount: 9900, label: "Writing Module", section: "WRITING" },
  MODULE_READING: { amount: 9900, label: "Reading Module", section: "READING" },
  MODULE_LISTENING: { amount: 9900, label: "Listening Module", section: "LISTENING" },
  ALL_MODULES: { amount: 29900, label: "All Modules (Best Value)", section: null },
};
