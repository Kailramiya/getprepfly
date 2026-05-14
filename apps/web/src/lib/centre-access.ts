import { db } from "./db";

/**
 * Grant a 90-day centre seat to a student.
 * Safe to call multiple times — updates expiry if seat already exists.
 */
export async function grantCentreSeat(centreId: string, userId: string): Promise<void> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 90);

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
