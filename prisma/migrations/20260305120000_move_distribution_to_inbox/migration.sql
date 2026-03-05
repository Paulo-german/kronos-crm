-- AlterTable: Add lead capture fields to inboxes
ALTER TABLE "inboxes" ADD COLUMN "auto_create_deal" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "inboxes" ADD COLUMN "pipeline_id" UUID;
ALTER TABLE "inboxes" ADD COLUMN "distribution_user_ids" UUID[] DEFAULT ARRAY[]::UUID[];

-- Migrate data: Copy distributionUserIds from agents to their linked inboxes
UPDATE "inboxes"
SET "distribution_user_ids" = "agents"."distribution_user_ids"
FROM "agents"
WHERE "inboxes"."agent_id" = "agents"."id"
  AND array_length("agents"."distribution_user_ids", 1) > 0;

-- Migrate data: Copy first pipelineId from agents to their linked inboxes
UPDATE "inboxes"
SET "pipeline_id" = ("agents"."pipeline_ids")[1]
FROM "agents"
WHERE "inboxes"."agent_id" = "agents"."id"
  AND array_length("agents"."pipeline_ids", 1) > 0;

-- AlterTable: Remove distributionUserIds from agents
ALTER TABLE "agents" DROP COLUMN "distribution_user_ids";
