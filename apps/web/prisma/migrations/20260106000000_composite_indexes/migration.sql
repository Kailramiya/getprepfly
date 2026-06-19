-- Add composite indexes for common query patterns
-- Note: CONCURRENTLY removed — cannot run inside a transaction (prisma migrate deploy wraps each migration)

CREATE INDEX IF NOT EXISTS "Question_section_type_isActive_idx"
    ON "Question"("section", "type", "isActive");

CREATE INDEX IF NOT EXISTS "Question_centreId_isActive_idx"
    ON "Question"("centreId", "isActive");

CREATE INDEX IF NOT EXISTS "MockTest_userId_status_idx"
    ON "MockTest"("userId", "status");
