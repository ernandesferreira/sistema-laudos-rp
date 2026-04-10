-- CreateEnum
CREATE TYPE "public"."RequestWorkflowInstanceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING', 'FINAL_APPROVED', 'FINAL_REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RequestWorkflowStepStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."RequestWorkflowStepDecision" AS ENUM ('APTO', 'NAO_APTO', 'PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "public"."RequestStatusChangeSource" AS ENUM ('MANUAL', 'WORKFLOW', 'SYSTEM');

-- AlterTable
ALTER TABLE "public"."ServiceRequest" ADD COLUMN     "citizenId" TEXT;

-- CreateTable
CREATE TABLE "public"."citizens" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CPF',
    "documentNumber" TEXT NOT NULL,
    "documentNumberNormalized" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_workflow_instances" (
    "id" TEXT NOT NULL,
    "status" "public"."RequestWorkflowInstanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepOrder" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "templateWorkflowId" TEXT NOT NULL,

    CONSTRAINT "request_workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_workflow_steps" (
    "id" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "areaKey" TEXT NOT NULL,
    "authorizedRoleKeys" JSONB NOT NULL,
    "requiredPermissions" JSONB NOT NULL,
    "decisionRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresObservation" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isFinalStage" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."RequestWorkflowStepStatus" NOT NULL DEFAULT 'WAITING',
    "decision" "public"."RequestWorkflowStepDecision",
    "observations" TEXT,
    "startedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "templateWorkflowStepId" TEXT,
    "executedByUserId" TEXT,

    CONSTRAINT "request_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_status_history" (
    "id" TEXT NOT NULL,
    "fromStatus" "public"."ServiceRequestStatus",
    "toStatus" "public"."ServiceRequestStatus" NOT NULL,
    "source" "public"."RequestStatusChangeSource" NOT NULL DEFAULT 'SYSTEM',
    "reason" TEXT,
    "metadata" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceRequestId" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "workflowInstanceId" TEXT,
    "workflowStepId" TEXT,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citizens_documentNumberNormalized_key" ON "public"."citizens"("documentNumberNormalized");

-- CreateIndex
CREATE INDEX "citizens_fullName_idx" ON "public"."citizens"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "request_workflow_instances_serviceRequestId_key" ON "public"."request_workflow_instances"("serviceRequestId");

-- CreateIndex
CREATE INDEX "request_workflow_instances_status_createdAt_idx" ON "public"."request_workflow_instances"("status", "createdAt");

-- CreateIndex
CREATE INDEX "request_workflow_instances_templateWorkflowId_idx" ON "public"."request_workflow_instances"("templateWorkflowId");

-- CreateIndex
CREATE INDEX "request_workflow_steps_workflowInstanceId_status_idx" ON "public"."request_workflow_steps"("workflowInstanceId", "status");

-- CreateIndex
CREATE INDEX "request_workflow_steps_executedByUserId_executedAt_idx" ON "public"."request_workflow_steps"("executedByUserId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "request_workflow_steps_workflowInstanceId_stepOrder_key" ON "public"."request_workflow_steps"("workflowInstanceId", "stepOrder");

-- CreateIndex
CREATE INDEX "request_status_history_serviceRequestId_changedAt_idx" ON "public"."request_status_history"("serviceRequestId", "changedAt");

-- CreateIndex
CREATE INDEX "request_status_history_toStatus_changedAt_idx" ON "public"."request_status_history"("toStatus", "changedAt");

-- CreateIndex
CREATE INDEX "request_status_history_changedByUserId_changedAt_idx" ON "public"."request_status_history"("changedByUserId", "changedAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_citizenId_createdAt_idx" ON "public"."ServiceRequest"("citizenId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ServiceRequest" ADD CONSTRAINT "ServiceRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "public"."citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_workflow_instances" ADD CONSTRAINT "request_workflow_instances_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "public"."ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_workflow_instances" ADD CONSTRAINT "request_workflow_instances_templateWorkflowId_fkey" FOREIGN KEY ("templateWorkflowId") REFERENCES "public"."TemplateWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_workflow_steps" ADD CONSTRAINT "request_workflow_steps_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "public"."request_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_workflow_steps" ADD CONSTRAINT "request_workflow_steps_templateWorkflowStepId_fkey" FOREIGN KEY ("templateWorkflowStepId") REFERENCES "public"."TemplateWorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_workflow_steps" ADD CONSTRAINT "request_workflow_steps_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_status_history" ADD CONSTRAINT "request_status_history_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "public"."ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_status_history" ADD CONSTRAINT "request_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_status_history" ADD CONSTRAINT "request_status_history_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "public"."request_workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_status_history" ADD CONSTRAINT "request_status_history_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "public"."request_workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional data backfill (keeps old citizen columns and links requests to citizens)
INSERT INTO "public"."citizens" (
    "id",
    "fullName",
    "documentType",
    "documentNumber",
    "documentNumberNormalized",
    "phone",
    "createdAt",
    "updatedAt"
)
SELECT
    'ctz_' || md5(coalesce(sr."citizenDocument", '') || ':' || coalesce(sr."citizenName", '')),
    coalesce(sr."citizenName", 'Nao informado'),
    'CPF',
    coalesce(sr."citizenDocument", 'SEM_DOCUMENTO'),
    regexp_replace(coalesce(sr."citizenDocument", 'SEM_DOCUMENTO'), '[^0-9A-Za-z]', '', 'g'),
    sr."citizenContact",
    now(),
    now()
FROM "public"."ServiceRequest" sr
WHERE sr."citizenDocument" IS NOT NULL
ON CONFLICT ("documentNumberNormalized") DO NOTHING;

UPDATE "public"."ServiceRequest" sr
SET "citizenId" = c."id"
FROM "public"."citizens" c
WHERE c."documentNumberNormalized" = regexp_replace(coalesce(sr."citizenDocument", 'SEM_DOCUMENTO'), '[^0-9A-Za-z]', '', 'g')
    AND sr."citizenId" IS NULL;
