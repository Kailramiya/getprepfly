-- CreateTable
CREATE TABLE IF NOT EXISTS "CentreStudentSeat" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentreStudentSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CentreStudentSeat_centreId_userId_key" ON "CentreStudentSeat"("centreId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CentreStudentSeat_centreId_idx" ON "CentreStudentSeat"("centreId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CentreStudentSeat_userId_idx" ON "CentreStudentSeat"("userId");

-- AddForeignKey (idempotent — skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CentreStudentSeat_centreId_fkey'
  ) THEN
    ALTER TABLE "CentreStudentSeat" ADD CONSTRAINT "CentreStudentSeat_centreId_fkey"
      FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CentreStudentSeat_userId_fkey'
  ) THEN
    ALTER TABLE "CentreStudentSeat" ADD CONSTRAINT "CentreStudentSeat_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
