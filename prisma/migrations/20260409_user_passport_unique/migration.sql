ALTER TABLE "public"."User"
ADD COLUMN "passportNumber" TEXT;

UPDATE "public"."User"
SET "passportNumber" = 'PASS-' || substring(replace("id", '-', '') from 1 for 20)
WHERE "passportNumber" IS NULL;

ALTER TABLE "public"."User"
ALTER COLUMN "passportNumber" SET NOT NULL;

DROP INDEX IF EXISTS "public"."User_email_key";

CREATE UNIQUE INDEX "User_passportNumber_key" ON "public"."User"("passportNumber");
