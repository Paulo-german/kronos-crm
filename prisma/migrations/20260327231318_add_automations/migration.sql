-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('DEAL_CREATED', 'DEAL_MOVED', 'DEAL_STALE', 'DEAL_IDLE_IN_STAGE', 'ACTIVITY_CREATED', 'DEAL_STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('REASSIGN_DEAL', 'MOVE_DEAL_TO_STAGE', 'MARK_DEAL_LOST', 'NOTIFY_USER', 'UPDATE_DEAL_PRIORITY');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "trigger_type" "AutomationTrigger" NOT NULL,
    "trigger_config" JSONB NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "action_type" "AutomationAction" NOT NULL,
    "action_config" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "last_triggered_at" TIMESTAMP(3),
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "status" "AutomationExecutionStatus" NOT NULL,
    "trigger_payload" JSONB,
    "action_result" JSONB,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automations_organization_id_is_active_trigger_type_idx" ON "automations"("organization_id", "is_active", "trigger_type");

-- CreateIndex
CREATE INDEX "automations_organization_id_created_at_idx" ON "automations"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "automation_executions_automation_id_executed_at_idx" ON "automation_executions"("automation_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "automation_executions_organization_id_executed_at_idx" ON "automation_executions"("organization_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "automation_executions_automation_id_deal_id_executed_at_idx" ON "automation_executions"("automation_id", "deal_id", "executed_at" DESC);

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
