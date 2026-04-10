-- CreateTable
CREATE TABLE "public"."released_licenses" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "citizenName" TEXT NOT NULL,
    "citizenDocument" TEXT NOT NULL,
    "templateTitle" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "released_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "released_licenses_serviceRequestId_key" ON "public"."released_licenses"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "released_licenses_licenseNumber_key" ON "public"."released_licenses"("licenseNumber");

-- CreateIndex
CREATE INDEX "released_licenses_releasedAt_idx" ON "public"."released_licenses"("releasedAt");

-- CreateIndex
CREATE INDEX "released_licenses_protocol_idx" ON "public"."released_licenses"("protocol");

-- CreateIndex
CREATE INDEX "released_licenses_citizenDocument_idx" ON "public"."released_licenses"("citizenDocument");

-- AddForeignKey
ALTER TABLE "public"."released_licenses" ADD CONSTRAINT "released_licenses_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "public"."ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
