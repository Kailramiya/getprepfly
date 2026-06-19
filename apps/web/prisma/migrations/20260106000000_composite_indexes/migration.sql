-- Add composite indexes for common query patterns

-- Question: (section, type, isActive) — practice page filters active questions by section+type
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Question_section_type_isActive_idx"
    ON "Question"("section", "type", "isActive");

-- Question: (centreId, isActive) — centre admin filters their active questions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Question_centreId_isActive_idx"
    ON "Question"("centreId", "isActive");

-- MockTest: (userId, status) — student's in-progress / completed test lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MockTest_userId_status_idx"
    ON "MockTest"("userId", "status");
