import { db } from "./db";

/**
 * Grant a 30-day (1 month) centre seat to a student.
 * Safe to call multiple times — updates expiry if seat already exists.
 * Centre admins must manually renew this each month.
 */
export async function grantCentreSeat(centreId: string, userId: string): Promise<void> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await db.centreStudentSeat.upsert({
    where: { centreId_userId: { centreId, userId } },
    create: { centreId, userId, endDate, status: "ACTIVE" },
    update: { endDate, status: "ACTIVE", startDate: new Date() },
  });
}

/**
 * Count active seats in use for a centre (for limit enforcement).
 */
export async function getCentreActiveSeats(centreId: string): Promise<number> {
  return db.centreStudentSeat.count({
    where: { centreId, status: "ACTIVE", endDate: { gt: new Date() } },
  });
}
