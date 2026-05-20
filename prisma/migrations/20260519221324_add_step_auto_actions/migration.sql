-- AlterTable
ALTER TABLE "agent_steps" ADD COLUMN     "auto_deal_stage_id" TEXT,
ADD COLUMN     "auto_tasks" JSONB;
