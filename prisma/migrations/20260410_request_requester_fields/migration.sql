-- AlterTable
ALTER TABLE "public"."User"
  ADD COLUMN "oabNumber" TEXT;

-- AlterTable
ALTER TABLE "public"."ServiceRequest"
  ADD COLUMN "requesterName" TEXT,
  ADD COLUMN "requesterDocument" TEXT,
  ADD COLUMN "requesterOabNumber" TEXT;

-- Backfill requester data from opener user
UPDATE "public"."ServiceRequest" sr
SET
  "requesterName" = COALESCE(u."name", sr."citizenName"),
  "requesterDocument" = COALESCE(u."passportNumber", sr."citizenDocument")
FROM "public"."User" u
WHERE u."id" = sr."createdById"
  AND (sr."requesterName" IS NULL OR sr."requesterDocument" IS NULL);

-- Fallback backfill when opener is unavailable
UPDATE "public"."ServiceRequest"
SET
  "requesterName" = COALESCE("requesterName", "citizenName"),
  "requesterDocument" = COALESCE("requesterDocument", "citizenDocument")
WHERE "requesterName" IS NULL OR "requesterDocument" IS NULL;

-- Enforce non-null requester identity fields
ALTER TABLE "public"."ServiceRequest"
  ALTER COLUMN "requesterName" SET NOT NULL,
  ALTER COLUMN "requesterDocument" SET NOT NULL;

-- Optional uniqueness for OAB in user profile
CREATE UNIQUE INDEX IF NOT EXISTS "User_oabNumber_key" ON "public"."User"("oabNumber");
