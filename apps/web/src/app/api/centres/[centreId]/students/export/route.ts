import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/centres/[centreId]/students/export — download all students as CSV
export async function GET(
  _req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  if (user!.role !== "SUPER_ADMIN" && user!.centreId !== params.centreId) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }

  const students = await db.user.findMany({
    where: { centreId: params.centreId, role: "STUDENT" },
    select: {
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { attempts: true, mockTests: true } },
      batchMemberships: { include: { batch: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch seat info
  const seatMap: Record<string, { status: string; endDate: Date } | null> = {};
  const allEmails = students.map(s => s.email);
  const allUsers = await db.user.findMany({
    where: { email: { in: allEmails }, centreId: params.centreId },
    select: { id: true, email: true },
  });
  const idToEmail: Record<string, string> = {};
  allUsers.forEach(u => { idToEmail[u.id] = u.email; });
  const seats = await db.centreStudentSeat.findMany({
    where: { centreId: params.centreId },
    select: { userId: true, status: true, endDate: true },
  });
  seats.forEach(s => {
    const email = idToEmail[s.userId];
    if (email) seatMap[email] = { status: s.status, endDate: s.endDate };
  });

  // Build CSV
  const header = ["Name", "Email", "Phone", "Access Status", "Access Expires", "Batches", "Attempts", "Mock Tests", "Joined"].join(",");
  const rows = students.map(s => {
    const seat = seatMap[s.email];
    const seatStatus = seat
      ? (seat.status === "CANCELLED" ? "Cancelled" : new Date(seat.endDate) < new Date() ? "Expired" : "Active")
      : "No Seat";
    const expiry = seat && seat.status === "ACTIVE" && new Date(seat.endDate) >= new Date()
      ? new Date(seat.endDate).toLocaleDateString("en-IN")
      : "";
    const batches = s.batchMemberships.map(m => m.batch.name).join("; ");

    return [
      `"${s.name.replace(/"/g, '""')}"`,
      s.email,
      s.phone || "",
      seatStatus,
      expiry,
      `"${batches.replace(/"/g, '""')}"`,
      s._count.attempts,
      s._count.mockTests,
      new Date(s.createdAt).toLocaleDateString("en-IN"),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="students-${params.centreId}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
