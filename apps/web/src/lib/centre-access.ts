import { Prisma } from "@prisma/client";
import { db } from "./db";

type DbClient = typeof db | Prisma.TransactionClient;

/**
 * Grant a 30-day (1 month) centre seat to a student.
 * Safe to call multiple times — updates expiry if seat already exists.
 * Centre admins must manually renew this each month.
 */
export async function grantCentreSeat(centreId: string, userId: string, client: DbClient = db): Promise<void> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await client.centreStudentSeat.upsert({
    where: { centreId_userId: { centreId, userId } },
    create: { centreId, userId, endDate, status: "ACTIVE" },
    update: { endDate, status: "ACTIVE", startDate: new Date() },
  });
}

/**
 * Count active seats in use for a centre (for limit enforcement).
 */
export async function getCentreActiveSeats(centreId: string, client: DbClient = db): Promise<number> {
  return client.centreStudentSeat.count({
    where: { centreId, status: "ACTIVE", endDate: { gt: new Date() } },
  });
}

/**
 * Runs `fn` inside a transaction holding a Postgres advisory lock scoped to
 * this centre, so concurrent seat-granting requests for the same centre
 * (invite, import, bulk-renew, renew) can't interleave between "how many
 * seats are free" and the write that consumes them — the TOCTOU race that
 * let two simultaneous requests both pass the limit check and both
 * succeed, exceeding maxStudents. All seat reads/writes inside `fn` must
 * use the transaction client it's given, not the top-level `db`.
 */
export async function withCentreSeatLock<T>(
  centreId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${centreId}))`;
    return fn(tx);
  });
}
