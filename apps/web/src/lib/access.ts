import { db } from "./db";

export type PTESection = "SPEAKING" | "WRITING" | "READING" | "LISTENING";

// TRIAL DURATIONS
export const STUDENT_TRIAL_DAYS = 0;
export const CENTRE_TRIAL_DAYS = 0;
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

  // Run both queries in parallel — saves ~50-100ms per request
  const [user, scoringsUsed] = await Promise.all([
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
      const seat = await db.centreStudentSeat.findUnique({
        where: { centreId_userId: { centreId: user.centreId, userId } },
      });
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
 * Student module pricing (in paise — Razorpay uses smallest unit).
 * Each entry now carries a `days` field so verify/webhook pass the right duration.
 */
export const MODULE_PRICING: Record<string, { amount: number; label: string; section: PTESection | null; days: number }> = {
  // 1 month (30 days)
  MODULE_SPEAKING:    { amount: 19900,  label: "Speaking Module (1 Month)",   section: "SPEAKING",  days: 30 },
  MODULE_WRITING:     { amount: 19900,  label: "Writing Module (1 Month)",    section: "WRITING",   days: 30 },
  MODULE_READING:     { amount: 19900,  label: "Reading Module (1 Month)",    section: "READING",   days: 30 },
  MODULE_LISTENING:   { amount: 19900,  label: "Listening Module (1 Month)",  section: "LISTENING", days: 30 },
  ALL_MODULES:        { amount: 59900,  label: "All Modules (1 Month)",       section: null,        days: 30 },
  // 6 months (180 days)
  MODULE_SPEAKING_6M: { amount: 99900,  label: "Speaking Module (6 Months)",  section: "SPEAKING",  days: 180 },
  MODULE_WRITING_6M:  { amount: 99900,  label: "Writing Module (6 Months)",   section: "WRITING",   days: 180 },
  MODULE_READING_6M:  { amount: 99900,  label: "Reading Module (6 Months)",   section: "READING",   days: 180 },
  MODULE_LISTENING_6M:{ amount: 99900,  label: "Listening Module (6 Months)", section: "LISTENING", days: 180 },
  ALL_MODULES_6M:     { amount: 299900, label: "All Modules (6 Months)",      section: null,        days: 180 },
  // 1 year (365 days)
  MODULE_SPEAKING_1Y: { amount: 179900, label: "Speaking Module (1 Year)",    section: "SPEAKING",  days: 365 },
  MODULE_WRITING_1Y:  { amount: 179900, label: "Writing Module (1 Year)",     section: "WRITING",   days: 365 },
  MODULE_READING_1Y:  { amount: 179900, label: "Reading Module (1 Year)",     section: "READING",   days: 365 },
  MODULE_LISTENING_1Y:{ amount: 179900, label: "Listening Module (1 Year)",   section: "LISTENING", days: 365 },
  ALL_MODULES_1Y:     { amount: 499900, label: "All Modules (1 Year)",        section: null,        days: 365 },
};

/**
 * Coaching centre subscription plans (in paise).
 * Purchasing any plan sets isPremiumCentre=true and premiumUntil=+30 days,
 * giving all students in the centre full access automatically.
 */
export const CENTRE_PLANS: Record<string, {
  amount: number;        // paise
  label: string;
  maxStudents: number;
  days: number;          // subscription duration
  features: string[];
}> = {
  // Monthly plans (30 days)
  CENTRE_MINI: {
    amount: 119900,       // ₹1,199 / month
    label: "Mini Plan",
    maxStudents: 5,
    days: 30,
    features: [
      "Up to 5 students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Student progress tracking",
      "Batch management",
      "30 days access",
    ],
  },
  CENTRE_SMALL: {
    amount: 299900,       // ₹2,999 / month
    label: "Small Plan",
    maxStudents: 20,
    days: 30,
    features: [
      "Up to 20 students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Student progress tracking",
      "Batch management",
      "30 days access",
    ],
  },
  CENTRE_STARTER: {
    amount: 299900,       // ₹2,999 / 6 months
    label: "Starter Plan",
    maxStudents: 50,
    days: 180,
    features: [
      "Up to 50 students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Student progress tracking",
      "Batch management",
      "6 months access",
    ],
  },
  CENTRE_GROWTH: {
    amount: 699900,       // ₹6,999 / 6 months
    label: "Growth Plan",
    maxStudents: 150,
    days: 180,
    features: [
      "Up to 150 students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Advanced analytics dashboard",
      "Batch management + leaderboard",
      "Priority support",
      "6 months access",
    ],
  },
  CENTRE_PRO: {
    amount: 1499900,      // ₹14,999 / 6 months
    label: "Pro Plan",
    maxStudents: 500,
    days: 180,
    features: [
      "Up to 500 students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Full analytics + centre branding",
      "Unlimited batches",
      "Dedicated support",
      "6 months access",
    ],
  },
  // Annual institute plans
  ANNUAL_STARTER: {
    amount: 1199900,      // ₹11,999/year
    label: "Annual Starter Plan",
    maxStudents: 65,      // 50 base + 15 bonus
    days: 365,
    features: [
      "50 Students + 15 Bonus (65 total)",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Student progress tracking",
      "Batch management",
      "1 year access",
    ],
  },
  ANNUAL_GROWTH: {
    amount: 2999900,      // ₹29,999/year
    label: "Annual Growth Plan",
    maxStudents: 180,     // 150 base + 30 bonus
    days: 365,
    features: [
      "150 Students + 30 Bonus (180 total)",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Advanced analytics dashboard",
      "Batch management + leaderboard",
      "Priority support",
      "1 year access",
    ],
  },
  ANNUAL_UNLIMITED: {
    amount: 7999900,      // ₹79,999/year
    label: "Annual Unlimited Plan",
    maxStudents: -1,      // -1 = unlimited
    days: 365,
    features: [
      "Unlimited students",
      "All 4 modules unlocked for all students",
      "AI scoring for all question types",
      "Full analytics + centre branding",
      "Unlimited batches",
      "Dedicated support",
      "1 year access",
    ],
  },
};

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
