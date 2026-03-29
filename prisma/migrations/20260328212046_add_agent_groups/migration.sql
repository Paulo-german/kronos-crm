-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgentExecutionStepType" ADD VALUE 'ROUTER_CLASSIFICATION';
ALTER TYPE "AgentExecutionStepType" ADD VALUE 'AGENT_TRANSFER';

-- AlterTable
ALTER TABLE "agent_executions" ADD COLUMN     "agent_group_id" TEXT,
ALTER COLUMN "agent_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "active_agent_id" TEXT;

-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN     "agent_group_id" TEXT;

-- CreateTable
CREATE TABLE "agent_groups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "router_model_id" TEXT NOT NULL DEFAULT 'google/gemini-2.0-flash',
    "router_prompt" TEXT,
    "router_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "scope_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_groups_organization_id_is_active_idx" ON "agent_groups"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "agent_group_members_agent_id_idx" ON "agent_group_members"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_group_members_group_id_agent_id_key" ON "agent_group_members"("group_id", "agent_id");

-- CreateIndex
CREATE INDEX "agent_executions_agent_group_id_created_at_idx" ON "agent_executions"("agent_group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inboxes_agent_group_id_idx" ON "inboxes"("agent_group_id");

-- AddForeignKey
ALTER TABLE "agent_groups" ADD CONSTRAINT "agent_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_group_members" ADD CONSTRAINT "agent_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_group_members" ADD CONSTRAINT "agent_group_members_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_agent_group_id_fkey" FOREIGN KEY ("agent_group_id") REFERENCES "agent_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_group_id_fkey" FOREIGN KEY ("agent_group_id") REFERENCES "agent_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
