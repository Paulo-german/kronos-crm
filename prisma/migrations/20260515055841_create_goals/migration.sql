-- CreateEnum
CREATE TYPE "goal_type" AS ENUM ('REVENUE', 'DEALS_CLOSED', 'DEALS_OPENED', 'ACTIVITIES', 'CONVERSATIONS');

-- CreateEnum
CREATE TYPE "goal_scope" AS ENUM ('ORG', 'PIPELINE', 'MEMBER');

-- CreateEnum
CREATE TYPE "goal_period" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "goal_type" NOT NULL,
    "scope" "goal_scope" NOT NULL,
    "period" "goal_period" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "target_user_id" TEXT,
    "target_pipeline_id" TEXT,
    "target_value" DECIMAL(15,2) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_organization_id_type_period_start_period_end_idx" ON "goals"("organization_id", "type", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "goals_organization_id_scope_target_user_id_target_pipeline__idx" ON "goals"("organization_id", "scope", "target_user_id", "target_pipeline_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_target_pipeline_id_fkey" FOREIGN KEY ("target_pipeline_id") REFERENCES "pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
