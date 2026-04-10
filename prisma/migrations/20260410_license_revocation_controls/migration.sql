-- CreateEnum
CREATE TYPE "public"."ReleasedLicenseStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."LicenseRevocationType" AS ENUM ('DAYS', 'MONTHS', 'YEARS', 'PERMANENT');

-- AlterTable
ALTER TABLE "public"."released_licenses"
  ADD COLUMN "licenseStatus" "public"."ReleasedLicenseStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revocationReason" TEXT,
  ADD COLUMN "revocationType" "public"."LicenseRevocationType",
  ADD COLUMN "revocationValue" INTEGER,
  ADD COLUMN "revocationEndsAt" TIMESTAMP(3),
  ADD COLUMN "revokedByUserId" TEXT;

-- CreateTable
CREATE TABLE "public"."document_restrictions" (
  "id" TEXT NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "documentNumberNormalized" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "releasedLicenseId" TEXT NOT NULL,
  "restrictionType" "public"."LicenseRevocationType" NOT NULL,
  "restrictionValue" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "isPermanent" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "document_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "released_licenses_licenseStatus_revokedAt_idx" ON "public"."released_licenses"("licenseStatus", "revokedAt");

-- CreateIndex
CREATE INDEX "released_licenses_revocationEndsAt_idx" ON "public"."released_licenses"("revocationEndsAt");

-- CreateIndex
CREATE INDEX "document_restrictions_documentNumberNormalized_startsAt_idx" ON "public"."document_restrictions"("documentNumberNormalized", "startsAt");

-- CreateIndex
CREATE INDEX "document_restrictions_endsAt_idx" ON "public"."document_restrictions"("endsAt");

-- CreateIndex
CREATE INDEX "document_restrictions_isPermanent_idx" ON "public"."document_restrictions"("isPermanent");

-- CreateIndex
CREATE INDEX "document_restrictions_releasedLicenseId_idx" ON "public"."document_restrictions"("releasedLicenseId");

-- CreateIndex
CREATE INDEX "document_restrictions_serviceRequestId_idx" ON "public"."document_restrictions"("serviceRequestId");

-- AddForeignKey
ALTER TABLE "public"."released_licenses"
  ADD CONSTRAINT "released_licenses_revokedByUserId_fkey"
  FOREIGN KEY ("revokedByUserId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_restrictions"
  ADD CONSTRAINT "document_restrictions_serviceRequestId_fkey"
  FOREIGN KEY ("serviceRequestId") REFERENCES "public"."ServiceRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_restrictions"
  ADD CONSTRAINT "document_restrictions_releasedLicenseId_fkey"
  FOREIGN KEY ("releasedLicenseId") REFERENCES "public"."released_licenses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_restrictions"
  ADD CONSTRAINT "document_restrictions_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
