import { db } from "./db";
import { DEFAULT_PRICES } from "./pricing-defaults";
import { istDayStart } from "./utils";

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
  const todayStart = istDayStart();

  return db.attempt.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      overallScore: { not: null }, // AI scoring completed
      question: { section: "SPEAKING" },
    },
  });
}

const ALL_SECTIONS: PTESection[] = ["SPEAKING", "WRITING", "READING", "LISTENING"];

/** Mark every module as unlocked until `until` (seat / premium centre / super admin / trial). */
function grantAll(res: UserAccess, until: Date, reason: string, unlimitedScoring = true) {
  res.hasAllAccess = true;
  res.expiresAt["ALL"] = until;
  for (const s of ALL_SECTIONS) {
    res.modules.add(s);
    res.expiresAt[s] = until;
  }
  if (unlimitedScoring) res.freeSpeakingScoringsRemaining = Infinity;
  res.reason = reason;
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
    db.centreStudentSeat.findMany({ where: { userId } }),
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
    grantAll(baseResult, new Date("2099-12-31"), "Super admin — unlimited access");
    return baseResult;
  }

  // ---- Priority 1: Active Centre Seat (per-student 30-day/monthly access) ----
  if (user.centreId) {
    const seat = seats.find((x) => x.centreId === user.centreId);
    if (seat && seat.status === "ACTIVE" && new Date(seat.endDate) > now) {
      const seatEnd = new Date(seat.endDate);
      grantAll(baseResult, seatEnd, "Centre seat — full access until " + seatEnd.toLocaleDateString());
      return baseResult;
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
      grantAll(baseResult, premiumUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "Premium Centre — unlimited access");
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
    grantAll(baseResult, trialEnd, `Free trial: ${trialDays} days`);
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

/**
 * Fulfil a verified payment exactly once. /verify (browser) and the Razorpay webhook race to
 * do this; the conditional updateMany is the claim, so only the winner grants access and bumps
 * the coupon. If the grant throws, the claim is released so a webhook retry can finish the job
 * instead of leaving a customer who paid with no access.
 */
export async function fulfillPayment(
  paymentId: string,
  who: { userId: string; centreId?: string | null },
  gateway: { razorpayPaymentId?: string | null; razorpaySignature?: string }
): Promise<{ claimed: boolean; planType: string | null }> {
  const claim = await db.payment.updateMany({
    where: { id: paymentId, status: { not: "SUCCESS" } },
    data: { status: "SUCCESS", method: "razorpay", ...gateway },
  });
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (claim.count === 0) return { claimed: false, planType: payment.planType };

  try {
    const key = payment.planType;
    if (isCentrePlanKey(key) && CENTRE_PLANS[key!]) {
      if (!who.centreId) throw new Error("No centre found for this payment");
      await activateCentrePlan(who.centreId, key!, paymentId);
    } else if (key && MODULE_PRICING[key]) {
      const plan = MODULE_PRICING[key];
      await grantModuleAccess(who.userId, plan.section, paymentId, plan.days);
    } else {
      throw new Error("Invalid plan type on payment record");
    }
    if (payment.couponCode) {
      await db.coupon.updateMany({ where: { code: payment.couponCode }, data: { usedCount: { increment: 1 } } });
    }
  } catch (err) {
    await db.payment.update({ where: { id: paymentId }, data: { status: "PENDING" } });
    throw err;
  }
  return { claimed: true, planType: payment.planType };
}
