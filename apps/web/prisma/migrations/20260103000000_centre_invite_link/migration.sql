-- CreateTable
CREATE TABLE "CentreInviteLink" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentreInviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentreInviteLink_token_key" ON "CentreInviteLink"("token");

-- CreateIndex
CREATE INDEX "CentreInviteLink_centreId_idx" ON "CentreInviteLink"("centreId");

-- CreateIndex
CREATE INDEX "CentreInviteLink_token_idx" ON "CentreInviteLink"("token");

-- AddForeignKey
ALTER TABLE "CentreInviteLink" ADD CONSTRAINT "CentreInviteLink_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
