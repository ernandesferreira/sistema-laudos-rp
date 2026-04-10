ALTER TABLE "public"."ServiceRequest"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inactivatedAt" TIMESTAMP(3),
ADD COLUMN "inactivatedByUserId" TEXT,
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByUserId" TEXT;

CREATE INDEX "ServiceRequest_isActive_isDeleted_createdAt_idx"
ON "public"."ServiceRequest"("isActive", "isDeleted", "createdAt");
