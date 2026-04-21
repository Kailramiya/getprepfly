import { db } from "./db";

export type PTESection = "SPEAKING" | "WRITING" | "READING" | "LISTENING";

export interface UserAccess {
  hasAllAccess: boolean;
  modules: Set<PTESection>;
  expiresAt: Record<string, Date>; // per-section expiry
}

/**
 * Get all active module accesses for a user.
 * Returns which modules they have access to and when each expires.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const now = new Date();
  const accesses = await db.moduleAccess.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: now },
    },
  });

  const result: UserAccess = {
    hasAllAccess: false,
    modules: new Set<PTESection>(),
    expiresAt: {},
  };

  for (const a of accesses) {
    if (a.section === null) {
      result.hasAllAccess = true;
      result.expiresAt["ALL"] = a.expiresAt;
      // also add all individual modules for convenience
      ["SPEAKING", "WRITING", "READING", "LISTENING"].forEach((s) => {
        result.modules.add(s as PTESection);
        if (!result.expiresAt[s]) result.expiresAt[s] = a.expiresAt;
      });
    } else {
      result.modules.add(a.section as PTESection);
      result.expiresAt[a.section] = a.expiresAt;
    }
  }

  return result;
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
 * Creates or extends existing ModuleAccess by 90 days.
 */
export async function grantModuleAccess(
  userId: string,
  section: PTESection | null, // null = all modules
  paymentId: string,
  days: number = 90
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
