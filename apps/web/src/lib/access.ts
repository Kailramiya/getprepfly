import { db } from "./db";
import { DEFAULT_PRICES } from "./pricing-defaults";

export type PTESection = "SPEAKING" | "WRITING" | "READING" | "LISTENING";

// TRIAL DURATIONS
export const STUDENT_TRIAL_DAYS = 3;
export const CENTRE_TRIAL_DAYS = 0;
// DAILY FREE SPEAKING SCORINGS (after trial, for non-premium users)
export const FREE_DAILY_SPEAKING_SCORINGS = 3;

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
 * Count today's AI-scored SPEAKING attempts (for daily free-limit enforcement).
 *
 * Must scope to Speaking + actually-scored attempts — counting every attempt
 * (reading/writing/listening/mock) would exhaust the free speaking quota with
 * unrelated practice. question.section is indexed, so the join is cheap.
 */
async function getTodaySpeakingScoringCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return db.attempt.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      overallScore: { not: null }, // AI scoring completed
      question: { section: "SPEAKING" },
    },
  });
}

/**
 * Get all active module accesses for a user.
 * Priority: Premium Centre > Active Purchase > Trial > Free (limited)
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const now = new Date();

  // Independent lookups run together: each sequential DB round trip costs a full network RTT.
  const [user, scoringsUsed, seats, accesses] = await Promise.all([
    db.user.findUnique({
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
    }),
    getTodaySpeakingScoringCount(userId),
    // Table may not be migrated yet — treat as no seats.
    db.centreStudentSeat.findMany({ where: { userId } }).catch(() => []),
    db.moduleAccess.findMany({ where: { userId, isActive: true, expiresAt: { gt: now } } }),
  ]);

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

  // ---- Priority 1: Active Centre Seat (per-student 30-day/monthly access) ----
  if (user.centreId) {
    try {
      const seat = seats.find((x) => x.centreId === user.centreId);
      if (seat && seat.status === "ACTIVE" && new Date(seat.endDate) > now) {
        const seatEnd = new Date(seat.endDate);
        baseResult.hasAllAccess = true;
        baseResult.expiresAt["ALL"] = seatEnd;
        ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
          baseResult.modules.add(s as PTESection);
          baseResult.expiresAt[s] = seatEnd;
        });
        baseResult.freeSpeakingScoringsRemaining = Infinity;
        baseResult.reason = "Centre seat — full access until " + seatEnd.toLocaleDateString();
        return baseResult;
      }
    } catch {
      // Table not yet migrated — fall through to other access checks
    }
  }

  // NOTE: Being merely *linked* to a centre no longer grants free full access.
  // Access for centre students now comes from an active CentreStudentSeat
  // (Priority 1 above) or a Premium Centre (Priority 1c below). This is what
  // enforces the paywall — admins must grant/renew seats or subscribe.

  // ---- Priority 1c: Premium Centre (isPremiumCentre flag) ----
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
    : "Trial expired — Speaking is free to practice (3 AI scorings/day). Other modules need purchase.";
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
 * Can this user view/answer/score this question? Mirrors the visibility rules
 * used by GET /api/questions/:id — centralized so scoring endpoints (which
 * grant paid content like answer keys and AI feedback) enforce the same
 * paywall instead of trusting any authenticated user.
 */
export async function canAccessQuestion(
  user: { id: string; role: string; centreId?: string | null },
  question: { isPublic: boolean; centreId: string | null; section: string }
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "CENTRE_ADMIN" || user.role === "TEACHER") {
    return question.centreId === null || question.centreId === user.centreId;
  }

  if (question.isPublic) return true;
  if (user.centreId && question.centreId === user.centreId) return true;

  const access = await getUserAccess(user.id);
  if (access.hasAllAccess) return true;
  if (question.section === "SPEAKING" && access.canPracticeSpeaking) return true;
  return access.modules.has(question.section as PTESection);
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
 * Plan tables. Prices/labels/seat limits come from DEFAULT_PRICES (the same source the
 * pricing pages read via /api/pricing); only duration and module are derived here, so
 * what a user sees is what Razorpay charges. DB overrides (PricingSetting) are applied
 * by the callers on top of these.
 */
const MODULE_KEY = /^(?:MODULE_(SPEAKING|WRITING|READING|LISTENING)|ALL_MODULES)(?:_(3M|6M|1Y))?$/;
const MODULE_SUFFIX_DAYS: Record<string, number> = { "3M": 90, "6M": 180, "1Y": 365 };

export const MODULE_PRICING: Record<string, { amount: number; label: string; section: PTESection | null; days: number }> = {};
export const CENTRE_PLANS: Record<string, { amount: number; label: string; maxStudents: number; days: number }> = {};

for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
  const m = MODULE_KEY.exec(key);
  if (m) {
    MODULE_PRICING[key] = {
      amount: def.amount,
      label: def.label,
      section: (m[1] as PTESection | undefined) ?? null,
      days: m[2] ? MODULE_SUFFIX_DAYS[m[2]] : 30,
    };
  } else if (def.maxStudents !== undefined) {
    CENTRE_PLANS[key] = {
      amount: def.amount,
      label: def.label,
      maxStudents: def.maxStudents,
      days: key.startsWith("ANNUAL_") ? 365 : key === "CENTRE_MINI" || key === "CENTRE_SMALL" ? 30 : 180,
    };
  }
}

export function isCentrePlanKey(planType: string | null | undefined): boolean {
  return !!planType && (planType.startsWith("CENTRE_") || planType.startsWith("ANNUAL_"));
}

/**
 * Activate or extend centre premium access after successful payment.
 */
export async function activateCentrePlan(
  centreId: string,
  planKey: string,
  paymentId: string,
): Promise<void> {
  const plan = CENTRE_PLANS[planKey];
  if (!plan) throw new Error("Invalid centre plan");

  const now = new Date();

  // Check for super-admin overrides (price + maxStudents)
  const [centre, dbSetting] = await Promise.all([
    db.centre.findUnique({ where: { id: centreId }, select: { premiumUntil: true } }),
    db.pricingSetting.findUnique({ where: { key: planKey } }),
  ]);

  const maxStudents = dbSetting?.maxStudents != null ? dbSetting.maxStudents : plan.maxStudents;
  const amount = dbSetting?.amount != null ? dbSetting.amount : plan.amount;

  const base = centre?.premiumUntil && centre.premiumUntil > now ? centre.premiumUntil : now;
  const newPremiumUntil = new Date(base);
  newPremiumUntil.setDate(newPremiumUntil.getDate() + plan.days);

  await db.$transaction([
    // Update centre premium status
    db.centre.update({
      where: { id: centreId },
      data: { isPremiumCentre: true, premiumUntil: newPremiumUntil },
    }),
    // Create subscription record (-1 stored as-is for unlimited plans)
    db.centreSubscription.create({
      data: {
        centreId,
        planName: plan.label,
        maxStudents,
        monthlyPrice: amount,
        status: "ACTIVE",
        startDate: now,
        endDate: newPremiumUntil,
        payments: { connect: { id: paymentId } },
      },
    }),
  ]);
}
