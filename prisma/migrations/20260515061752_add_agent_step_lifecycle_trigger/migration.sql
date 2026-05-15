-- AlterTable
ALTER TABLE "agent_steps" ADD COLUMN     "lifecycle_deal_pipeline_id" TEXT,
ADD COLUMN     "lifecycle_trigger" "lifecycle_stage";
